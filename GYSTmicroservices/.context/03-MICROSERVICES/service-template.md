# Service Template Guide

## Overview

Every microservice follows the same structure and patterns.
This ensures consistency, maintainability, and easy onboarding.

## Standard Service Structure
````
service-name-svc/
├── app.py                      # Main FastAPI application
├── config/
│   ├── internal.yaml           # Internal mode configuration
│   └── external.yaml           # External mode configuration
├── core/
│   └── processor.py            # Core business logic (mode-agnostic)
├── auth/
│   ├── internal.py             # Internal authentication
│   └── external.py             # External authentication (API keys)
├── models/                     # Local models (if not in gyst-models)
│   └── __init__.py
├── tests/
│   ├── test_internal_mode.py
│   ├── test_external_mode.py
│   └── test_core_logic.py
├── Dockerfile
├── docker-compose.internal.yml
├── docker-compose.external.yml
├── requirements.txt
├── .env.example
└── README.md
````

## Required Endpoints

Every service MUST implement these endpoints:

### 1. Health Check
````python
@app.get("/health")
async def health():
    """
    Health check for monitoring systems.
    Returns 200 if healthy, 503 if unhealthy.
    """
    uptime = (datetime.utcnow() - service_start_time).total_seconds()
    
    checks = {
        "database": await check_database(),
        "external_apis": await check_external_apis()
    }
    
    all_healthy = all(s == "healthy" for s in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "uptime_seconds": uptime,
        "version": "1.0.0",
        "checks": checks
    }
````

### 2. Metrics
````python
@app.get("/metrics/json")
async def metrics():
    """
    Metrics in JSON format for easy consumption.
    Prometheus format also available at /metrics.
    """
    return {
        "service": "service-name",
        "mode": MODE.value,
        "uptime_seconds": uptime,
        "total_requests": state.total_requests,
        "total_errors": state.total_errors,
        "timestamp": datetime.utcnow().isoformat()
    }
````

### 3. Business Endpoints
````python
@app.post("/v1/action")
async def business_action(
    payload: InputModel,
    request: Request
):
    """
    Main business logic endpoint.
    
    Pattern:
    1. Authenticate (mode-specific)
    2. Check limits (external mode only)
    3. Process (mode-agnostic)
    4. Track usage (external mode only)
    5. Return result
    """
    # Step 1: Authenticate
    customer = await authenticate_request(request)
    
    # Step 2: Check limits
    if MODE == DeploymentMode.EXTERNAL:
        await check_usage_limits(customer)
    
    # Step 3: Process
    result = await process_core_logic(payload, customer.id)
    
    # Step 4: Track
    if MODE == DeploymentMode.EXTERNAL:
        await track_usage(customer.id, "action", cost)
    
    # Step 5: Return
    return result
````

## Core Patterns

### Pattern 1: Dual-Mode Authentication
````python
async def authenticate_request(request: Request) -> Customer:
    """Route to appropriate auth based on deployment mode"""
    if MODE == DeploymentMode.INTERNAL:
        return await authenticate_internal(request)
    else:
        return await authenticate_external(request)

async def authenticate_internal(request: Request) -> Customer:
    """Internal: Simple token + customer_id header"""
    token = request.headers.get("X-Internal-Token")
    if token != os.getenv("INTERNAL_TOKEN"):
        raise HTTPException(401, "Invalid token")
    
    customer_id = request.headers.get("X-Customer-ID", "internal")
    return Customer(id=customer_id, mode="internal")

async def authenticate_external(request: Request) -> Customer:
    """External: API key validation via gateway"""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "API key required")
    
    customer = await validate_api_key(api_key)
    return customer
````

### Pattern 2: Customer Data Isolation
````python
# ALWAYS include customer_id in database operations

# ❌ BAD - No isolation
async def get_transcripts():
    return await db.transcripts.select("*")

# ✅ GOOD - Customer isolated
async def get_transcripts(customer_id: str):
    return await db.transcripts \
        .select("*") \
        .eq("customer_id", customer_id) \
        .execute()

# ❌ BAD - Forgot customer_id
async def create_transcript(text: str):
    return await db.transcripts.insert({
        "text": text
    })

# ✅ GOOD - Always include customer_id
async def create_transcript(customer_id: str, text: str):
    return await db.transcripts.insert({
        "customer_id": customer_id,  # CRITICAL
        "text": text
    })
````

### Pattern 3: Structured Logging
````python
import json
import logging

logger = logging.getLogger(__name__)

def log_event(event: str, **kwargs):
    """Structured logging for easy querying"""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "service": "service-name",
        "mode": MODE.value,
        "event": event,
        **kwargs
    }
    logger.info(json.dumps(log_data))

