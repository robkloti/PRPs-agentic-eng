# Pydantic + LangGraph Mastery Learning Path

A structured 5-week program to master Pydantic data validation and LangGraph workflow orchestration through progressive, hands-on project development.

## 🎯 Learning Philosophy

**"Context is King"** - Every project contains comprehensive documentation, examples, and gotchas to enable one-pass implementation success.

**Progressive Complexity** - Start with fundamentals, add sophistication incrementally through validation loops.

**Practical Application** - Build real-world patterns that mirror production scenarios.

## 📚 Course Structure

### Week 1: Pydantic Fundamentals ✅
**Master data validation, serialization, and type safety**

- **Models**: BaseModel, Field, basic validation patterns
- **Validators**: Custom @field_validator and @model_validator decorators  
- **Nested Structures**: Complex data modeling with relationships
- **Serialization**: JSON handling, aliases, and API response formatting
- **Exercises**: Complete user management system with RBAC

**Key Files:**
- `project_01_pydantic_fundamentals/models/basic_models.py`
- `project_01_pydantic_fundamentals/models/validators.py`
- `project_01_pydantic_fundamentals/models/nested_structures.py`
- `project_01_pydantic_fundamentals/models/serialization.py`
- `project_01_pydantic_fundamentals/exercises/user_management.py`

### Week 2: LangGraph Fundamentals ✅
**Understand workflow orchestration through basic state machines**

- **StateGraph**: Initialization, configuration, and compilation
- **State Management**: TypedDict schemas and Pydantic validation models
- **Node Functions**: Proper signatures and async patterns
- **Routing**: Simple edges, conditional edges, and routing logic
- **Validation**: State reducers and update patterns

**Key Files:**
- `project_02_simple_state_machine/basic_graph.py`
- `project_02_simple_state_machine/state_models.py`

### Week 3: AI Agent with Tools 🔄
**Integration patterns between AI models and external tools**

- **Agent State**: Conversation context and history management
- **Tool Interfaces**: Proper typing, validation, and error handling
- **Tool Integration**: Web search, calculations, file operations
- **Error Recovery**: Retry logic, fallback strategies, timeouts
- **Streaming**: Real-time updates and progress reporting

**Key Files:**
- `project_03_ai_agent_with_tools/agent_state.py`
- `project_03_ai_agent_with_tools/tools/web_search.py`
- `project_03_ai_agent_with_tools/tools/calculator.py`
- `project_03_ai_agent_with_tools/tools/file_operations.py`

### Week 4: Multi-Agent Workflow 📅
**Complex orchestration and agent coordination**

- **Supervisor Patterns**: Hierarchical agent architectures
- **Inter-Agent Communication**: Message passing and state sharing
- **Parallel Execution**: Concurrent task processing
- **Load Balancing**: Dynamic routing and resource allocation
- **Monitoring**: Workflow observability and debugging

### Week 5: Production System 📅
**Production-ready patterns and deployment**

- **Error Handling**: Circuit breakers, retry patterns, graceful degradation
- **Monitoring**: Structured logging, metrics, health checks
- **Performance**: Optimization, caching, horizontal scaling
- **Security**: Input validation, authentication, rate limiting
- **Deployment**: Docker, API servers, infrastructure as code

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Basic understanding of async/await patterns
- Familiarity with type hints

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pydantic-langgraph-mastery

# Install dependencies
pip install -e .

# Or with uv (recommended)
uv pip install -e .
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Add your API keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
TAVILY_API_KEY=your_tavily_key_here  # Optional
```

### Running Examples

```bash
# Week 1: Pydantic Fundamentals
python project_01_pydantic_fundamentals/models/basic_models.py
python project_01_pydantic_fundamentals/models/validators.py
python project_01_pydantic_fundamentals/exercises/user_management.py

# Week 2: LangGraph Basics  
python project_02_simple_state_machine/basic_graph.py

# Week 3: AI Agent Tools
python project_03_ai_agent_with_tools/agent_state.py
python project_03_ai_agent_with_tools/tools/web_search.py
python project_03_ai_agent_with_tools/tools/calculator.py
```

## 📖 Learning Resources

### Essential Reading
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/) - Official docs and patterns
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - StateGraph concepts and architecture  
- [PydanticAI Documentation](https://ai.pydantic.dev/) - LLM integration patterns

### Reference Repositories
- [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) - Real-world examples and patterns
- [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) - Core LangGraph examples

## 🎯 Success Criteria

By completion, you should be able to:

- ✅ **Design and implement** complex Pydantic models with custom validation
- ✅ **Build LangGraph workflows** that handle real-world complexity
- ✅ **Debug and troubleshoot** issues in agent workflows effectively
- ✅ **Optimize performance** of AI agent systems  
- ✅ **Deploy production-ready** agent applications
- ✅ **Mentor others** learning these technologies

## 🔍 Validation Framework

### Level 1: Concept Understanding
- Can explain concepts without documentation
- Understands WHY patterns are useful
- Knows when to use vs when NOT to use patterns
- Can debug when things go wrong

### Level 2: Implementation Practice  
- Build examples from scratch without copying
- Modify examples to handle edge cases
- Break code intentionally and fix it
- Optimize implementations for performance

### Level 3: Real-World Application
- Add features not in tutorials
- Integrate with different APIs/services
- Handle production use cases and datasets
- Create reusable components for future projects

## ⚡ Key Patterns

### Pydantic V2 Best Practices
```python
# Use @field_validator instead of @validator
@field_validator('email')
def validate_email(cls, v):
    return v.lower()

# Use @model_validator(mode='after') for cross-field validation  
@model_validator(mode='after')
def validate_consistency(self):
    return self

# Use @computed_field for derived properties
@computed_field
@property
def full_name(self) -> str:
    return f"{self.first_name} {self.last_name}"
```

### LangGraph Patterns
```python
# State schemas with TypedDict for compatibility
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    current_step: str

# Node functions with proper signatures
def process_node(state: AgentState) -> AgentState:
    return {**state, "current_step": "processed"}

# Conditional edges with explicit routing
def should_continue(state: AgentState) -> str:
    return "continue" if state["should_continue"] else END
```

## 🚫 Anti-Patterns to Avoid

- ❌ **Copy-Paste Learning**: Copying code without understanding the principles
- ❌ **God Objects**: Putting everything in one massive model or function
- ❌ **State Bloat**: Storing too much data in LangGraph state
- ❌ **Missing Validation**: Not handling edge cases and errors properly
- ❌ **Synchronous Blocking**: Using sync code with async LLMs

## 📊 Progress Tracking

Track your learning progress in `docs/learning_notes.md`:

- Daily learning sessions and insights
- Code examples and experiments  
- Challenges faced and solutions found
- Questions for deeper study
- Confidence levels (1-5 scale) for each concept

## 🤝 Contributing

This is a learning repository. Feel free to:
- Add your own examples and variations
- Improve documentation and explanations
- Share insights and discoveries
- Report issues or suggest improvements

## 📝 License

MIT License - feel free to use this learning path for personal or educational purposes.

---

**Start Date**: [Your Start Date]  
**Current Progress**: Week 3 - AI Agent with Tools  
**Target Completion**: [Your Target Date]

*Happy Learning! 🚀*