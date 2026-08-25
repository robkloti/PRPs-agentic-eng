"""
Project 4: Multi-Agent Workflow - Supervisor Agent
=================================================

Learning objectives:
- Implement hierarchical agent architectures
- Coordinate multiple specialized agents
- Handle task delegation and routing
- Monitor and manage complex workflows
"""

from typing import Dict, Any, List, Optional, Union, Literal
from typing_extensions import TypedDict, Annotated
from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage


class AgentType(str, Enum):
    """Types of specialized agents"""
    SUPERVISOR = "supervisor"
    RESEARCHER = "researcher"
    WRITER = "writer"
    REVIEWER = "reviewer"
    ANALYST = "analyst"
    CODER = "coder"


class TaskStatus(str, Enum):
    """Task execution status"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class WorkflowStage(str, Enum):
    """Stages in the workflow"""
    PLANNING = "planning"
    RESEARCH = "research"
    EXECUTION = "execution"
    REVIEW = "review"
    FINALIZATION = "finalization"
    COMPLETED = "completed"


class AgentCapability(BaseModel):
    """Agent capability definition"""
    name: str = Field(..., description="Capability name")
    description: str = Field(..., description="What this capability does")
    required_tools: List[str] = Field(default_factory=list)
    confidence_level: float = Field(default=0.8, ge=0.0, le=1.0)
    max_concurrent_tasks: int = Field(default=3, ge=1, le=10)


class SpecializedAgent(BaseModel):
    """Specialized agent configuration"""
    id: UUID = Field(default_factory=uuid4)
    agent_type: AgentType = Field(...)
    name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="Agent purpose and role")
    capabilities: List[AgentCapability] = Field(default_factory=list)
    system_prompt: str = Field(..., description="Agent's system prompt")
    
    # Status and workload
    is_available: bool = Field(default=True)
    current_tasks: List[UUID] = Field(default_factory=list)
    completed_tasks_count: int = Field(default=0, ge=0)
    success_rate: float = Field(default=1.0, ge=0.0, le=1.0)
    average_task_time: float = Field(default=300.0, ge=0.0)  # seconds
    
    # Specialization metrics
    expertise_areas: List[str] = Field(default_factory=list)
    preferred_task_types: List[str] = Field(default_factory=list)
    
    @property
    def workload_percentage(self) -> float:
        """Calculate current workload as percentage of capacity"""
        max_capacity = sum(cap.max_concurrent_tasks for cap in self.capabilities)
        if max_capacity == 0:
            return 0.0
        return len(self.current_tasks) / max_capacity
    
    @property
    def is_overloaded(self) -> bool:
        """Check if agent is at capacity"""
        return self.workload_percentage >= 1.0
    
    def can_handle_task(self, task_type: str, required_capabilities: List[str]) -> bool:
        """Check if agent can handle a specific task"""
        if self.is_overloaded or not self.is_available:
            return False
        
        # Check if agent has required capabilities
        agent_caps = [cap.name for cap in self.capabilities]
        return all(req_cap in agent_caps for req_cap in required_capabilities)
    
    def estimate_task_duration(self, task_complexity: float = 0.5) -> float:
        """Estimate how long a task will take"""
        base_time = self.average_task_time
        complexity_multiplier = 0.5 + (task_complexity * 1.5)  # 0.5x to 2.0x
        workload_multiplier = 1.0 + (self.workload_percentage * 0.5)  # Up to 1.5x
        
        return base_time * complexity_multiplier * workload_multiplier


class Task(BaseModel):
    """Individual task in the workflow"""
    id: UUID = Field(default_factory=uuid4)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    task_type: str = Field(..., description="Type of task (research, writing, etc.)")
    
    # Requirements
    required_capabilities: List[str] = Field(default_factory=list)
    estimated_complexity: float = Field(default=0.5, ge=0.0, le=1.0)
    max_duration: timedelta = Field(default=timedelta(hours=2))
    
    # Assignment and status
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    assigned_agent_id: Optional[UUID] = None
    
    # Dependencies
    depends_on: List[UUID] = Field(default_factory=list)
    blocks: List[UUID] = Field(default_factory=list)
    
    # Execution tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Results
    result: Optional[Dict[str, Any]] = None
    feedback: List[str] = Field(default_factory=list)
    quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    
    @property
    def is_ready_for_assignment(self) -> bool:
        """Check if task is ready to be assigned"""
        return (self.status == TaskStatus.PENDING and 
                len(self.depends_on) == 0)
    
    @property
    def is_overdue(self) -> bool:
        """Check if task is overdue"""
        if not self.assigned_at:
            return False
        
        deadline = self.assigned_at + self.max_duration
        return datetime.now(timezone.utc) > deadline
    
    @property
    def duration(self) -> Optional[timedelta]:
        """Get actual task duration"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None


