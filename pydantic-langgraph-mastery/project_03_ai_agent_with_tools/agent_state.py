"""
Project 3: AI Agent with Tools - Agent State Management
=====================================================

Learning objectives:
- Design agent state for tool-calling workflows
- Manage conversation context and history
- Handle tool results and error recovery
- Implement streaming and real-time updates
"""

from typing import Dict, Any, List, Optional, Union, Literal
from typing_extensions import TypedDict, Annotated
from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage


class AgentRole(str, Enum):
    """Different agent roles/personas"""
    ASSISTANT = "assistant"
    RESEARCHER = "researcher"
    ANALYST = "analyst"
    WRITER = "writer"
    CODER = "coder"
    SUPPORT = "support"


class AgentCapability(str, Enum):
    """Agent capabilities"""
    WEB_SEARCH = "web_search"
    CODE_EXECUTION = "code_execution"
    FILE_OPERATIONS = "file_operations"
    DATA_ANALYSIS = "data_analysis"
    EMAIL_SENDING = "email_sending"
    DATABASE_QUERY = "database_query"
    IMAGE_GENERATION = "image_generation"
    TEXT_TRANSLATION = "text_translation"


class ConversationMode(str, Enum):
    """Different conversation modes"""
    CHAT = "chat"
    TASK_ORIENTED = "task_oriented"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    CODING = "coding"
    CREATIVE = "creative"


class ToolExecutionStatus(str, Enum):
    """Status of tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class ToolCall(BaseModel):
    """Represents a tool call request"""
    id: UUID = Field(default_factory=uuid4)
    tool_name: str = Field(..., min_length=1)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    max_execution_time: int = Field(default=300, gt=0, le=3600)  # seconds
    retry_count: int = Field(default=0, ge=0, le=3)
    
    @field_validator('tool_name')
    @classmethod
    def validate_tool_name(cls, v):
        """Ensure tool name is properly formatted"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Tool name must contain only letters, numbers, hyphens, and underscores')
        return v.lower()


class ToolResult(BaseModel):
    """Result of tool execution"""
    call_id: UUID = Field(..., description="ID of the tool call")
    tool_name: str = Field(...)
    status: ToolExecutionStatus = Field(...)
    result: Optional[Any] = Field(None, description="Tool output")
    error_message: Optional[str] = None
    execution_time: float = Field(..., ge=0, description="Execution time in seconds")
    started_at: datetime = Field(...)
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('completed_at')
    @classmethod
    def validate_completion_time(cls, v, info):
        if v and hasattr(info, 'data') and 'started_at' in info.data and v < info.data['started_at']:
            raise ValueError('Completion time must be after start time')
        return v
    
    @property
    def duration(self) -> Optional[timedelta]:
        if self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    @property
    def is_successful(self) -> bool:
        return self.status == ToolExecutionStatus.COMPLETED and self.error_message is None


class UserPreferences(BaseModel):
    """User preferences and settings"""
    user_id: UUID
    preferred_language: str = Field(default="en")
    timezone: str = Field(default="UTC")
    response_style: Literal["concise", "detailed", "technical", "casual"] = "detailed"
    max_response_length: int = Field(default=2000, gt=0, le=10000)
    enable_tool_usage: bool = Field(default=True)
    allowed_tools: List[str] = Field(default_factory=list)  # Empty means all allowed
    notification_preferences: Dict[str, bool] = Field(default_factory=dict)
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        # Simple timezone validation - in production, use pytz
        common_timezones = [
            'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
            'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
        ]
        if v not in common_timezones:
            # Allow it but warn
            pass
        return v


class ConversationContext(BaseModel):
    """Context for the current conversation"""
    session_id: UUID = Field(default_factory=uuid4)
    user_id: UUID = Field(...)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Conversation metadata
    mode: ConversationMode = Field(default=ConversationMode.CHAT)
    topic: Optional[str] = None
    summary: Optional[str] = None
    
    # Agent configuration
    agent_role: AgentRole = Field(default=AgentRole.ASSISTANT)
    agent_capabilities: List[AgentCapability] = Field(default_factory=list)
    system_prompt: Optional[str] = None
    
    # User preferences
    user_preferences: Optional[UserPreferences] = None
    
    # Session statistics
    message_count: int = Field(default=0, ge=0)
    tool_calls_count: int = Field(default=0, ge=0)
    successful_tool_calls: int = Field(default=0, ge=0)
    
    def update_activity(self) -> None:
        """Update last activity timestamp"""
        self.last_activity = datetime.now(timezone.utc)
    
    def increment_message_count(self) -> None:
        """Increment message counter"""
        self.message_count += 1
        self.update_activity()
    
    def increment_tool_calls(self, successful: bool = True) -> None:
        """Increment tool call counters"""
        self.tool_calls_count += 1
        if successful:
            self.successful_tool_calls += 1
        self.update_activity()
    
    @property
    def session_duration(self) -> timedelta:
        """Get session duration"""
        return self.last_activity - self.started_at
    
    @property
    def tool_success_rate(self) -> float:
        """Calculate tool call success rate"""
        if self.tool_calls_count == 0:
            return 0.0
        return self.successful_tool_calls / self.tool_calls_count


