# PRP Methodology (from Rasmus Wirasm)

## What is a PRP?

**P**roblem - **R**equirements - **P**lan

A PRP is a detailed implementation guide that:
- Defines the problem clearly
- Lists all requirements
- Provides step-by-step plan
- Includes validation loops
- Contains executable examples

## Why Use PRPs?

### Traditional Approach (Error-Prone):
````
You: "Build a transcript service"
Claude: *builds something*
You: "That's not what I meant"
Claude: *rebuilds*
You: "Still wrong"
[repeat 10 times]
````

### PRP Approach (Efficient):
````
You: Create PRP for transcript service
    - Include dual-mode deployment
    - List all endpoints
    - Specify data models
    - Define validation steps

Claude: [Creates comprehensive PRP]

You: Review PRP → approve

Claude: [Builds exactly to spec]

You: Works first time ✓
````

## Core Principles

### 1. Context is King
**Include ALL necessary information:**
- Documentation links
- Code examples
- Caveats and gotchas
- File structure
- Dependencies

❌ Bad:
````
Build a FastAPI service for transcription.
````

✅ Good:
````
Build a FastAPI service for transcription.

References:
- FastAPI docs: https://fastapi.tiangolo.com
- Our service template: .context/03-MICROSERVICES/service-template.md
- Dual-mode pattern: .context/01-ARCHITECTURE/dual-mode-deployment.md

Gotchas:
- Must support both internal and external deployment
- Use Whisper API (not local model)
- Store with customer_id for isolation
- Include /health and /metrics endpoints

File structure:
transcript-processor-svc/
├── app.py
├── config/
│   ├── internal.yaml
│   └── external.yaml
└── tests/
````

### 2. Validation Loops
**Test at each step:**
````
Level 1: Syntax & Style
├─ ruff check . --fix
├─ mypy .
└─ Expected: No errors

Level 2: Unit Tests
├─ pytest tests/ -v
└─ Expected: All pass

Level 3: Integration Test
├─ Manual test with real audio
└─ Expected: Transcript generated
````

### 3. Information Dense
**Use keywords and patterns from codebase:**

❌ Vague:
````
Make the service work with different users.
````

✅ Specific:
````
Implement multi-tenancy:
- Every table includes customer_id column
- All queries filter by customer_id
- Use RLS policies in Supabase
- See: .context/04-PRODUCTIZATION/multi-tenant-architecture.md
````

### 4. Progressive Success
**Build incrementally:**
````
MVP (Week 1):
- Single endpoint: /v1/transcribe
- Internal mode only
- Whisper API integration
- Store in Supabase

V1 (Week 2):
- Add external mode support
- Add health/metrics endpoints
- Add error handling
- Deploy to Railway

V2 (Week 3):
- Add usage tracking
- Add rate limiting
- Optimize performance
- Add caching
````

## PRP Template Structure
````markdown
# PRP: [Service Name]

## Purpose
[One paragraph: What this builds and why]

## Core Principles
[List key constraints and patterns to follow]

## Goal
[Specific, measurable outcome]

## Why
- Business value
- Technical value
- Problems solved

## What
[Detailed description of what will be built]

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## All Needed Context

### Documentation & References
- URL/file 1: Why it's needed
- URL/file 2: Why it's needed

### Current Codebase Tree
[Show existing structure]

### Desired Codebase Tree
[Show what will be added]

### Known Gotchas & Library Quirks
[Critical things to watch out for]

## Implementation Blueprint

### Data Models
[Pydantic models, database schemas]

### List of Tasks
Task 1: [Description]
  - Step 1
  - Step 2
  
Task 2: [Description]
  - Step 1
  - Step 2

### Per Task Pseudocode
[Concrete code patterns to follow]

### Integration Points
[Where this connects to other systems]

## Validation Loop

### Level 1: Syntax & Style
[Commands to run]

### Level 2: Unit Tests
[Tests that must pass]

### Level 3: Integration Test
[Manual verification steps]

## Final Validation Checklist
- [ ] All tests pass
- [ ] Linting clean
- [ ] Type checking passes
- [ ] Manual test successful
- [ ] Documentation updated

## Anti-Patterns to Avoid
- ❌ Don't do X
- ❌ Don't do Y

## Confidence Score: X/10
[Reasoning for confidence level]
````

## Example: Minimal PRP
````markdown
# PRP: Add Health Check Endpoint

## Purpose
Add /health endpoint to existing transcript-processor-svc for monitoring.

## Goal
Service reports health status at /health endpoint.

## Success Criteria
- [ ] GET /health returns 200 when healthy
- [ ] Response includes uptime, version, dependencies status
- [ ] Grafana can scrape endpoint

## Implementation

### Code to Add
```python
# Add to app.py
from datetime import datetime

service_start_time = datetime.utcnow()

@app.get("/health")
async def health():
    uptime = (datetime.utcnow() - service_start_time).total_seconds()
    
    # Check dependencies
    checks = {
        "database": await check_database(),
        "whisper_api": await check_whisper_api()
    }
    
    all_healthy = all(status == "healthy" for status in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "uptime_seconds": uptime,
        "version": "1.0.0",
        "checks": checks
    }

async def check_database():
    try:
        await supabase.rpc("ping")
        return "healthy"
    except:
        return "unhealthy"

async def check_whisper_api():
    # Quick test call
    return "healthy"  # Simplified
```

## Validation
```bash
# Test endpoint
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "uptime_seconds": 12345,
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "whisper_api": "healthy"
  }
}
```

## Checklist
- [ ] Endpoint returns 200
- [ ] Response matches expected format
- [ ] Dependency checks work
- [ ] Grafana can scrape (test with curl)
````

## When to Create a PRP

**Create PRP for:**
- ✅ New microservice
- ✅ Major feature (>1 day of work)
- ✅ Complex integration
- ✅ Database migration
- ✅ Architecture change

**Don't create PRP for:**
- ❌ Tiny bug fix (<30 min)
- ❌ Documentation update
- ❌ Config change
- ❌ Code formatting

## Using PRPs with Claude Code

### In Cursor:
````
You: @.context/09-PRPS/transcript-processor-prp.md

Build this service following the PRP exactly.
Start with Task 1.
````

### Claude Code:
````
You: Read the PRP at .context/09-PRPS/transcript-processor-prp.md
     and implement Task 1: Core Service Setup
````

### Iterative Development:
````
You: Completed Task 1. Run validation.

Claude: [Runs linting, tests]
        All checks pass ✓
        
You: Proceed to Task 2.

Claude: [Implements Task 2]
````

## Key Differences from Traditional Specs

### Traditional Spec:
````
Requirements:
- Service must transcribe audio
- Service must handle errors
- Service must be scalable

[No implementation details]
````

### PRP:
````
Requirements:
- Service must transcribe audio
  → Using OpenAI Whisper API
  → Endpoint: POST /v1/transcribe
  → Input: {audio_url, language}
  → Example call provided
  → Error handling specified
  
- Service must be scalable
  → Deployed as Docker container
  → Horizontal scaling via Railway
  → Queue mode for async processing
  → Load balancing configuration shown
````

**PRP gives implementation details, not just requirements.**

## Summary

**PRPs are:**
- Detailed implementation guides
- Include all necessary context
- Provide validation loops
- Use concrete examples
- Build progressively

**Benefits:**
- Less back-and-forth with AI
- Clearer requirements
- Repeatable process
- Built-in validation
- Knowledge preservation

**Use for:**
- New services
- Major features
- Complex integrations
- Teaching others your system

See `.context/09-PRPS/prp-template.md` for full template.