name: "GYST Shared Models Package"
description: |
  Build a shared Python package containing all Pydantic models used across 
  GYST microservices. This ensures consistent data structures, reduces 
  duplication, and provides a single source of truth for data models.

## Purpose
Create a reusable Python package with Pydantic models that all microservices will import. This package will be installed locally during development and can be versioned for production use.

## Core Principles
1. **Single Source of Truth**: All data models defined once, used everywhere
2. **Type Safety**: Full Pydantic validation with type hints
3. **Versioned**: Semantic versioning for breaking changes
4. **Easy to Install**: Simple `pip install -e .` for local development
5. **Well Documented**: Examples and docstrings for every model

---

## Goal
Create a working Python package that can be installed in all microservices and provides shared Pydantic models for:
- API requests/responses
- Database records
- Event payloads
- Common data structures

## Why
- **Business value**: Faster service development, fewer bugs from data mismatches
- **Technical value**: Type safety, auto-validation, consistent serialization
- **Problems solved**: No more copy-pasting models between services, centralized data contracts

## What
A Python package called `gyst-models` that contains:
- Base response/error models
- Lead-related models
- Transcript-related models
- Embedding/RAG models
- Event models
- Customer/billing models

### Success Criteria
- [ ] Package can be installed with `pip install -e .`
- [ ] All models have proper type hints
- [ ] All models validate correctly
- [ ] Models can be imported: `from gyst_models import LeadInput`
- [ ] Tests pass for all models
- [ ] Package can be versioned (1.0.0)
- [ ] Used successfully in at least one microservice

---

## All Needed Context

### Documentation & References
````yaml
# MUST READ - Include these in your context window
- file: .context/00-PROJECT-OVERVIEW.md
  why: Understand project structure and goals
  
- file: .context/01-ARCHITECTURE/dual-mode-deployment.md
  why: Models must support both internal and external modes
  
- url: https://docs.pydantic.dev/latest/
  why: Pydantic V2 documentation for model creation
  
- url: https://packaging.python.org/en/latest/tutorials/packaging-projects/
  why: Python packaging basics
````

### Current Codebase Tree
````bash
GYSTmicroservices/
├── .context/              # Context documentation
├── .cursorrules           # Cursor configuration
└── [empty - ready to build]
````

### Desired Codebase Tree
````bash
GYSTmicroservices/
├── .context/
├── .cursorrules
└── gyst-models/                    # NEW: Shared models package
    ├── pyproject.toml              # Package configuration
    ├── README.md                   # Package documentation
    ├── .gitignore                  # Ignore build artifacts
    ├── src/
    │   └── gyst_models/
    │       ├── __init__.py         # Package exports
    │       ├── common.py           # Base response/error models
    │       ├── leads.py            # Lead-related models
    │       ├── transcripts.py      # Transcript models
    │       ├── embeddings.py       # Embedding/RAG models
    │       ├── events.py           # Event bus models
    │       ├── customers.py        # Customer/billing models
    │       └── py.typed             # Marker for type checking
    └── tests/
        ├── __init__.py
        ├── test_common.py
        ├── test_leads.py
        ├── test_transcripts.py
        ├── test_embeddings.py
        ├── test_events.py
        └── test_customers.py
````

### Known Gotchas & Library Quirks
````python
# CRITICAL: Use Pydantic V2 (not V1)
# Pydantic V2 has different syntax:
# V1: class Config: ... 
# V2: model_config = ConfigDict(...)

# CRITICAL: For optional fields, use Optional[Type] or Type | None
# Example: name: Optional[str] = None

# CRITICAL: Use Field() for validation and metadata
# Example: score: float = Field(..., ge=0, le=100, description="Score 0-100")

# CRITICAL: ConfigDict for model configuration
# from pydantic import ConfigDict
# model_config = ConfigDict(json_schema_extra={...})

# CRITICAL: For datetime, always use timezone-aware
# from datetime import datetime, timezone
# created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# CRITICAL: Export models in __init__.py using __all__
# This controls what gets imported with "from gyst_models import *"
````

