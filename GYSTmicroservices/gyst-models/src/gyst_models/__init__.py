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

    print(lead.model_dump_json())

Available Models:

Common:
    - BaseResponse: Standard API response wrapper
    - BaseError: Standard error response

Leads:
    - LeadInput: Lead qualification input
    - LeadQualificationResult: Lead qualification output

Transcripts:
    - TranscriptInput: Transcript processing input
    - TranscriptOutput: Transcript processing output

Events:
    - BaseEvent: Base event for pub/sub
    - TranscriptCompletedEvent: Transcript completion event
    - LeadQualifiedEvent: Lead qualified event
    - UsageTrackingEvent: Usage tracking event

Customers:
    - Customer: SaaS customer record
    - UsageEvent: Billing usage event
    - PlanLimits: Plan limits and quotas
"""

from gyst_models.common import BaseResponse, BaseError
from gyst_models.leads import LeadInput, LeadQualificationResult
from gyst_models.transcripts import TranscriptInput, TranscriptOutput
from gyst_models.events import (
    BaseEvent,
    TranscriptCompletedEvent,
    LeadQualifiedEvent,
    UsageTrackingEvent,
)
from gyst_models.customers import Customer, UsageEvent, PlanLimits

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
    "UsageTrackingEvent",
    # Customers
    "Customer",
    "UsageEvent",
    "PlanLimits",
]
