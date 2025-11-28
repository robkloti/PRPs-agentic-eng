# Pydantic V2 Best Practices for GYST Services

## You Already Know This!

Since you just built gyst-models, you understand:
- ✅ Field validation
- ✅ Type hints
- ✅ model_dump() for serialization
- ✅ ConfigDict for configuration

## Quick Reference for Week 2

### Pattern 1: API Request/Response
```python
from pydantic import BaseModel, Field
from gyst_models import BaseResponse

class TranscriptRequest(BaseModel):
    audio_url: str
    language: str = "en"

class TranscriptResponse(BaseResponse):
    transcript_id: str
    text_url: str
    duration_seconds: float
```

### Pattern 2: Validation
```python
from pydantic import field_validator

class LeadInput(BaseModel):
    phone: str
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Clean phone number
        return ''.join(filter(str.isdigit, v))
```

### Pattern 3: Using in FastAPI
```python
from fastapi import FastAPI
from gyst_models import TranscriptInput, TranscriptOutput

app = FastAPI()

@app.post("/v1/transcribe", response_model=TranscriptOutput)
async def transcribe(payload: TranscriptInput):
    # Pydantic automatically validates payload
    # payload.audio_url is already validated as string
    result = await process(payload.audio_url)
    return TranscriptOutput(**result)
```

## You're Good to Go!

You learned everything you need in gyst-models.
Just import and use them in your services.

## See Also
- `.context/09-PRPS/gyst-models-prp.md` - What you just built
- https://docs.pydantic.dev - Official docs if needed
```

---

## **6. What to Tell Claude Code for Week 2**

### **Monday Morning (Right Now):**
```
@.context/00-PROJECT-OVERVIEW.md @.context/01-ARCHITECTURE/dual-mode-deployment.md @.context/03-MICROSERVICES/service-template-guide.md @.context/02-INFRASTRUCTURE/n8n-integration-patterns.md

I'm starting Week 2. I need the PRP for transcript-processor-svc.

Requirements:
- Dual-mode deployment (internal + external)
- Integrates with Whisper API for transcription
- Stores results in Supabase with customer_id isolation
- Has /health and /metrics endpoints
- Uses gyst-models package
- Will be called by n8n workflows (internal mode)
- Dockerized and deployable

Create the complete PRP following the template in .context/09-PRPS/prp-template.md