---

## Implementation Blueprint

### Data Models and Structure

#### 1. Common Models (Base Classes)
````python
# src/gyst_models/common.py

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import uuid4

class BaseResponse(BaseModel):
    """Standard response wrapper for all services"""
    job_id: str = Field(default_factory=lambda: str(uuid4()))
    status: str = Field(..., description="success, processing, failed")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "abc-123-def",
                "status": "success",
                "timestamp": "2024-01-15T10:30:00Z",
                "correlation_id": "lead-456_20240115"
            }
        }
    )

class BaseError(BaseModel):
    """Standard error response"""
    error_code: str
    message: str
    details: Optional[dict[str, Any]] = None
    correlation_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
````

#### 2. Lead Models
````python
# src/gyst_models/leads.py

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone

class LeadInput(BaseModel):
    """Input for lead qualification"""
    lead_id: str = Field(..., description="Unique lead identifier")
    phone: str = Field(..., pattern=r'^\+?1?\d{9,15}$')
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    source: str = Field(..., description="Lead source (web, phone, referral)")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Strip formatting from phone"""
        return ''.join(filter(str.isdigit, v))

class LeadQualificationResult(BaseModel):
    """Output from lead qualification service"""
    lead_id: str
    qualification_score: float = Field(..., ge=0.0, le=100.0)
    tier: Literal["hot", "warm", "cold", "unqualified"]
    reasons: list[str] = Field(default_factory=list)
    recommended_action: str
    qualified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
````

#### 3. Transcript Models
````python
# src/gyst_models/transcripts.py

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime, timezone

class TranscriptInput(BaseModel):
    """Input for transcript processing"""
    audio_url: HttpUrl
    language: str = Field(default="en", pattern=r'^[a-z]{2}$')
    speaker_labels: bool = Field(default=False)
    callback_url: Optional[HttpUrl] = None

class TranscriptOutput(BaseModel):
    """Output from transcript service"""
    job_id: str
    status: str
    text_url: Optional[HttpUrl] = None
    text_content: Optional[str] = None
    duration_seconds: Optional[float] = None
    word_count: Optional[int] = None
    speakers: Optional[list[str]] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    processed_at: Optional[datetime] = None
````

#### 4. Event Models
````python
# src/gyst_models/events.py

from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

class BaseEvent(BaseModel):
    """Base event structure for pub/sub"""
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_name: str
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = None
    source_service: str
    payload: dict[str, Any]

class TranscriptCompletedEvent(BaseEvent):
    """Fired when transcript processing completes"""
    event_name: str = Field(default="transcript.completed", frozen=True)
    event_type: str = Field(default="domain", frozen=True)

class LeadQualifiedEvent(BaseEvent):
    """Fired when a lead is qualified"""
    event_name: str = Field(default="lead.qualified", frozen=True)
    event_type: str = Field(default="domain", frozen=True)
````

#### 5. Customer Models
````python
# src/gyst_models/customers.py

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime, timezone

class Customer(BaseModel):
    """Customer record (for external SaaS)"""
    id: str
    email: EmailStr
    name: Optional[str] = None
    company: Optional[str] = None
    plan: Literal["free", "starter", "pro", "enterprise"] = "free"
    status: Literal["active", "suspended", "cancelled"] = "active"
    api_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UsageEvent(BaseModel):
    """Usage tracking event"""
    customer_id: str
    service_name: str
    service_action: str
    quantity: int = 1
    unit: str = "request"
    cost_usd: float = Field(..., ge=0.0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
````

### List of Tasks to be Completed
````yaml
Task 1: Project Structure Setup
  Description: Create package directory structure and configuration files
  Steps:
    - Create gyst-models/ directory
    - Create src/gyst_models/ package structure
    - Create tests/ directory
    - Create pyproject.toml
    - Create README.md
    - Create .gitignore
    - Create py.typed marker file
  
  Validation:
    - Directory structure matches desired tree
    - pyproject.toml is valid TOML
    - Can run: pip install -e .

Task 2: Implement Common Models
  Description: Create base models used across all services
  Steps:
    - Create src/gyst_models/common.py
    - Implement BaseResponse
    - Implement BaseError
    - Add comprehensive docstrings
    - Add example values in model_config
  
  Validation:
    - Can import: from gyst_models.common import BaseResponse
    - Models validate correctly
    - Example data validates

Task 3: Implement Lead Models
  Description: Create lead-related models
  Steps:
    - Create src/gyst_models/leads.py
    - Implement LeadInput with validation
    - Implement LeadQualificationResult
    - Add phone number validator
    - Add docstrings and examples
  
  Validation:
    - Can import: from gyst_models.leads import LeadInput
    - Phone validation works correctly
    - Email validation works (via EmailStr)

Task 4: Implement Transcript Models
  Description: Create transcript-related models
  Steps:
    - Create src/gyst_models/transcripts.py
    - Implement TranscriptInput
    - Implement TranscriptOutput
    - Add URL validation (via HttpUrl)
    - Add docstrings
  
  Validation:
    - Models validate URLs correctly
    - Language pattern validation works
    - Optional fields work correctly

Task 5: Implement Event Models
  Description: Create event bus models
  Steps:
    - Create src/gyst_models/events.py
    - Implement BaseEvent
    - Implement TranscriptCompletedEvent
    - Implement LeadQualifiedEvent
    - Use frozen fields for event names
  
  Validation:
    - Event names cannot be modified (frozen=True)
    - UUID generation works
    - Timestamp defaults work

Task 6: Implement Customer Models
  Description: Create customer/billing models
  Steps:
    - Create src/gyst_models/customers.py
    - Implement Customer
    - Implement UsageEvent
    - Add Literal types for enums
    - Add validation
  
  Validation:
    - Literal types restrict values correctly
    - Cost validation ensures non-negative
    - All fields validate properly

Task 7: Create Package Exports
  Description: Set up __init__.py with proper exports
  Steps:
    - Create src/gyst_models/__init__.py
    - Import all models
    - Define __all__ list
    - Add version string
    - Add package docstring
  
  Validation:
    - Can import: from gyst_models import LeadInput, TranscriptOutput
    - __all__ exports correct items
    - Version accessible: gyst_models.__version__

Task 8: Write Tests
  Description: Create comprehensive test suite
  Steps:
    - Create test files for each module
    - Test valid data passes validation
    - Test invalid data raises ValidationError
    - Test field defaults work
    - Test validators work correctly
    - Test model serialization (dict, JSON)
  
  Validation:
    - All tests pass: pytest tests/ -v
    - Test coverage > 80%: pytest --cov=gyst_models

Task 9: Documentation
  Description: Create package README
  Steps:
    - Write installation instructions
    - Add usage examples for each model
    - Document how to import models
    - Add development setup instructions
    - Include version upgrade guide
  
  Validation:
    - README.md is clear and complete
    - Examples are copy-pasteable
    - Installation steps work

Task 10: Final Validation
  Description: End-to-end package validation
  Steps:
    - Install package: pip install -e .
    - Import all models in Python REPL
    - Run full test suite
    - Check type hints with mypy
    - Verify package can be used in another project
  
  Validation:
    - pip install -e . succeeds
    - All imports work
    - Tests pass: pytest
    - Type checking passes: mypy src/
    - Can be imported from outside package directory
````

### Per Task Detailed Instructions

#### Task 1: Project Structure Setup

**Create pyproject.toml:**
````toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "gyst-models"
version = "1.0.0"
description = "Shared Pydantic models for GYST microservices"
authors = [
    {name = "GYST Agency", email = "rob@gyst.com"}
]
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0.0",
    "pydantic[email]>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
````

**Create README.md:**
````markdown
# GYST Models

Shared Pydantic models for GYST microservices.

## Installation
```bash
# Local development
pip install -e .

# With dev dependencies
pip install -e ".[dev]"
```

## Usage
```python
from gyst_models import LeadInput, TranscriptOutput, BaseResponse

# Create a lead
lead = LeadInput(
    lead_id="lead-123",
    phone="+12025551234",
    email="john@example.com",
    source="web"
)

# Validate automatically
print(lead.phone)  # "2025551234" (formatted)

# Serialize to dict
lead_dict = lead.model_dump()

# Serialize to JSON
lead_json = lead.model_dump_json()
```

## Available Models

### Common
- `BaseResponse` - Standard API response
- `BaseError` - Standard error response

### Leads
- `LeadInput` - Lead qualification input
- `LeadQualificationResult` - Lead qualification output

### Transcripts
- `TranscriptInput` - Transcript processing input
- `TranscriptOutput` - Transcript processing output

### Events
- `BaseEvent` - Base event structure
- `TranscriptCompletedEvent` - Transcript completed event
- `LeadQualifiedEvent` - Lead qualified event

### Customers
- `Customer` - Customer record
- `UsageEvent` - Usage tracking event

## Development
```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=gyst_models --cov-report=term-missing

# Type checking
mypy src/

# Linting
ruff check src/
```

## Versioning

This package follows semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features, backwards compatible
- PATCH: Bug fixes
````

**Create .gitignore:**
````gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Testing
.pytest_cache/
.coverage
htmlcov/

# Type checking
.mypy_cache/
.dmypy.json
dmypy.json

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
venv/
env/
````

**Create src/gyst_models/py.typed:**
````
# Empty file - signals that package has type hints
````

#### Task 7: Package Exports

**Create src/gyst_models/__init__.py:**
````python
"""
GYST Models - Shared Pydantic models for GYST microservices

