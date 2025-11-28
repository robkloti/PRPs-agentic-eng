name: "Transcript Processor Microservice"
description: |
  Build the first GYST microservice: transcript-processor-svc

  Accepts audio files (URLs or uploads), transcribes them using VAPI/Retell,
  and supports dual-mode deployment (internal for agency use, external for SaaS).
  This service will be dogfooded with real client projects in Week 2.

## Purpose

Create a production-ready microservice that:
1. Accepts audio files and transcription requests
2. Calls transcription API (VAPI or Retell)
3. Stores results in Supabase
4. Works in both internal and external deployment modes
5. Tracks usage for billing (external mode only)
6. Can be orchestrated by n8n workflows

## Core Principles

1. **Dual-Mode from Day One**: Code written once, deploys to internal and external
2. **Dogfooding**: Use internal mode with real client projects immediately
3. **Type Safety**: Full type hints, Pydantic models from gyst-models
4. **Observable**: Structured logging, metrics, health checks
5. **Testable**: Unit, integration, and end-to-end tests included

---

## Goal

Create a working FastAPI microservice that:
- Accepts transcription requests via REST API
- Processes audio files via external transcription service
- Stores transcripts in Supabase with customer isolation
- Works in both internal and external deployment modes
- Can be called by n8n workflows
- Returns job status and results

## Why

**Business value:**
- Enables agency client projects (internal mode)
- Becomes productized SaaS offering (external mode)
- Single codebase = faster iteration
- Real client usage validates before public launch

**Technical value:**
- First microservice template for other services
- Demonstrates dual-mode pattern
- Tests n8n integration
- Validates Supabase schema

## What

A FastAPI service with these endpoints:

**Public (both modes):**
- `POST /transcribe` - Submit audio for transcription
- `GET /status/{job_id}` - Check job status
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

**Internal-only:**
- `GET /admin/jobs` - List all jobs (for debugging)

**Behaviors:**

Internal Mode:
- Auth: Simple X-Customer-ID header
- Billing: Disabled
- Limits: None
- Use case: Agency client projects

External Mode:
- Auth: API key validation
- Billing: Track usage events
- Limits: Rate limiting per plan
- Use case: SaaS customers

### Success Criteria
- [ ] Service starts in both modes
- [ ] Accepts transcription requests
- [ ] Can process test audio files
- [ ] Stores results in Supabase
- [ ] Tracks usage in external mode
- [ ] Can be called by n8n webhook
- [ ] All tests pass
- [ ] Works with real client audio file
- [ ] Health check endpoint responds
- [ ] Metrics endpoint returns data

---

## All Needed Context

### Documentation & References
````yaml
MUST READ:
- .context/00-PROJECT-OVERVIEW.md
  why: Understand dual-mode strategy and why we're building this

- .context/01-ARCHITECTURE/dual-mode-deployment.md
  why: Reference the dual-mode pattern you'll implement

- .context/09-PRPS/gyst-models-prp.md
  why: Models you'll use (TranscriptInput, TranscriptOutput)

- gyst-models package
  why: Import models from here: from gyst_models import TranscriptInput, TranscriptOutput

REFERENCE:
- FastAPI docs: https://fastapi.tiangolo.com/
- Pydantic docs: https://docs.pydantic.dev/
- Supabase docs: https://supabase.com/docs
- VAPI docs: https://docs.vapi.ai/ (or Retell docs)
````

### Current Codebase Tree
````bash
GYSTmicroservices/
├── .context/              # Documentation
├── .cursorrules           # Project rules
├── gyst-models/           # Shared models (WEEK 1 ✅)
└── [empty - ready for transcript-processor]
````

