# Dual-Mode Deployment Architecture

## The Core Concept

**Build ONE service. Deploy TWO ways.**
````
┌─────────────────────────────────────────────────────┐
│         SINGLE CODEBASE                             │
│         transcript-processor-svc                     │
└─────────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴──────────┐
        ↓                      ↓
┌──────────────────┐   ┌──────────────────┐
│  INTERNAL MODE   │   │  EXTERNAL MODE   │
├──────────────────┤   ├──────────────────┤
│ For: Agency      │   │ For: Public SaaS │
│ Auth: Token      │   │ Auth: API Keys   │
│ Billing: No      │   │ Billing: Yes     │
│ Limits: No       │   │ Limits: Yes      │
│ Custom: Yes      │   │ Custom: No       │
└──────────────────┘   └──────────────────┘
````

## Why This Approach?

### ✅ Benefits

**1. Single Source of Truth**
````python
# Fix bug once
def process_transcript(audio_url):
    # Bug was here
    result = whisper.transcribe(audio_url, fix_applied=True)
    # Both internal AND external get the fix
    return result
````

**2. Dogfooding**
````
You: "Let's use this for Client XYZ"
       ↓
[Test in production with real client]
       ↓
[Find edge cases, fix bugs]
       ↓
[Service is now battle-tested]
       ↓
External customers: "Wow this works great!"
````

**3. Feature Graduation**
````
Week 1: Build speaker diarization for Client A (internal)
Week 2: Client A loves it, using daily
Week 3: Enable for external customers
Week 4: New revenue stream from existing feature
````

**4. Simplified Ops**
````bash
# Same Docker image
docker build -t transcript-processor:v1.2.0 .

# Deploy internal
docker run -e DEPLOYMENT_MODE=internal transcript-processor:v1.2.0

# Deploy external (same image!)
docker run -e DEPLOYMENT_MODE=external transcript-processor:v1.2.0
````

### ❌ Alternative: Two Codebases (DON'T DO THIS)
````
transcript-processor-internal/    ← Codebase 1
transcript-processor-saas/        ← Codebase 2

Problems:
- Fix bug? Do it twice
- Add feature? Do it twice
- Update dependency? Do it twice
- Deploy? Two pipelines
- Tests? Two suites
- Documentation? Two sets

Result: 2x work, 2x bugs, 2x maintenance
````

## Implementation Pattern

### Environment-Based Configuration
````python
# app.py - Single service, dual behavior

import os
from enum import Enum

