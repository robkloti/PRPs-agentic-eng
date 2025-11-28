"""
Complete Dual-Mode FastAPI Service Example

This service works in two deployment modes:
1. INTERNAL: For agency client integrations (no billing, unlimited)
2. EXTERNAL: For public SaaS customers (billing, rate limits)

Deploy the SAME code twice with different config.
"""

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
import os
import yaml
import json
import logging
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

class DeploymentMode(Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"

def load_config() -> Dict[str, Any]:
    """Load configuration from YAML file"""
    config_file = os.getenv("CONFIG_FILE", "config/internal.yaml")
    with open(config_file) as f:
        return yaml.safe_load(f)

config = load_config()
MODE = DeploymentMode(config["deployment"]["mode"])

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def log_event(event: str, **kwargs):
    """Structured logging"""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "service": "transcript-processor",
        "mode": MODE.value,
        "event": event,
        **kwargs
    }
    logger.info(json.dumps(log_data))

# ============================================================================
# DATA MODELS
# ============================================================================

class TranscriptInput(BaseModel):
    audio_url: str = Field(..., description="URL to audio file")
    language: str = Field("en", description="Language code (en, es, fr, etc)")
    
    # Optional: Client-specific features (internal mode only)
    options: Optional[Dict[str, Any]] = Field(None)

class TranscriptOutput(BaseModel):
    transcript_id: str
    status: str
    text_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    word_count: Optional[int] = None
    
    # External mode includes usage info
    credits_remaining: Optional[int] = None
    cost_usd: Optional[float] = None

class Customer(BaseModel):
    id: str
    mode: str
    plan: Optional[Dict[str, Any]] = None

# ============================================================================
# AUTHENTICATION
# ============================================================================

async def authenticate_internal(request: Request) -> Customer:
    """
    Internal mode authentication.
    Uses simple token + explicit customer_id header.
    """
    token = request.headers.get("X-Internal-Token")
    if not token or token != os.getenv("INTERNAL_TOKEN"):
        raise HTTPException(401, "Invalid internal token")
    
    customer_id = request.headers.get("X-Customer-ID", "internal")
    
    log_event("auth_success", customer_id=customer_id, auth_type="internal")
    
    return Customer(
        id=customer_id,
        mode="internal",
        plan=None  # No plan limits for internal
    )

async def authenticate_external(request: Request) -> Customer:
    """
    External mode authentication.
    Validates API key with auth-gateway-svc.
    """
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "API key required")
    
    # In real implementation, call auth-gateway-svc
    # For this example, mock the validation
    customer = await validate_api_key_with_gateway(api_key)
    
    log_event("auth_success", customer_id=customer["id"], auth_type="api_key")
    
    return Customer(
        id=customer["id"],
        mode="external",
        plan=customer["plan"]
    )

async def authenticate_request(request: Request) -> Customer:
    """Route to appropriate auth method based on mode"""
    if MODE == DeploymentMode.INTERNAL:
        return await authenticate_internal(request)
    else:
        return await authenticate_external(request)

async def validate_api_key_with_gateway(api_key: str) -> Dict[str, Any]:
    """
    Mock API key validation.
    In production, this would call auth-gateway-svc.
    """
    # Mock implementation
    return {
        "id": "cust-abc123",
        "email": "user@example.com",
        "plan": {
            "name": "starter",
            "transcripts_per_month": 100,
            "rate_limit_per_minute": 20
        }
    }

# ============================================================================
# USAGE TRACKING & LIMITS
# ============================================================================

async def check_usage_limits(customer: Customer):
    """
    Check if customer has exceeded their usage limits.
    Only applicable in external mode.
    """
    if MODE == DeploymentMode.INTERNAL:
        return  # No limits in internal mode
    
    # Get current month's usage
    usage = await get_current_usage(customer.id)
    limit = customer.plan["transcripts_per_month"]
    
    if usage["transcripts"] >= limit:
        raise HTTPException(429, {
            "error": "Usage limit exceeded",
            "current_usage": usage["transcripts"],
            "limit": limit,
            "upgrade_url": "https://dashboard.gyst.com/billing"
        })

async def track_usage(customer_id: str, service: str, cost: float):
    """
    Track usage for billing.
    Only applicable in external mode.
    """
    if MODE == DeploymentMode.INTERNAL:
        return  # No tracking in internal mode
    
    log_event("usage_tracked",
        customer_id=customer_id,
        service=service,
        cost=cost
    )
    
    # In production, insert into usage_events table
    # await supabase.table("usage_events").insert({
    #     "customer_id": customer_id,
    #     "service_name": service,
    #     "cost_usd": cost
    # })