class ThinkingStep(BaseModel):
    """Represents a step in the agent's thinking process"""
    step_number: int = Field(..., ge=1)
    description: str = Field(..., min_length=1)
    reasoning: Optional[str] = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    requires_tools: List[str] = Field(default_factory=list)
    expected_outcome: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentThinking(BaseModel):
    """Agent's internal thinking process"""
    request_id: UUID = Field(default_factory=uuid4)
    user_query: str = Field(...)
    understanding: str = Field(..., description="Agent's understanding of the query")
    strategy: str = Field(..., description="High-level strategy to address the query")
    steps: List[ThinkingStep] = Field(default_factory=list)
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    estimated_complexity: Literal["low", "medium", "high", "very_high"] = "medium"
    requires_clarification: bool = Field(default=False)
    clarification_questions: List[str] = Field(default_factory=list)
    
    def add_step(self, description: str, reasoning: Optional[str] = None,
                confidence: float = 0.5, requires_tools: List[str] = None) -> ThinkingStep:
        """Add a thinking step"""
        step = ThinkingStep(
            step_number=len(self.steps) + 1,
            description=description,
            reasoning=reasoning,
            confidence=confidence,
            requires_tools=requires_tools or []
        )
        self.steps.append(step)
        
        # Update overall confidence based on step confidences
        if self.steps:
            self.confidence_score = sum(s.confidence for s in self.steps) / len(self.steps)
        
        return step


# TypedDict versions for LangGraph
class AgentState(TypedDict):
    """Main agent state for LangGraph workflows"""
    # Core conversation
    messages: Annotated[List[BaseMessage], add_messages]
    
    # Context and session info
    conversation_context: Dict[str, Any]  # Serialized ConversationContext
    
    # Current processing
    current_query: Optional[str]
    agent_thinking: Optional[Dict[str, Any]]  # Serialized AgentThinking
    
    # Tool management
    pending_tool_calls: List[Dict[str, Any]]  # Serialized ToolCall objects
    active_tool_calls: List[Dict[str, Any]]
    completed_tool_results: List[Dict[str, Any]]  # Serialized ToolResult objects
    
    # Agent state
    current_step: str
    is_thinking: bool
    needs_user_input: bool
    should_use_tools: bool
    
    # Error handling
    error_count: int
    last_error: Optional[str]
    retry_count: int
    
    # Performance tracking
    response_time: float
    total_tokens_used: int
    
    # Session management
    session_active: bool
    last_activity: datetime


class ToolRegistry(BaseModel):
    """Registry of available tools"""
    tools: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    def register_tool(self, name: str, description: str, parameters: Dict[str, Any],
                     required_capabilities: List[AgentCapability] = None) -> None:
        """Register a new tool"""
        self.tools[name] = {
            "description": description,
            "parameters": parameters,
            "required_capabilities": required_capabilities or [],
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "usage_count": 0,
            "success_count": 0
        }
    
    def get_available_tools(self, agent_capabilities: List[AgentCapability]) -> List[str]:
        """Get tools available to agent with given capabilities"""
        available = []
        for tool_name, tool_info in self.tools.items():
            required_caps = tool_info.get("required_capabilities", [])
            if all(cap in agent_capabilities for cap in required_caps):
                available.append(tool_name)
        return available
    
    def increment_usage(self, tool_name: str, successful: bool = True) -> None:
        """Increment tool usage statistics"""
        if tool_name in self.tools:
            self.tools[tool_name]["usage_count"] += 1
            if successful:
                self.tools[tool_name]["success_count"] += 1
    
    def get_tool_success_rate(self, tool_name: str) -> float:
        """Get success rate for a specific tool"""
        if tool_name not in self.tools:
            return 0.0
        
        tool_info = self.tools[tool_name]
        usage = tool_info.get("usage_count", 0)
        if usage == 0:
            return 0.0
        
        success = tool_info.get("success_count", 0)
        return success / usage