class SupervisorState(TypedDict):
    """State for supervisor agent coordination"""
    # Workflow management
    workflow_id: UUID
    current_stage: str
    overall_objective: str
    
    # Task management
    all_tasks: List[Dict[str, Any]]  # Serialized Task objects
    pending_tasks: List[UUID]
    active_tasks: List[UUID]
    completed_tasks: List[UUID]
    failed_tasks: List[UUID]
    
    # Agent management
    available_agents: List[Dict[str, Any]]  # Serialized SpecializedAgent objects
    agent_assignments: Dict[str, List[str]]  # agent_id -> task_ids
    
    # Communication
    messages: Annotated[List[BaseMessage], add_messages]
    inter_agent_messages: List[Dict[str, Any]]
    
    # Progress tracking
    progress_percentage: float
    quality_metrics: Dict[str, float]
    performance_metrics: Dict[str, Any]
    
    # Decision making
    next_action: str
    action_reasoning: str
    requires_human_input: bool
    
    # Error handling
    error_count: int
    last_error: Optional[str]
    retry_attempts: Dict[str, int]


class SupervisorAgent:
    """Supervisor agent that coordinates multiple specialized agents"""
    
    def __init__(self, objective: str):
        self.objective = objective
        self.workflow_id = uuid4()
        self.agents: Dict[UUID, SpecializedAgent] = {}
        self.tasks: Dict[UUID, Task] = {}
        
        # Initialize default agents
        self._initialize_default_agents()
    
    def _initialize_default_agents(self):
        """Initialize a set of default specialized agents"""
        
        # Research Agent
        researcher = SpecializedAgent(
            agent_type=AgentType.RESEARCHER,
            name="Research Specialist",
            description="Conducts thorough research on topics, gathers information, and provides comprehensive analysis",
            capabilities=[
                AgentCapability(
                    name="web_research",
                    description="Search and analyze web content",
                    required_tools=["web_search", "content_analysis"],
                    confidence_level=0.9
                ),
                AgentCapability(
                    name="data_analysis",
                    description="Analyze and synthesize information",
                    required_tools=["data_processing"],
                    confidence_level=0.8
                )
            ],
            system_prompt="You are a research specialist. Your role is to conduct thorough, accurate research on assigned topics. Provide comprehensive, well-sourced information and identify key insights.",
            expertise_areas=["market_research", "technical_analysis", "competitive_intelligence"],
            preferred_task_types=["research", "analysis", "data_gathering"]
        )
        
        # Writer Agent
        writer = SpecializedAgent(
            agent_type=AgentType.WRITER,
            name="Content Writer",
            description="Creates high-quality written content based on research and requirements",
            capabilities=[
                AgentCapability(
                    name="content_creation",
                    description="Write engaging, well-structured content",
                    confidence_level=0.9
                ),
                AgentCapability(
                    name="editing",
                    description="Edit and improve existing content",
                    confidence_level=0.85
                )
            ],
            system_prompt="You are a skilled content writer. Transform research and ideas into clear, engaging, well-structured written content that meets the specified requirements.",
            expertise_areas=["technical_writing", "marketing_copy", "documentation"],
            preferred_task_types=["writing", "content_creation", "editing"]
        )
        
        # Reviewer Agent
        reviewer = SpecializedAgent(
            agent_type=AgentType.REVIEWER,
            name="Quality Reviewer",
            description="Reviews work quality, provides feedback, and ensures standards are met",
            capabilities=[
                AgentCapability(
                    name="quality_assessment",
                    description="Evaluate work quality and provide feedback",
                    confidence_level=0.9
                ),
                AgentCapability(
                    name="fact_checking",
                    description="Verify accuracy and consistency",
                    required_tools=["web_search", "fact_verification"],
                    confidence_level=0.85
                )
            ],
            system_prompt="You are a quality reviewer. Your role is to carefully review work, identify issues, provide constructive feedback, and ensure high standards are maintained.",
            expertise_areas=["quality_assurance", "fact_checking", "content_review"],
            preferred_task_types=["review", "quality_check", "feedback"]
        )
        
        # Store agents
        self.agents[researcher.id] = researcher
        self.agents[writer.id] = writer  
        self.agents[reviewer.id] = reviewer
    
    def create_workflow_plan(self, user_request: str) -> List[Task]:
        """Create a plan of tasks to complete the workflow"""
        tasks = []
        
        # Task 1: Research Phase
        research_task = Task(
            title="Research and Information Gathering",
            description=f"Conduct comprehensive research related to: {user_request}",
            task_type="research",
            required_capabilities=["web_research", "data_analysis"],
            estimated_complexity=0.6,
            priority=TaskPriority.HIGH,
            max_duration=timedelta(hours=1)
        )
        tasks.append(research_task)
        
        # Task 2: Content Creation
        writing_task = Task(
            title="Content Creation",
            description=f"Create content based on research findings for: {user_request}",
            task_type="writing",
            required_capabilities=["content_creation"],
            estimated_complexity=0.7,
            depends_on=[research_task.id],
            priority=TaskPriority.HIGH,
            max_duration=timedelta(hours=1.5)
        )
        tasks.append(writing_task)
        
        # Task 3: Quality Review
        review_task = Task(
            title="Quality Review and Feedback",
            description="Review the created content for quality, accuracy, and completeness",
            task_type="review",
            required_capabilities=["quality_assessment", "fact_checking"],
            estimated_complexity=0.4,
            depends_on=[writing_task.id],
            priority=TaskPriority.MEDIUM,
            max_duration=timedelta(minutes=45)
        )
        tasks.append(review_task)
        
        # Store tasks
        for task in tasks:
            self.tasks[task.id] = task
        
        return tasks
    
    def find_best_agent_for_task(self, task: Task) -> Optional[SpecializedAgent]:
        """Find the best available agent for a specific task"""
        suitable_agents = []
        
        for agent in self.agents.values():
            if agent.can_handle_task(task.task_type, task.required_capabilities):
                # Calculate suitability score
                score = 0.0
                
                # Prefer agents with matching task types
                if task.task_type in agent.preferred_task_types:
                    score += 0.4
                
                # Consider success rate
                score += agent.success_rate * 0.3
                
                # Prefer less loaded agents
                score += (1.0 - agent.workload_percentage) * 0.2
                
                # Consider capability confidence
                matching_caps = [cap for cap in agent.capabilities 
                               if cap.name in task.required_capabilities]
                if matching_caps:
                    avg_confidence = sum(cap.confidence_level for cap in matching_caps) / len(matching_caps)
                    score += avg_confidence * 0.1
                
                suitable_agents.append((agent, score))
        
        if not suitable_agents:
            return None
        
        # Return agent with highest score
        suitable_agents.sort(key=lambda x: x[1], reverse=True)
        return suitable_agents[0][0]
    
    def assign_task(self, task_id: UUID, agent_id: UUID) -> bool:
        """Assign a task to an agent"""
        if task_id not in self.tasks or agent_id not in self.agents:
            return False
        
        task = self.tasks[task_id]
        agent = self.agents[agent_id]
        
        if not agent.can_handle_task(task.task_type, task.required_capabilities):
            return False
        
        # Update task
        task.status = TaskStatus.ASSIGNED
        task.assigned_agent_id = agent_id
        task.assigned_at = datetime.now(timezone.utc)
        
        # Update agent
        agent.current_tasks.append(task_id)
        
        return True
    
    def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow status"""
        total_tasks = len(self.tasks)
        if total_tasks == 0:
            return {"progress": 0.0, "stage": "not_started"}
        
        completed_count = len([t for t in self.tasks.values() 
                              if t.status == TaskStatus.COMPLETED])
        in_progress_count = len([t for t in self.tasks.values() 
                                if t.status in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]])
        failed_count = len([t for t in self.tasks.values() 
                           if t.status == TaskStatus.FAILED])
        
        progress = completed_count / total_tasks
        
        # Determine current stage
        if progress == 0.0:
            stage = WorkflowStage.PLANNING
        elif progress < 0.5:
            stage = WorkflowStage.EXECUTION
        elif progress < 1.0:
            stage = WorkflowStage.REVIEW
        else:
            stage = WorkflowStage.COMPLETED
        
        return {
            "progress": progress,
            "stage": stage.value,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "active_tasks": in_progress_count,
            "failed_tasks": failed_count,
            "agent_utilization": {
                str(agent.id): agent.workload_percentage 
                for agent in self.agents.values()
            }
        }
    
    def to_state_dict(self) -> SupervisorState:
        """Convert supervisor to state dict for LangGraph"""
        status = self.get_workflow_status()
        
        return SupervisorState(
            workflow_id=self.workflow_id,
            current_stage=status["stage"],
            overall_objective=self.objective,
            
            all_tasks=[task.model_dump() for task in self.tasks.values()],
            pending_tasks=[tid for tid, task in self.tasks.items() 
                          if task.status == TaskStatus.PENDING],
            active_tasks=[tid for tid, task in self.tasks.items() 
                         if task.status in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]],
            completed_tasks=[tid for tid, task in self.tasks.items() 
                           if task.status == TaskStatus.COMPLETED],
            failed_tasks=[tid for tid, task in self.tasks.items() 
                         if task.status == TaskStatus.FAILED],
            
            available_agents=[agent.model_dump() for agent in self.agents.values()],
            agent_assignments={
                str(agent_id): [str(tid) for tid in agent.current_tasks]
                for agent_id, agent in self.agents.items()
            },
            
            messages=[],
            inter_agent_messages=[],
            
            progress_percentage=status["progress"],
            quality_metrics={},
            performance_metrics=status,
            
            next_action="assign_tasks",
            action_reasoning="Initial workflow setup",
            requires_human_input=False,
            
            error_count=0,
            last_error=None,
            retry_attempts={}
        )


def supervisor_examples():
    """Demonstrate supervisor agent functionality"""
    print("=== Supervisor Agent Examples ===\n")
    
    # Create supervisor for a sample project
    objective = "Create a comprehensive market analysis report for AI tools in 2024"
    supervisor = SupervisorAgent(objective)
    
    print(f"Created supervisor for: {objective}")
    print(f"Available agents: {len(supervisor.agents)}")
    
    # Show available agents
    print("\n--- Available Agents ---")
    for agent in supervisor.agents.values():
        print(f"• {agent.name} ({agent.agent_type.value})")
        print(f"  Capabilities: {[cap.name for cap in agent.capabilities]}")
        print(f"  Expertise: {agent.expertise_areas}")
        print(f"  Workload: {agent.workload_percentage:.1%}")
        print()
    
    # Create workflow plan
    print("--- Workflow Planning ---")
    user_request = "Analysis of AI tool market trends and competitive landscape"
    tasks = supervisor.create_workflow_plan(user_request)
    
    print(f"Created {len(tasks)} tasks:")
    for i, task in enumerate(tasks, 1):
        print(f"{i}. {task.title}")
        print(f"   Type: {task.task_type}")
        print(f"   Complexity: {task.estimated_complexity:.1f}")
        print(f"   Required capabilities: {task.required_capabilities}")
        print(f"   Dependencies: {len(task.depends_on)} tasks")
        print()
    
    # Task assignment
    print("--- Task Assignment ---")
    ready_tasks = [t for t in supervisor.tasks.values() if t.is_ready_for_assignment]
    
    for task in ready_tasks:
        best_agent = supervisor.find_best_agent_for_task(task)
        if best_agent:
            success = supervisor.assign_task(task.id, best_agent.id)
            if success:
                print(f"✅ Assigned '{task.title}' to {best_agent.name}")
                print(f"   Estimated duration: {best_agent.estimate_task_duration(task.estimated_complexity):.0f}s")
            else:
                print(f"❌ Failed to assign '{task.title}'")
        else:
            print(f"⚠️  No suitable agent found for '{task.title}'")
    
    # Workflow status
    print("\n--- Workflow Status ---")
    status = supervisor.get_workflow_status()
    
    print(f"Progress: {status['progress']:.1%}")
    print(f"Stage: {status['stage']}")
    print(f"Total tasks: {status['total_tasks']}")
    print(f"Active tasks: {status['active_tasks']}")
    print(f"Completed tasks: {status['completed_tasks']}")
    
    print("\nAgent Utilization:")
    for agent_id, utilization in status["agent_utilization"].items():
        agent = next(a for a in supervisor.agents.values() if str(a.id) == agent_id)
        print(f"  {agent.name}: {utilization:.1%}")
    
    # Convert to state for LangGraph
    print("\n--- State Conversion ---")
    state_dict = supervisor.to_state_dict()
    
    print("Supervisor state for LangGraph:")
    print(f"  Workflow ID: {str(state_dict['workflow_id'])[:8]}...")
    print(f"  Current stage: {state_dict['current_stage']}")
    print(f"  Progress: {state_dict['progress_percentage']:.1%}")
    print(f"  Pending tasks: {len(state_dict['pending_tasks'])}")
    print(f"  Active tasks: {len(state_dict['active_tasks'])}")
    print(f"  Next action: {state_dict['next_action']}")


if __name__ == "__main__":
    supervisor_examples()