async def get_current_usage(customer_id: str) -> Dict[str, int]:
    """Get customer's usage for current month"""
    # Mock implementation
    return {
        "transcripts": 47,
        "month": "2024-01"
    }

def calculate_cost(duration_seconds: float) -> float:
    """Calculate cost based on audio duration"""
    # $0.05 per minute
    minutes = duration_seconds / 60
    return round(minutes * 0.05, 2)

# ============================================================================
# CORE BUSINESS LOGIC
# ============================================================================

async def process_transcript_core(
    audio_url: str,
    language: str,
    customer_id: str,
    **options
) -> Dict[str, Any]:
    """
    Core transcription logic.
    
    THIS IS IDENTICAL FOR BOTH INTERNAL AND EXTERNAL MODES.
    This is 90% of your code.
    """
    
    log_event("processing_started",
        customer_id=customer_id,
        audio_url=audio_url,
        language=language
    )
    
    # 1. Download audio (simulated)
    # audio_file = await download_audio(audio_url)
    
    # 2. Call Whisper API (simulated)
    # transcript = await call_whisper_api(audio_file, language, **options)
    
    # Simulated result
    transcript = {
        "text": "This is a simulated transcript of the audio file.",
        "duration": 120.5,
        "language": language
    }
    
    # 3. Store in database (with customer isolation)
    transcript_id = f"trans_{int(time.time())}"
    
    # In production:
    # await supabase.table("transcripts").insert({
    #     "id": transcript_id,
    #     "customer_id": customer_id,  # CRITICAL: Always isolate by customer
    #     "transcript_text": transcript["text"],
    #     "audio_url": audio_url,
    #     "duration": transcript["duration"],
    #     "language": language
    # })
    
    # 4. Upload to storage
    text_url = f"https://storage.gyst.com/{customer_id}/transcripts/{transcript_id}.txt"
    # await upload_to_storage(customer_id, transcript_id, transcript["text"])
    
    log_event("processing_completed",
        customer_id=customer_id,
        transcript_id=transcript_id,
        duration=transcript["duration"]
    )
    
    return {
        "transcript_id": transcript_id,
        "text_url": text_url,
        "duration": transcript["duration"],
        "word_count": len(transcript["text"].split())
    }

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title=config["deployment"]["name"],
    version="1.0.0"
)

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mode": MODE.value,
        "service": "transcript-processor",
        "version": "1.0.0"
    }

@app.get("/metrics/json")
async def metrics():
    """Metrics endpoint"""
    return {
        "service": "transcript-processor",
        "mode": MODE.value,
        "requests_total": 12345  # Would track real metrics
    }

@app.post("/v1/transcribe", response_model=TranscriptOutput)
async def transcribe(
    payload: TranscriptInput,
    request: Request
):
    """
    Main transcription endpoint.
    
    Works in both internal and external mode.
    Authentication and billing vary by mode.
    Core logic is identical.
    """
    
    correlation_id = request.headers.get("X-Correlation-ID", f"req-{int(time.time())}")
    
    try:
        # Step 1: Authenticate (mode-specific)
        customer = await authenticate_request(request)
        
        # Step 2: Check usage limits (external only)
        if MODE == DeploymentMode.EXTERNAL:
            await check_usage_limits(customer)
        
        # Step 3: Process transcript (SAME for both modes)
        result = await process_transcript_core(
            audio_url=payload.audio_url,
            language=payload.language,
            customer_id=customer.id,
            **(payload.options or {})  # Internal can pass custom options
        )
        
        # Step 4: Track usage (external only)
        cost = 0.0
        if MODE == DeploymentMode.EXTERNAL:
            cost = calculate_cost(result["duration"])
            await track_usage(customer.id, "transcribe", cost)
            
            # Add usage info to response
            usage = await get_current_usage(customer.id)
            limit = customer.plan["transcripts_per_month"]
            result["credits_remaining"] = limit - (usage["transcripts"] + 1)
            result["cost_usd"] = cost
        
        # Step 5: Return response
        return TranscriptOutput(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        log_event("error",
            correlation_id=correlation_id,
            error=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(500, f"Internal error: {str(e)}")

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup():
    """Service startup"""
    log_event("service_started",
        mode=MODE.value,
        config_file=os.getenv("CONFIG_FILE", "config/internal.yaml")
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)