def agent_state_examples():
    """Demonstrate agent state management"""
    print("=== Agent State Management Examples ===\n")
    
    # Create user preferences
    print("--- User Preferences ---")
    user_id = uuid4()
    preferences = UserPreferences(
        user_id=user_id,
        preferred_language="en",
        timezone="US/Pacific",
        response_style="detailed",
        enable_tool_usage=True,
        allowed_tools=["web_search", "calculator", "file_operations"],
        notification_preferences={
            "email": True,
            "push": False,
            "sms": False
        }
    )
    
    print(f"✅ User preferences created for: {str(user_id)[:8]}...")
    print(f"   Language: {preferences.preferred_language}")
    print(f"   Style: {preferences.response_style}")
    print(f"   Tools allowed: {len(preferences.allowed_tools)}")
    
    # Create conversation context
    print("\n--- Conversation Context ---")
    context = ConversationContext(
        user_id=user_id,
        mode=ConversationMode.TASK_ORIENTED,
        topic="Data Analysis",
        agent_role=AgentRole.ANALYST,
        agent_capabilities=[
            AgentCapability.DATA_ANALYSIS,
            AgentCapability.CODE_EXECUTION,
            AgentCapability.WEB_SEARCH
        ],
        system_prompt="You are a data analysis expert. Help users analyze and understand their data.",
        user_preferences=preferences
    )
    
    print(f"✅ Conversation context created:")
    print(f"   Session: {str(context.session_id)[:8]}...")
    print(f"   Mode: {context.mode.value}")
    print(f"   Role: {context.agent_role.value}")
    print(f"   Capabilities: {len(context.agent_capabilities)}")
    
    # Create agent thinking process
    print("\n--- Agent Thinking Process ---")
    thinking = AgentThinking(
        user_query="Analyze the sales data from the last quarter and find trends",
        understanding="User wants to perform sales data analysis to identify trends over the last quarter",
        strategy="1) Get data access, 2) Perform statistical analysis, 3) Identify trends, 4) Create visualizations",
        estimated_complexity="medium"
    )
    
    # Add thinking steps
    step1 = thinking.add_step(
        description="Access sales data for Q4",
        reasoning="Need to retrieve the data before analysis",
        confidence=0.9,
        requires_tools=["database_query"]
    )
    
    step2 = thinking.add_step(
        description="Perform exploratory data analysis",
        reasoning="Understand data structure and quality",
        confidence=0.8,
        requires_tools=["code_execution"]
    )
    
    step3 = thinking.add_step(
        description="Identify trends and patterns", 
        reasoning="Apply statistical methods to find meaningful trends",
        confidence=0.7,
        requires_tools=["data_analysis", "code_execution"]
    )
    
    print(f"✅ Agent thinking process:")
    print(f"   Query: {thinking.user_query[:50]}...")
    print(f"   Strategy: {thinking.strategy[:50]}...")
    print(f"   Steps: {len(thinking.steps)}")
    print(f"   Confidence: {thinking.confidence_score:.2f}")
    
    for step in thinking.steps:
        print(f"   Step {step.step_number}: {step.description}")
        print(f"     Tools needed: {step.requires_tools}")
        print(f"     Confidence: {step.confidence:.2f}")
    
    # Create tool calls and results
    print("\n--- Tool Execution ---")
    
    # Tool call
    tool_call = ToolCall(
        tool_name="database_query",
        parameters={
            "query": "SELECT * FROM sales WHERE date >= '2024-10-01'",
            "database": "analytics"
        },
        max_execution_time=60
    )
    
    print(f"✅ Tool call created:")
    print(f"   Tool: {tool_call.tool_name}")
    print(f"   Parameters: {tool_call.parameters}")
    print(f"   Max time: {tool_call.max_execution_time}s")
    
    # Tool result (simulate execution)
    tool_result = ToolResult(
        call_id=tool_call.id,
        tool_name=tool_call.tool_name,
        status=ToolExecutionStatus.COMPLETED,
        result={
            "rows_returned": 15420,
            "columns": ["date", "product", "amount", "customer_id"],
            "success": True
        },
        execution_time=3.2,
        started_at=datetime.now(timezone.utc) - timedelta(seconds=4),
        completed_at=datetime.now(timezone.utc),
        metadata={"query_plan": "index_scan", "cache_hit": False}
    )
    
    print(f"✅ Tool execution result:")
    print(f"   Status: {tool_result.status.value}")
    print(f"   Duration: {tool_result.duration}")
    print(f"   Success: {tool_result.is_successful}")
    print(f"   Result: {tool_result.result}")
    
    # Update context with activity
    context.increment_tool_calls(successful=tool_result.is_successful)
    context.increment_message_count()
    
    print(f"\n--- Updated Context Stats ---")
    print(f"   Messages: {context.message_count}")
    print(f"   Tool calls: {context.tool_calls_count}")
    print(f"   Success rate: {context.tool_success_rate:.2%}")
    print(f"   Session duration: {context.session_duration}")


