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