# Usage
log_event("processing_started",
    customer_id=customer.id,
    correlation_id=correlation_id,
    input_size=len(payload.text)
)
````

### Pattern 4: Error Handling
````python
@app.post("/v1/action")
async def action(payload: InputModel, request: Request):
    correlation_id = request.headers.get("X-Correlation-ID", f"req-{time.time()}")
    
    try:
        customer = await authenticate_request(request)
        result = await process(payload, customer.id)
        
        log_event("success",
            correlation_id=correlation_id,
            customer_id=customer.id
        )
        
        return result
        
    except HTTPException:
        # Let FastAPI handle HTTP exceptions
        raise
        
    except Exception as e:
        # Log and convert to HTTP exception
        log_event("error",
            correlation_id=correlation_id,
            error=str(e),
            error_type=type(e).__name__
        )
        
        raise HTTPException(500, f"Internal error: {str(e)}")
````

## Configuration Files

### config/internal.yaml
````yaml
deployment:
  mode: internal
  name: "Service Name (Internal)"

authentication:
  type: internal_token
  token_env: INTERNAL_TOKEN

features:
  usage_tracking: false
  rate_limiting: false
  billing: false
  custom_features: true

database:
  customer_isolation: true

monitoring:
  detailed_logs: true
````

### config/external.yaml
````yaml
deployment:
  mode: external
  name: "Service Name (Public API)"

authentication:
  type: api_key
  gateway_url: https://auth.gyst.com

features:
  usage_tracking: true
  rate_limiting: true
  billing: true
  custom_features: false

limits:
  free_tier:
    requests_per_month: 10
  starter_tier:
    requests_per_month: 100
  pro_tier:
    requests_per_month: 1000

database:
  customer_isolation: true

monitoring:
  detailed_logs: false
````

## Docker Setup

### Dockerfile
````dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
````    

### docker-compose.internal.yml
````yaml
version: '3.8'

services:
  service-name:
    build: .
    environment:
      - CONFIG_FILE=config/internal.yaml
      - INTERNAL_TOKEN=${INTERNAL_TOKEN}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    ports:
      - "8000:8000"
    restart: always
````

## Testing Standards

### Test Structure
````python
# tests/test_internal_mode.py
import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.fixture
def internal_client():
    os.environ["CONFIG_FILE"] = "config/internal.yaml"
    return TestClient(app)

def test_internal_auth(internal_client):
    response = internal_client.post(
        "/v1/action",
        headers={"X-Internal-Token": "test-token"},
        json={"data": "test"}
    )
    assert response.status_code == 200

def test_internal_no_limits(internal_client):
    # Internal mode should have no limits
    for i in range(1000):
        response = internal_client.post(
            "/v1/action",
            headers={"X-Internal-Token": "test-token"},
            json={"data": f"test-{i}"}
        )
        assert response.status_code == 200
````

## README Template
````markdown
# Service Name

Brief description of what this service does.

## Deployment Modes

### Internal Mode
For agency client integrations.
- Unlimited usage
- Simple token auth
- Custom features enabled

### External Mode
For public SaaS customers.
- Metered usage
- API key auth
- Generic features only

## Quick Start

### Internal Deployment
```bash
docker-compose -f docker-compose.internal.yml up
```

### External Deployment
```bash
docker-compose -f docker-compose.external.yml up
```

## API Documentation

See `/docs` when service is running.

## Environment Variables

Required:
- `CONFIG_FILE` - Path to config file
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase API key

Internal mode:
- `INTERNAL_TOKEN` - Secret token for internal auth

External mode:
- `AUTH_GATEWAY_URL` - URL to auth-gateway-svc

## Testing
```bash
pytest tests/ -v
```
````

## Checklist for New Service

When creating a new service, ensure:

- [ ] Follows standard directory structure
- [ ] Implements /health endpoint
- [ ] Implements /metrics endpoint
- [ ] Supports both internal and external modes
- [ ] Always includes customer_id in database operations
- [ ] Uses structured logging
- [ ] Has config files for both modes
- [ ] Has Dockerfile and docker-compose files
- [ ] Has tests for both modes
- [ ] Has README with deployment instructions
- [ ] Uses gyst-models package for shared types
- [ ] Registers itself in services table on startup

## See Also

- `.context/01-ARCHITECTURE/dual-mode-deployment.md` - Dual-mode pattern details
- `.context/07-EXAMPLES/dual-mode-service-complete.py` - Complete working example
- `.context/05-DATABASE/complete-schema.sql` - Database schema