def tool_registry_examples():
    """Demonstrate tool registry functionality"""
    print("\n=== Tool Registry Examples ===\n")
    
    # Create and populate tool registry
    registry = ToolRegistry()
    
    # Register various tools
    tools_to_register = [
        {
            "name": "web_search",
            "description": "Search the web for information",
            "parameters": {"query": "str", "num_results": "int"},
            "capabilities": [AgentCapability.WEB_SEARCH]
        },
        {
            "name": "calculator",
            "description": "Perform mathematical calculations",
            "parameters": {"expression": "str"},
            "capabilities": []  # No special capabilities required
        },
        {
            "name": "code_executor",
            "description": "Execute Python code",
            "parameters": {"code": "str", "timeout": "int"},
            "capabilities": [AgentCapability.CODE_EXECUTION]
        },
        {
            "name": "file_reader",
            "description": "Read contents of a file",
            "parameters": {"filepath": "str", "encoding": "str"},
            "capabilities": [AgentCapability.FILE_OPERATIONS]
        },
        {
            "name": "data_analyzer",
            "description": "Analyze datasets and generate insights",
            "parameters": {"data": "dict", "analysis_type": "str"},
            "capabilities": [AgentCapability.DATA_ANALYSIS, AgentCapability.CODE_EXECUTION]
        }
    ]
    
    for tool in tools_to_register:
        registry.register_tool(
            name=tool["name"],
            description=tool["description"],
            parameters=tool["parameters"],
            required_capabilities=tool["capabilities"]
        )
    
    print(f"✅ Registered {len(tools_to_register)} tools")
    
    # Test tool availability for different agent capabilities
    capability_sets = [
        [],  # Basic agent
        [AgentCapability.WEB_SEARCH],  # Search agent
        [AgentCapability.CODE_EXECUTION, AgentCapability.DATA_ANALYSIS],  # Analysis agent
        [AgentCapability.WEB_SEARCH, AgentCapability.CODE_EXECUTION, 
         AgentCapability.FILE_OPERATIONS, AgentCapability.DATA_ANALYSIS]  # Full agent
    ]
    
    for i, capabilities in enumerate(capability_sets):
        available_tools = registry.get_available_tools(capabilities)
        print(f"\nAgent {i+1} capabilities: {[c.value for c in capabilities]}")
        print(f"Available tools ({len(available_tools)}): {available_tools}")
    
    # Simulate tool usage and track statistics
    print("\n--- Tool Usage Statistics ---")
    usage_simulation = [
        ("web_search", True),
        ("calculator", True),
        ("web_search", False),  # Failed
        ("code_executor", True),
        ("calculator", True),
        ("data_analyzer", True),
        ("web_search", True),
        ("code_executor", False),  # Failed
    ]
    
    for tool_name, successful in usage_simulation:
        registry.increment_usage(tool_name, successful)
    
    # Show statistics
    for tool_name in registry.tools.keys():
        success_rate = registry.get_tool_success_rate(tool_name)
        usage_count = registry.tools[tool_name]["usage_count"]
        print(f"   {tool_name}: {usage_count} uses, {success_rate:.1%} success rate")


def create_sample_agent_state() -> AgentState:
    """Create a sample agent state for LangGraph"""
    user_id = uuid4()
    
    # Create conversation context
    context = ConversationContext(
        user_id=user_id,
        mode=ConversationMode.TASK_ORIENTED,
        agent_role=AgentRole.ASSISTANT,
        agent_capabilities=[AgentCapability.WEB_SEARCH, AgentCapability.CODE_EXECUTION]
    )
    
    # Sample messages
    messages = [
        SystemMessage(content="You are a helpful AI assistant."),
        HumanMessage(content="Can you help me analyze some sales data?"),
        AIMessage(content="I'd be happy to help you analyze sales data. Could you provide the data or tell me where it's located?")
    ]
    
    # Create agent state
    agent_state: AgentState = {
        "messages": messages,
        "conversation_context": context.model_dump(),
        "current_query": "analyze sales data",
        "agent_thinking": None,
        "pending_tool_calls": [],
        "active_tool_calls": [],
        "completed_tool_results": [],
        "current_step": "waiting_for_user_input",
        "is_thinking": False,
        "needs_user_input": True,
        "should_use_tools": False,
        "error_count": 0,
        "last_error": None,
        "retry_count": 0,
        "response_time": 0.0,
        "total_tokens_used": 0,
        "session_active": True,
        "last_activity": datetime.now(timezone.utc)
    }
    
    return agent_state


if __name__ == "__main__":
    agent_state_examples()
    tool_registry_examples()
    
    # Show sample agent state
    print("\n=== Sample Agent State ===")
    sample_state = create_sample_agent_state()
    print(f"Messages: {len(sample_state['messages'])}")
    print(f"Current step: {sample_state['current_step']}")
    print(f"Session active: {sample_state['session_active']}")
    print(f"Context keys: {list(sample_state['conversation_context'].keys())}")