This package provides type-safe data models used across all GYST services.
All models use Pydantic V2 for validation and serialization.

Usage:
    from gyst_models import LeadInput, TranscriptOutput, BaseResponse
    
    lead = LeadInput(
        lead_id="lead-123",
        phone="+12025551234",
        email="john@example.com",
        source="web"
    )
"""

from gyst_models.common import BaseResponse, BaseError
from gyst_models.leads import LeadInput, LeadQualificationResult
from gyst_models.transcripts import TranscriptInput, TranscriptOutput
from gyst_models.events import (
    BaseEvent,
    TranscriptCompletedEvent,
    LeadQualifiedEvent,
)
from gyst_models.customers import Customer, UsageEvent

__version__ = "1.0.0"

__all__ = [
    # Common
    "BaseResponse",
    "BaseError",
    # Leads
    "LeadInput",
    "LeadQualificationResult",
    # Transcripts
    "TranscriptInput",
    "TranscriptOutput",
    # Events
    "BaseEvent",
    "TranscriptCompletedEvent",
    "LeadQualifiedEvent",
    # Customers
    "Customer",
    "UsageEvent",
]
````

#### Task 8: Write Tests

**Example test file (tests/test_leads.py):**
````python
"""Tests for lead models"""

import pytest
from pydantic import ValidationError
from gyst_models.leads import LeadInput, LeadQualificationResult

def test_lead_input_valid():
    """Test valid lead input"""
    lead = LeadInput(
        lead_id="lead-123",
        phone="+1-202-555-1234",
        email="john@example.com",
        source="web"
    )
    
    assert lead.lead_id == "lead-123"
    assert lead.phone == "2025551234"  # Formatted
    assert lead.email == "john@example.com"

def test_lead_input_invalid_email():
    """Test invalid email is rejected"""
    with pytest.raises(ValidationError):
        LeadInput(
            lead_id="lead-123",
            phone="2025551234",
            email="not-an-email",  # Invalid
            source="web"
        )

def test_lead_qualification_score_range():
    """Test score must be 0-100"""
    # Valid
    result = LeadQualificationResult(
        lead_id="lead-123",
        qualification_score=85.5,
        tier="hot",
        recommended_action="Call immediately"
    )
    assert result.qualification_score == 85.5
    
    # Invalid - too high
    with pytest.raises(ValidationError):
        LeadQualificationResult(
            lead_id="lead-123",
            qualification_score=150,  # > 100
            tier="hot",
            recommended_action="Call"
        )

def test_lead_serialization():
    """Test model can serialize to dict and JSON"""
    lead = LeadInput(
        lead_id="lead-123",
        phone="2025551234",
        email="john@example.com",
        source="web"
    )
    
    # To dict
    lead_dict = lead.model_dump()
    assert isinstance(lead_dict, dict)
    assert lead_dict["lead_id"] == "lead-123"
    
    # To JSON
    lead_json = lead.model_dump_json()
    assert isinstance(lead_json, str)
    assert "lead-123" in lead_json
````

---

## Validation Loop

### Level 1: Syntax & Style
````bash
# Run these FIRST - fix any errors before proceeding

# Install package in editable mode
cd gyst-models
pip install -e ".[dev]"

# Linting
ruff check src/

# Type checking
mypy src/

# Expected: No errors
````

### Level 2: Unit Tests
````bash
# Run all tests
pytest tests/ -v

# With coverage report
pytest tests/ -v --cov=gyst_models --cov-report=term-missing

# Expected: All tests pass, coverage > 80%
````

### Level 3: Integration Test
````python
# Test imports work from outside package
# Open Python REPL from DIFFERENT directory

from gyst_models import (
    LeadInput,
    TranscriptOutput,
    BaseResponse,
    LeadQualifiedEvent
)

# Test creating instance
lead = LeadInput(
    lead_id="test-123",
    phone="2025551234",
    email="test@example.com",
    source="web"
)

print(lead.model_dump())
# Should print validated data

# Test validation
try:
    bad_lead = LeadInput(
        lead_id="test",
        phone="invalid",
        email="not-an-email",
        source="web"
    )
except Exception as e:
    print(f"Validation works: {e}")
````

---

## Final Validation Checklist

- [ ] Package installs: `pip install -e .`
- [ ] All imports work: `from gyst_models import LeadInput`
- [ ] Linting passes: `ruff check src/`
- [ ] Type checking passes: `mypy src/`
- [ ] All tests pass: `pytest tests/ -v`
- [ ] Coverage > 80%: `pytest --cov=gyst_models`
- [ ] Can import from external directory
- [ ] README.md is complete and accurate
- [ ] All models have docstrings
- [ ] All models have examples
- [ ] Version is set to 1.0.0

---

## Anti-Patterns to Avoid

- ❌ Don't use Pydantic V1 syntax (class Config)
- ❌ Don't forget timezone in datetime defaults
- ❌ Don't use mutable defaults (list, dict) without Field(default_factory)
- ❌ Don't skip validation (use Field with constraints)
- ❌ Don't forget to export models in __init__.py
- ❌ Don't hardcode version in multiple places
- ❌ Don't skip type hints (use mypy to verify)
- ❌ Don't forget py.typed marker file

---

## Confidence Score: 10/10

**High confidence because:**
- Clear, well-defined scope
- Pydantic V2 is mature and well-documented
- No external dependencies beyond Pydantic
- Straightforward Python packaging
- Easy to test and validate
- No complex logic - just data models
- Can be built incrementally and tested at each step

This package is the perfect first component to build. It's simple, essential, and will be used by every other service you create.
````

---

# 🎉 Your First PRP is Ready!

## **Next Steps:**

1. **Copy this entire PRP**
2. **Save it to:** `.context/09-PRPS/gyst-models-prp.md`
3. **Open Cursor**
4. **Start a chat with Claude Code:**
````
@.context/00-PROJECT-OVERVIEW.md @.context/09-PRPS/gyst-models-prp.md

I need you to build the gyst-models shared package following this PRP exactly.

Start with Task 1: Project Structure Setup.

After completing each task:
1. Show me what you created
2. Run the validation steps from the PRP
3. Report the results
4. Wait for my approval before moving to the next task

Let's begin with Task 1.