### Desired Codebase Tree (After Implementation)
````bash
GYSTmicroservices/
├── .context/
├── .cursorrules
├── gyst-models/           # Week 1 ✅
└── transcript-processor/                          # NEW
    ├── pyproject.toml                 # Package config
    ├── Dockerfile                     # Container image
    ├── docker-compose.yml             # Local development
    ├── README.md                      # Service docs
    ├── .env.example                   # Example env vars
    ├── config/
    │   ├── internal.yaml              # Internal mode config
    │   └── external.yaml              # External mode config
    ├── src/
    │   └── transcript_processor/
    │       ├── __init__.py
    │       ├── main.py                # FastAPI app
    │       ├── config.py              # Config loading
    │       ├── models.py              # Request/response models
    │       ├── database.py            # Supabase operations
    │       ├── transcriber.py         # VAPI/Retell integration
    │       ├── auth.py                # Auth middleware
    │       ├── billing.py             # Usage tracking
    │       ├── logging.py             # Structured logging
    │       └── health.py              # Health checks
    └── tests/
        ├── test_api.py                # API endpoint tests
        ├── test_auth.py               # Auth tests
        ├── test_modes.py              # Dual-mode tests
        ├── test_integration.py        # End-to-end tests
        └── conftest.py                # Test fixtures
````

### Known Gotchas & Implementation Notes

**Dual-Mode Pattern:**
````python
# In main.py, check mode at startup
import os
DEPLOYMENT_MODE = os.getenv("DEPLOYMENT_MODE", "internal")

# In endpoints, check mode for behavior
if DEPLOYMENT_MODE == "external":
    # Check API key, track usage, apply rate limits
    await validate_api_key(request)
    await track_usage(customer_id, "transcribe", cost=0.05)
else:
    # Simple customer_id from header
    customer_id = request.headers.get("X-Customer-ID")

# Core logic is 100% shared (no duplicates!)
result = await process_transcription(audio_url)
await save_to_database(customer_id, result)
````

**Customer Isolation:**
````sql
-- Every query MUST include customer_id
SELECT * FROM transcripts WHERE customer_id = $1 AND job_id = $2;

-- Never: SELECT * FROM transcripts WHERE job_id = $1;
-- This breaks multi-tenant isolation!
````

**Async/Await:**
````python
# Use async for all I/O (database, HTTP calls, file operations)
async def process_transcription(audio_url: str) -> TranscriptOutput:
    # These should all be async
    result = await call_vapi_api(audio_url)
    await save_to_database(result)
    await track_usage()
    return result
````

**Error Handling:**
````python
# Don't catch all exceptions - be specific
try:
    result = await call_vapi_api(audio_url)
except VAPITimeoutError:
    # Handle timeout specifically
    return BaseError(error_code="TRANSCRIPTION_TIMEOUT", ...)
except VAPIAuthError:
    # Handle auth failure specifically
    return BaseError(error_code="TRANSCRIPTION_AUTH_FAILED", ...)
# Don't: except Exception: pass
````

**Environment Variables:**
````python
# Never hardcode API keys or secrets
# Use environment variables with validation

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    deployment_mode: str = "internal"  # DEPLOYMENT_MODE env var
    vapi_api_key: str  # VAPI_API_KEY env var (required)
    supabase_url: str  # SUPABASE_URL env var
    supabase_key: str  # SUPABASE_KEY env var

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
````

---

## Implementation Blueprint

### Architecture Overview

```
Request
  ↓
  ├─→ Auth Middleware
  │    ├─ Internal: Extract customer_id from header
  │    └─ External: Validate API key
  ↓
  ├─→ Request Validation (Pydantic)
  │    ├─ Check audio_url is valid
  │    └─ Check language code
  ↓
  ├─→ Call Transcription API (VAPI/Retell)
  │    ├─ Submit audio for processing
  │    └─ Get job_id back
  ↓
  ├─→ Save to Database (Supabase)
  │    ├─ Store with customer_id
  │    └─ Index by job_id
  ↓
  ├─→ (External Mode Only) Track Usage
  │    ├─ Record cost
  │    └─ Send to billing service
  ↓
  └─→ Return Response
       ├─ job_id
       ├─ status
       └─ webhook (if requested)
```

### Core Files & Implementation

**1. config.py - Load configuration based on deployment mode**
````python
import os
import yaml
from pathlib import Path

DEPLOYMENT_MODE = os.getenv("DEPLOYMENT_MODE", "internal")

# Load appropriate config file
config_file = f"config/{DEPLOYMENT_MODE}.yaml"
with open(config_file) as f:
    config = yaml.safe_load(f)

