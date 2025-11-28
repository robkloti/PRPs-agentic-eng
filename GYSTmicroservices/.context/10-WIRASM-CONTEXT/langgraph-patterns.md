# LangGraph Patterns for GYST Services

## When to Use LangGraph

### ✅ Use LangGraph When:
- Multiple AI agents need to collaborate
- Decision tree with multiple steps
- Need supervisor to coordinate sub-agents
- Complex reasoning workflow
- State needs to persist across steps

### ❌ Don't Use LangGraph When:
- Single LLM call is sufficient
- Simple API transformation
- No decision-making needed
- Week 2 simple services (use later!)

## Not Needed Until Week 5+

**Week 2-4 Focus:**
- Simple API calls to OpenAI/Whisper
- Basic data transformation
- Single-step processing

**Week 5+ (When You Need LangGraph):**
- Multi-agent lead qualification
- Complex content generation
- RAG with multiple retrieval strategies

## Example: Lead Qualifier (Week 5)

### Without LangGraph (Simple):
```python
# Single LLM call
def qualify_lead(transcript: str) -> dict:
    prompt = f"Score this lead 0-100: {transcript}"
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"score": extract_score(response)}
```

### With LangGraph (Advanced):
```python
from langgraph.graph import StateGraph

class LeadState(TypedDict):
    transcript: str
    company_data: dict
    budget_analysis: dict
    intent_analysis: dict
    final_score: int
    tier: str

# Define agents
async def research_company(state: LeadState):
    """Agent 1: Research company online"""
    company_data = await web_search(state["company_name"])
    return {"company_data": company_data}

async def analyze_budget(state: LeadState):
    """Agent 2: Determine budget tier"""
    prompt = f"Based on {state['company_data']}, estimate budget"
    # ... LLM call
    return {"budget_analysis": result}

async def analyze_intent(state: LeadState):
    """Agent 3: Determine purchase intent"""
    prompt = f"Analyze intent from: {state['transcript']}"
    # ... LLM call
    return {"intent_analysis": result}

async def supervisor(state: LeadState):
    """Agent 4: Make final decision"""
    prompt = f"""
    Company: {state['company_data']}
    Budget: {state['budget_analysis']}
    Intent: {state['intent_analysis']}
    
    Provide final score 0-100 and tier (hot/warm/cold).
    """
    # ... LLM call
    return {"final_score": score, "tier": tier}

# Build graph
workflow = StateGraph(LeadState)
workflow.add_node("research", research_company)
workflow.add_node("budget", analyze_budget)
workflow.add_node("intent", analyze_intent)
workflow.add_node("supervisor", supervisor)

# Define flow
workflow.add_edge("research", "budget")
workflow.add_edge("research", "intent")  # Parallel
workflow.add_edge("budget", "supervisor")
workflow.add_edge("intent", "supervisor")

app = workflow.compile()

# Use it
result = await app.ainvoke({
    "transcript": "...",
    "company_name": "Acme Corp"
})
```

## Don't Worry About This Now!

**Week 2:** Build simple services without LangGraph
**Week 5+:** Come back here when you need multi-agent systems

## See Also
- Week 5 PRP will include full LangGraph integration
- `.context/07-EXAMPLES/` will have working examples (added later)