class DeploymentMode(Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"

# Set via environment variable
MODE = DeploymentMode(os.getenv("DEPLOYMENT_MODE", "internal"))

# OR use config files
if os.getenv("CONFIG_FILE"):
    config = load_yaml(os.getenv("CONFIG_FILE"))
    MODE = DeploymentMode(config["deployment"]["mode"])
````

### Authentication Layer
````python
async def authenticate_request(request: Request):
    """Authentication varies by deployment mode"""
    
    if MODE == DeploymentMode.INTERNAL:
        # Internal: Simple token validation
        token = request.headers.get("X-Internal-Token")
        if token != os.getenv("INTERNAL_TOKEN"):
            raise HTTPException(401, "Invalid internal token")
        
        # Customer ID passed explicitly
        customer_id = request.headers.get("X-Customer-ID", "internal")
        return {"id": customer_id, "mode": "internal"}
    
    else:  # EXTERNAL
        # External: API key validation via auth service
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            raise HTTPException(401, "API key required")
        
        # Validate with auth-gateway-svc
        customer = await validate_api_key(api_key)
        return customer
````

### Business Logic Layer
````python
async def process_transcript_core(
    audio_url: str,
    language: str,
    customer_id: str,
    **options
):
    """
    Core business logic - IDENTICAL for both modes.
    This is 90% of your code.
    """
    
    # 1. Download audio
    audio_file = await download_audio(audio_url)
    
    # 2. Call Whisper API
    transcript = await call_whisper_api(
        audio_file,
        language=language,
        **options  # Can include custom features
    )
    
    # 3. Store result (with customer isolation)
    result_id = await store_transcript(
        customer_id=customer_id,  # ALWAYS isolated
        text=transcript["text"],
        metadata={
            "audio_url": audio_url,
            "duration": transcript["duration"],
            "language": language
        }
    )
    
    # 4. Upload to storage
    storage_url = await upload_to_storage(
        customer_id=customer_id,
        transcript_id=result_id,
        content=transcript["text"]
    )
    
    return {
        "transcript_id": result_id,
        "text_url": storage_url,
        "duration": transcript["duration"],
        "word_count": len(transcript["text"].split())
    }
````

### API Endpoint (Combines Auth + Logic)
````python
@app.post("/v1/transcribe")
async def transcribe(
    payload: TranscriptInput,
    request: Request
):
    """
    Main endpoint - handles both internal and external requests.
    """
    
    # Step 1: Authenticate (mode-specific)
    customer = await authenticate_request(request)
    
    # Step 2: Check limits (external only)
    if MODE == DeploymentMode.EXTERNAL:
        usage = await get_usage(customer["id"])
        limit = customer["plan"]["transcripts_per_month"]
        
        if usage["transcripts"] >= limit:
            raise HTTPException(429, {
                "error": "Usage limit exceeded",
                "usage": usage["transcripts"],
                "limit": limit,
                "upgrade_url": "https://dashboard.gyst.com/billing"
            })
    
    # Step 3: Process (SAME for both)
    result = await process_transcript_core(
        audio_url=payload.audio_url,
        language=payload.language,
        customer_id=customer["id"],
        # Internal mode can pass custom options
        **payload.options if MODE == DeploymentMode.INTERNAL else {}
    )
    
    # Step 4: Track usage (external only)
    if MODE == DeploymentMode.EXTERNAL:
        await track_usage(
            customer_id=customer["id"],
            service="transcribe",
            quantity=1,
            cost=calculate_cost(result["duration"])
        )
        
        # Add usage info to response
        remaining = limit - (usage["transcripts"] + 1)
        result["credits_remaining"] = remaining
    
    # Step 5: Return
    return result
````

## Config File Approach

### config/internal.yaml
````yaml
deployment:
  mode: internal
  name: "GYST Internal Transcript Service"
  environment: production

authentication:
  type: internal_token
  token_env: INTERNAL_TOKEN
  require_customer_id_header: true

features:
  usage_tracking: false
  rate_limiting: false
  billing: false
  custom_features: true  # Allow client-specific features
  
limits:
  max_audio_length_seconds: null  # No limit
  concurrent_requests: null  # No limit
  
database:
  customer_isolation: true  # Still isolate data by customer_id
  
monitoring:
  detailed_logs: true
  include_customer_data: true  # OK for internal
  
integrations:
  whisper_api:
    model: "whisper-1"
    language_detection: true
  supabase:
    store_transcripts: true
    table: "transcripts"
````

### config/external.yaml
````yaml
deployment:
  mode: external
  name: "TranscriptAI Public API"
  environment: production

authentication:
  type: api_key
  validate_via: api_gateway_svc
  gateway_url: https://auth.gyst.com
  
features:
  usage_tracking: true
  rate_limiting: true
  billing: true
  custom_features: false  # Generic features only
  
limits:
  free_tier:
    max_audio_length_seconds: 600  # 10 min
    transcripts_per_month: 10
    rate_limit_per_minute: 5
  
  starter_tier:
    max_audio_length_seconds: 3600  # 1 hour
    transcripts_per_month: 100
    rate_limit_per_minute: 20
  
  pro_tier:
    max_audio_length_seconds: 7200  # 2 hours
    transcripts_per_month: 1000
    rate_limit_per_minute: 100

database:
  customer_isolation: true
  
monitoring:
  detailed_logs: false  # Privacy
  include_customer_data: false  # Don't log customer data
  
integrations:
  whisper_api:
    model: "whisper-1"
    language_detection: true
  supabase:
    store_transcripts: true
    table: "transcripts"
  stripe:
    enabled: true
    webhook_secret_env: STRIPE_WEBHOOK_SECRET
````

### Loading Config
````python
import yaml

def load_config():
    config_file = os.getenv("CONFIG_FILE", "config/internal.yaml")
    with open(config_file) as f:
        return yaml.safe_load(f)

config = load_config()

# Use throughout service
if config["features"]["usage_tracking"]:
    await track_usage(...)

if config["features"]["rate_limiting"]:
    await check_rate_limit(...)
````

## Deployment Examples

### Docker Compose - Internal
````yaml
# docker-compose.internal.yml
version: '3.8'

services:
  transcript-processor:
    build: .
    environment:
      - CONFIG_FILE=config/internal.yaml
      - INTERNAL_TOKEN=${INTERNAL_TOKEN}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "8000:8000"
    restart: always
````
````bash
# Deploy internal instance
docker-compose -f docker-compose.internal.yml up -d

# Access at: http://internal.gyst.com
````

### Docker Compose - External
````yaml
# docker-compose.external.yml
version: '3.8'

services:
  transcript-processor:
    build: .
    environment:
      - CONFIG_FILE=config/external.yaml
      - AUTH_GATEWAY_URL=https://auth.gyst.com
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    ports:
      - "8000:8000"
    restart: always
````
````bash
# Deploy external instance
docker-compose -f docker-compose.external.yml up -d

# Access at: https://api.transcriptai.com
````

## Data Isolation

**CRITICAL:** Both modes MUST isolate data by customer_id.
````sql
-- Every table MUST have customer_id
CREATE TABLE transcripts (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,  -- ALWAYS include
    transcript_text TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast customer queries
CREATE INDEX idx_transcripts_customer ON transcripts(customer_id);

-- Row-Level Security ensures isolation
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_isolation ON transcripts
    FOR ALL
    USING (customer_id = current_setting('app.customer_id')::uuid);
````
````python
# Always query with customer_id
async def get_transcripts(customer_id: str):
    return await supabase.table("transcripts") \
        .select("*") \
        .eq("customer_id", customer_id) \  # CRITICAL
        .execute()
````

## Client-Specific Customization

**Internal mode supports custom features per client:**
````python
# Store client config in database
client_configs = {
    "client-acme": {
        "features": {
            "speaker_diarization": True,
            "custom_vocabulary": ["ACME", "Widget", "Gadget"],
            "output_format": "docx",
            "email_notifications": "ceo@acme.com"
        }
    },
    "client-globex": {
        "features": {
            "speaker_diarization": False,
            "custom_vocabulary": ["Globex", "Synergy"],
            "output_format": "pdf",
            "webhook_url": "https://globex.com/webhook"
        }
    }
}

# In internal mode, load custom config
if MODE == DeploymentMode.INTERNAL:
    client_config = await get_client_config(customer_id)
    
    result = await process_transcript_core(
        audio_url=payload.audio_url,
        customer_id=customer_id,
        enable_diarization=client_config.get("speaker_diarization", False),
        vocabulary=client_config.get("custom_vocabulary", []),
        output_format=client_config.get("output_format", "txt")
    )
    
    # Send custom notifications
    if client_config.get("webhook_url"):
        await send_webhook(client_config["webhook_url"], result)
````

## Testing Strategy

### Test Both Modes Separately
````python
# tests/test_internal_mode.py
import pytest
from app import app, DeploymentMode, MODE

@pytest.fixture
def internal_client():
    """Test client configured for internal mode"""
    os.environ["DEPLOYMENT_MODE"] = "internal"
    os.environ["INTERNAL_TOKEN"] = "test-token"
    return TestClient(app)

def test_internal_auth(internal_client):
    """Internal mode accepts internal token"""
    response = internal_client.post(
        "/v1/transcribe",
        headers={"X-Internal-Token": "test-token"},
        json={"audio_url": "https://test.mp3"}
    )
    assert response.status_code == 200

def test_internal_no_limits(internal_client):
    """Internal mode has no usage limits"""
    # Make 1000 requests
    for i in range(1000):
        response = internal_client.post(
            "/v1/transcribe",
            headers={"X-Internal-Token": "test-token"},
            json={"audio_url": f"https://test-{i}.mp3"}
        )
        assert response.status_code == 200  # Never hits limit
````
````python
# tests/test_external_mode.py
import pytest
from app import app, DeploymentMode

@pytest.fixture
def external_client():
    """Test client configured for external mode"""
    os.environ["DEPLOYMENT_MODE"] = "external"
    return TestClient(app)

def test_external_requires_api_key(external_client):
    """External mode requires API key"""
    response = external_client.post(
        "/v1/transcribe",
        json={"audio_url": "https://test.mp3"}
    )
    assert response.status_code == 401
    assert "API key required" in response.json()["detail"]

def test_external_enforces_limits(external_client, mock_customer):
    """External mode enforces usage limits"""
    # Mock customer with 10 transcript limit
    mock_customer["plan"]["transcripts_per_month"] = 10
    mock_customer["usage"]["transcripts"] = 10  # Already at limit
    
    response = external_client.post(
        "/v1/transcribe",
        headers={"X-API-Key": "test-key"},
        json={"audio_url": "https://test.mp3"}
    )
    assert response.status_code == 429
    assert "Usage limit exceeded" in response.json()["error"]
````

## What's Actually Different?
````python
# SAME (90% of code):
├─ Core business logic ✓
├─ Database queries ✓
├─ External API calls ✓
├─ Data models ✓
├─ Error handling ✓
├─ Logging ✓
└─ Health/metrics ✓

# DIFFERENT (10% of code):
├─ Authentication method
│  Internal: Token
│  External: API keys
│
├─ Usage tracking
│  Internal: Disabled
│  External: Enabled
│
├─ Rate limiting
│  Internal: None
│  External: Per plan
│
└─ Response format
   Internal: Just data
   External: Includes usage info
````

## Migration Path

### Phase 1: Build Internal-First
````
Week 1: Build service for internal use
        - Simple token auth
        - No billing logic
        - Test with Client A
````

### Phase 2: Add External Mode
````
Week 2: Add external mode capability
        - Add API key auth path
        - Add usage tracking
        - Don't deploy externally yet
        - Test both modes locally
````

### Phase 3: Deploy External
````
Week 3: Deploy external instance
        - Set up api.transcriptai.com
        - Point to external instance
        - Enable billing
        - Launch!
````

## Common Mistakes

### ❌ Mistake 1: Forgetting customer_id
````python
# BAD - No customer isolation
await db.transcripts.select("*")

# GOOD - Always filter by customer
await db.transcripts.select("*").eq("customer_id", customer_id)
````

### ❌ Mistake 2: Mixing auth logic
````python
# BAD - Auth logic in business logic
async def process_transcript(audio_url, api_key):
    customer = await validate_api_key(api_key)  # Wrong layer!
    # ...

# GOOD - Separate concerns
@app.post("/v1/transcribe")
async def transcribe(request: Request):
    customer = await authenticate_request(request)  # Auth layer
    result = await process_transcript_core(...)     # Business layer
````

### ❌ Mistake 3: Hardcoding mode
````python
# BAD - Hardcoded
if True:  # Always external
    await track_usage(...)

# GOOD - Config-driven
if config["features"]["usage_tracking"]:
    await track_usage(...)
````

## Summary

**Build ONE service with TWO configurations:**
````
transcript-processor-svc/
├── app.py                  # Main service (handles both modes)
├── config/
│   ├── internal.yaml       # Internal mode config
│   └── external.yaml       # External mode config
├── core/
│   └── processor.py        # Core logic (100% shared)
├── auth/
│   ├── internal.py         # Internal auth
│   └── external.py         # External auth
├── docker-compose.internal.yml
└── docker-compose.external.yml
````

**Deploy TWICE:**
- Internal instance at `internal.gyst.com`
- External instance at `api.transcriptai.com`

**Maintain ONCE:**
- Bug fixes apply to both
- Features available to both
- One codebase to understand

**This is the way.**