# Example internal config:
# auth:
#   type: header  # X-Customer-ID header
# billing:
#   enabled: false
# limits:
#   requests_per_minute: null  # No limit

# Example external config:
# auth:
#   type: api_key  # Validate against database
# billing:
#   enabled: true
# limits:
#   requests_per_minute: 100
````

**2. main.py - FastAPI application**
````python
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from gyst_models import TranscriptInput, TranscriptOutput, BaseResponse, BaseError
import logging
import os

app = FastAPI(title="Transcript Processor", version="1.0.0")

DEPLOYMENT_MODE = os.getenv("DEPLOYMENT_MODE", "internal")

# Structured logging
logging.basicConfig(
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    logger.info(f"Starting transcript-processor in {DEPLOYMENT_MODE} mode")
    # Initialize Supabase, VAPI client, etc.

@app.get("/health")
async def health_check():
    return {"status": "healthy", "mode": DEPLOYMENT_MODE}

@app.post("/transcribe")
async def transcribe(request: TranscriptInput, req: Request) -> BaseResponse:
    """Submit audio file for transcription."""

    # 1. Auth (mode-dependent)
    if DEPLOYMENT_MODE == "external":
        customer_id = await validate_api_key(req)
    else:
        customer_id = req.headers.get("X-Customer-ID")

    # 2. Validate request (Pydantic already did this)

    # 3. Call transcription API
    vapi_response = await call_vapi(request.audio_url)
    job_id = vapi_response["job_id"]

    # 4. Save to database
    await save_transcript_job(
        job_id=job_id,
        customer_id=customer_id,
        audio_url=request.audio_url,
        status="processing"
    )

    # 5. Track usage (external mode only)
    if DEPLOYMENT_MODE == "external":
        await track_usage(
            customer_id=customer_id,
            service_name="transcript-processor",
            action="transcribe",
            cost=0.05
        )

    # 6. Return response
    return BaseResponse(
        status="processing",
        job_id=job_id,
        correlation_id=req.headers.get("X-Correlation-ID")
    )

@app.get("/status/{job_id}")
async def get_status(job_id: str, req: Request) -> TranscriptOutput:
    """Check transcription status."""

    # Auth
    customer_id = await get_customer_id(req)

    # Get from database (must check customer_id!)
    result = await get_transcript_job(job_id, customer_id)

    if not result:
        return BaseError(
            error_code="NOT_FOUND",
            message=f"Job {job_id} not found"
        )

    return TranscriptOutput(**result)

@app.get("/metrics")
async def metrics():
    """Prometheus metrics."""
    # Return metrics in Prometheus format
    pass
````

**3. auth.py - Authentication logic**
````python
async def validate_api_key(request: Request) -> str:
    """Validate API key and return customer_id."""

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthError("Missing API key")

    api_key = auth_header[7:]  # Remove "Bearer "

    # Look up in database
    customer = await supabase.from_("customers").select("id").eq("api_key", api_key).single()

    if not customer:
        raise AuthError("Invalid API key")

    return customer["id"]

async def get_customer_id(request: Request) -> str:
    """Get customer ID based on deployment mode."""

    if DEPLOYMENT_MODE == "external":
        return await validate_api_key(request)
    else:
        customer_id = request.headers.get("X-Customer-ID")
        if not customer_id:
            raise AuthError("Missing X-Customer-ID header")
        return customer_id
````

**4. database.py - Supabase operations**
````python
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

async def save_transcript_job(job_id: str, customer_id: str, audio_url: str, status: str):
    """Save transcription job to database."""

    await supabase.from_("transcripts").insert({
        "job_id": job_id,
        "customer_id": customer_id,  # CRITICAL: Always include
        "audio_url": audio_url,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

async def get_transcript_job(job_id: str, customer_id: str):
    """Get transcript job - must check customer_id!"""

    result = await supabase.from_("transcripts").select("*").eq("job_id", job_id).eq("customer_id", customer_id).single()
    return result
````

**5. transcriber.py - VAPI/Retell integration**
````python
import httpx
import os

VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_BASE_URL = "https://api.vapi.ai"

async def call_vapi(audio_url: str, language: str = "en") -> dict:
    """Submit audio to VAPI for transcription."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{VAPI_BASE_URL}/transcribe",
            headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
            json={
                "audioUrl": audio_url,
                "language": language
            },
            timeout=30.0
        )

    if response.status_code != 200:
        raise VAPIError(f"VAPI error: {response.text}")

    return response.json()
````

**6. billing.py - Usage tracking**
````python
import os
from gyst_models import UsageEvent
from datetime import datetime, timezone

async def track_usage(
    customer_id: str,
    service_name: str = "transcript-processor",
    action: str = "transcribe",
    cost: float = 0.05
):
    """Track usage for billing (external mode only)."""

    if os.getenv("DEPLOYMENT_MODE") != "external":
        return  # Don't track internal usage

    event = UsageEvent(
        customer_id=customer_id,
        service_name=service_name,
        service_action=action,
        cost_usd=cost,
        timestamp=datetime.now(timezone.utc)
    )

    # Send to billing service (via message queue or HTTP)
    # For now, just log it
    print(f"Usage tracked: {event.model_dump_json()}")
````

### List of Tasks to be Completed

````yaml
Task 1: Project Setup
  Description: Create directory structure and configuration files
  Steps:
    - Create transcript-processor/ directory
    - Create config/ subdirectory
    - Create src/transcript_processor/ package
    - Create tests/ directory
    - Create pyproject.toml
    - Create README.md
    - Create Dockerfile
    - Create docker-compose.yml
    - Create .env.example
    - Create config/internal.yaml
    - Create config/external.yaml

  Validation:
    - Directory structure matches desired tree
    - Config files are valid YAML
    - pyproject.toml is valid TOML

Task 2: Core Models & Imports
  Description: Set up request/response models and imports
  Steps:
    - Create src/transcript_processor/models.py
    - Import from gyst_models (TranscriptInput, TranscriptOutput)
    - Define any service-specific request/response models
    - Import FastAPI, Pydantic, etc.

  Validation:
    - Can import from gyst_models
    - Models have proper type hints
    - No circular imports

Task 3: Configuration System
  Description: Load config based on deployment mode
  Steps:
    - Create src/transcript_processor/config.py
    - Load config/internal.yaml or config/external.yaml
    - Create ConfigDict for settings
    - Validate required environment variables

  Validation:
    - Config loads for both modes
    - Environment variables validated
    - Can access config.deployment_mode, config.auth_type, etc.

Task 4: Supabase Integration
  Description: Set up database operations
  Steps:
    - Create src/transcript_processor/database.py
    - Initialize Supabase client
    - Implement save_transcript_job()
    - Implement get_transcript_job()
    - Implement list_jobs_for_customer()
    - Add error handling for missing records

  Validation:
    - Can connect to Supabase
    - Can save and retrieve transcript jobs
    - Customer_id isolation works
    - Queries include customer_id

Task 5: Authentication System
  Description: Implement internal and external auth
  Steps:
    - Create src/transcript_processor/auth.py
    - Implement validate_api_key() for external mode
    - Implement get_customer_id() for both modes
    - Create AuthError exception
    - Add auth to all endpoints

  Validation:
    - Internal mode: X-Customer-ID header works
    - External mode: API key validation works
    - Missing auth returns 401
    - Invalid auth returns 403

Task 6: VAPI/Retell Integration
  Description: Implement transcription API calls
  Steps:
    - Create src/transcript_processor/transcriber.py
    - Implement call_vapi() function
    - Handle VAPI responses
    - Implement error handling
    - Add retry logic

  Validation:
    - Can call VAPI API
    - Returns job_id
    - Handles errors gracefully
    - Timeouts work

Task 7: Billing & Usage Tracking
  Description: Track usage for external mode
  Steps:
    - Create src/transcript_processor/billing.py
    - Implement track_usage() function
    - Create UsageEvent records
    - Only track in external mode

  Validation:
    - Usage tracked in external mode only
    - UsageEvent data correct
    - Can be sent to billing service

Task 8: FastAPI Application
  Description: Create main application with endpoints
  Steps:
    - Create src/transcript_processor/main.py
    - Implement startup/shutdown events
    - Implement POST /transcribe endpoint
    - Implement GET /status/{job_id} endpoint
    - Implement GET /health endpoint
    - Implement GET /metrics endpoint
    - Add error handlers

  Validation:
    - App starts without errors
    - All endpoints respond correctly
    - Health check works
    - Errors return proper status codes

Task 9: Logging & Observability
  Description: Add structured logging and metrics
  Steps:
    - Create src/transcript_processor/logging.py
    - Set up structured JSON logging
    - Add correlation IDs to requests
    - Add request/response logging
    - Add Prometheus metrics

  Validation:
    - Logs are structured JSON
    - Correlation IDs present in logs
    - Metrics endpoint returns data

Task 10: Unit Tests
  Description: Test individual components
  Steps:
    - Create tests/test_auth.py
    - Create tests/test_database.py
    - Create tests/test_transcriber.py
    - Test auth logic for both modes
    - Test database operations
    - Test VAPI integration

  Validation:
    - All unit tests pass
    - Auth tests cover both modes
    - Database tests verify customer_id isolation

Task 11: Integration Tests
  Description: Test endpoints and full flow
  Steps:
    - Create tests/test_api.py
    - Test /transcribe endpoint (both modes)
    - Test /status endpoint
    - Test /health endpoint
    - Test error scenarios

  Validation:
    - All integration tests pass
    - Both mode tests pass separately

Task 12: End-to-End Tests
  Description: Test with real audio files
  Steps:
    - Create tests/test_e2e.py
    - Create test audio file
    - Test full transcription flow
    - Verify results in Supabase

  Validation:
    - Can transcribe test audio
    - Results saved correctly
    - Can retrieve status
    - Real client audio works

Task 13: Docker & Deployment
  Description: Create Docker image and deployment configs
  Steps:
    - Create Dockerfile
    - Create docker-compose.yml for local development
    - Create docker-compose.prod.yml for production
    - Test Docker build
    - Test Docker run

  Validation:
    - Docker image builds
    - Service runs in container
    - Can connect to Supabase from container

Task 14: Documentation
  Description: Document the service
  Steps:
    - Create comprehensive README.md
    - Document all endpoints
    - Document configuration
    - Document deployment instructions
    - Document how to use from n8n

  Validation:
    - README is clear and complete
    - All endpoints documented
    - Examples are copy-pasteable

Task 15: Final Validation
  Description: End-to-end validation
  Steps:
    - Run all tests: pytest tests/ -v
    - Run linting: ruff check src/
    - Run type checking: mypy src/
    - Test both modes separately
    - Test with real client workflow

  Validation:
    - All tests pass
    - Linting passes
    - Type checking passes
    - Both modes work
    - Ready for deployment
````

---

## Validation Loop

### Level 1: Syntax & Style
````bash
# After implementing code
cd transcript-processor

# Install dependencies
pip install -e ".[dev]"

# Linting
ruff check src/

# Type checking
mypy src/

# Expected: No errors
````

### Level 2: Unit Tests
````bash
# Run all unit tests
pytest tests/test_auth.py tests/test_database.py tests/test_transcriber.py -v

# With coverage
pytest tests/ -v --cov=src/transcript_processor --cov-report=term-missing

# Expected: 80%+ coverage, all tests pass
````

### Level 3: Integration Tests
````bash
# Test with live service (need .env with real credentials)
pytest tests/test_api.py -v

# Test both modes
DEPLOYMENT_MODE=internal pytest tests/test_api.py::test_transcribe_internal -v
DEPLOYMENT_MODE=external pytest tests/test_api.py::test_transcribe_external -v

# Expected: Both modes pass separately
````

### Level 4: End-to-End Test
````bash
# Start service locally
docker-compose up -d

# Test with curl
curl -X POST http://localhost:8000/transcribe \
  -H "X-Customer-ID: test-client-123" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/test.mp3",
    "language": "en"
  }'

# Expected: Returns job_id and status: processing

# Check status
curl http://localhost:8000/status/JOB_ID_FROM_ABOVE \
  -H "X-Customer-ID: test-client-123"

# Expected: Returns transcript when ready

# Health check
curl http://localhost:8000/health

# Expected: {"status": "healthy", "mode": "internal"}
````

### Level 5: Real Client Test
````bash
# With real audio from client project
# Test transcription in internal mode
DEPLOYMENT_MODE=internal docker-compose up

# Submit real audio
curl -X POST http://localhost:8000/transcribe \
  -H "X-Customer-ID: CLIENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://s3.amazonaws.com/client-bucket/call.mp3"
  }'

# Wait for transcription
# Check results in Supabase
# Verify accuracy with client

# Expected: Client confirms transcript is accurate
````

---

## Final Validation Checklist

- [ ] Directory structure complete
- [ ] Dependencies installed
- [ ] Supabase schema applied
- [ ] Config files valid YAML
- [ ] Environment variables documented
- [ ] Code linting passes (ruff)
- [ ] Type checking passes (mypy)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Both modes tested separately
- [ ] Docker image builds and runs
- [ ] Service can connect to Supabase
- [ ] Service can call VAPI API
- [ ] Auth works for both modes
- [ ] Customer_id isolation verified
- [ ] Usage tracking works (external mode)
- [ ] Health check endpoint responds
- [ ] Metrics endpoint returns data
- [ ] Can be called by n8n webhook
- [ ] Real client audio transcribes correctly
- [ ] Results stored in Supabase
- [ ] Status can be retrieved
- [ ] README is complete
- [ ] Ready for deployment

---

## Anti-Patterns to Avoid

- ❌ Don't hardcode API keys or secrets - use environment variables
- ❌ Don't skip customer_id in database queries - breaks multi-tenant isolation
- ❌ Don't catch all exceptions - be specific
- ❌ Don't use synchronous code for I/O - use async/await
- ❌ Don't duplicate dual-mode logic - write once, share
- ❌ Don't forget to validate environment variables at startup
- ❌ Don't skip type hints - use mypy to verify
- ❌ Don't hardcode config - load from files
- ❌ Don't skip error handling for external API calls
- ❌ Don't deploy without testing both modes

---

## Confidence Score: 8/10

**High confidence because:**
- Clear, well-defined scope
- Existing gyst-models provides models
- Existing Supabase schema known
- VAPI/Retell APIs documented
- FastAPI is mature and well-documented
- Dual-mode pattern clearly defined

**Lower than 10/10 because:**
- VAPI/Retell integration depends on their API (could have changes)
- Real client audio quality varies
- Transcription quality depends on service

---

## Timeline

**Week 2 (4-5 days):**
- Day 1: Tasks 1-3 (Setup, models, config)
- Day 2: Tasks 4-6 (Database, auth, transcriber)
- Day 3: Tasks 7-9 (Billing, API, logging)
- Day 4: Tasks 10-12 (Tests, including real client test)
- Day 5: Tasks 13-15 (Docker, docs, final validation)

---

## What Success Looks Like

✅ Service runs in both internal and external modes
✅ Real client project uses internal mode successfully
✅ Transcripts saved correctly in Supabase
✅ Usage tracked in external mode
✅ Can be called by n8n workflows
✅ All tests pass
✅ Type checking passes
✅ Linting passes
✅ Ready to scale to other microservices (embedding-svc, lead-qualifier, etc.)

---

# 🚀 Ready to Build Week 2!

## Next Steps:

1. **Copy this entire PRP**
2. **Save it to:** `.context/09-PRPS/transcript-processor-prp.md`
3. **In Cursor, start a chat:**
````
@.context/00-PROJECT-OVERVIEW.md
@.context/09-PRPS/transcript-processor-prp.md

I need you to build the transcript-processor service following this PRP exactly.

Start with Task 1: Project Setup.

After each task, show what you created and run the validation steps.
Wait for approval before moving to the next task.

Let's begin!
````

---

## Success Path

✅ Week 1: gyst-models (shared package)
→ Week 2: transcript-processor (first microservice) ← YOU ARE HERE
→ Week 3: api-gateway + embedding-svc
→ Week 4: billing-svc + customer-dashboard + website

Good luck! 🚀
