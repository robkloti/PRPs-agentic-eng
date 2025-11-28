"""Event models for pub/sub messaging and event-driven architecture."""

from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4


class BaseEvent(BaseModel):
    """Base event structure for pub/sub messaging.

    This model represents an event that can be published to message queues
    or event buses. All events follow this base structure with optional
    subclass specialization for specific event types.

    Attributes:
        event_id: Unique identifier for this event
        event_name: Human-readable event name (e.g., "transcript.completed")
        event_type: Event type category (e.g., "domain", "system")
        timestamp: When event was created (UTC)
        correlation_id: Optional ID for tracing related events
        source_service: Which service emitted this event
        payload: Event-specific data

    Example:
        >>> event = BaseEvent(
        ...     event_name="transcript.completed",
        ...     event_type="domain",
        ...     source_service="transcript-processor-svc",
        ...     payload={"job_id": "job-123", "status": "completed"}
        ... )
        >>> event.event_id
        '550e8400-e29b-41d4-a716-446655440000'
    """

    event_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique event identifier"
    )
    event_name: str = Field(
        ...,
        description="Event name (e.g., transcript.completed)",
        min_length=1,
        max_length=256
    )
    event_type: str = Field(
        ...,
        description="Event type category (domain, system, integration)",
        min_length=1,
        max_length=50
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When event was created (UTC)"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional ID for tracing related events"
    )
    source_service: str = Field(
        ...,
        description="Service that emitted this event",
        min_length=1,
        max_length=256
    )
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Event-specific data"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "event_name": "transcript.completed",
                "event_type": "domain",
                "timestamp": "2024-01-15T10:30:00Z",
                "correlation_id": "job-123_20240115",
                "source_service": "transcript-processor-svc",
                "payload": {
                    "job_id": "job-123",
                    "status": "completed",
                    "duration_seconds": 45.5
                }
            }
        }
    }


class TranscriptCompletedEvent(BaseEvent):
    """Event fired when transcript processing completes.

    This event is published when a transcript has been successfully
    processed and is ready for downstream consumption.

    Attributes:
        event_name: Always "transcript.completed" (frozen)
        event_type: Always "domain" (frozen)
        payload: Should contain job_id, status, text_content, etc.

    Example:
        >>> event = TranscriptCompletedEvent(
        ...     source_service="transcript-processor-svc",
        ...     correlation_id="job-123_20240115",
        ...     payload={
        ...         "job_id": "job-123",
        ...         "status": "completed",
        ...         "text_content": "Hello world",
        ...         "duration_seconds": 45.5
        ...     }
        ... )
        >>> event.event_name
        'transcript.completed'
    """

    event_name: str = Field(
        default="transcript.completed",
        frozen=True,
        description="Event name (always transcript.completed)"
    )
    event_type: str = Field(
        default="domain",
        frozen=True,
        description="Event type (always domain)"
    )


class LeadQualifiedEvent(BaseEvent):
    """Event fired when a lead is qualified.

    This event is published when the lead qualification service has
    completed qualification and determined the lead's tier and score.

    Attributes:
        event_name: Always "lead.qualified" (frozen)
        event_type: Always "domain" (frozen)
        payload: Should contain lead_id, qualification_score, tier, etc.

    Example:
        >>> event = LeadQualifiedEvent(
        ...     source_service="lead-qualifier-svc",
        ...     correlation_id="lead-456_20240115",
        ...     payload={
        ...         "lead_id": "lead-456",
        ...         "qualification_score": 85.5,
        ...         "tier": "hot",
        ...         "recommended_action": "Call immediately"
        ...     }
        ... )
        >>> event.event_name
        'lead.qualified'
    """

    event_name: str = Field(
        default="lead.qualified",
        frozen=True,
        description="Event name (always lead.qualified)"
    )
    event_type: str = Field(
        default="domain",
        frozen=True,
        description="Event type (always domain)"
    )


class UsageTrackingEvent(BaseEvent):
    """Event fired when service usage is tracked.

    This event is published by services to report their usage for
    billing and metrics purposes. Used by the billing service.

    Attributes:
        event_name: Always "usage.tracked" (frozen)
        event_type: Always "system" (frozen)
        payload: Should contain customer_id, service_name, cost, etc.

    Example:
        >>> event = UsageTrackingEvent(
        ...     source_service="transcript-processor-svc",
        ...     payload={
        ...         "customer_id": "cust-123",
        ...         "service_name": "transcript-processor",
        ...         "action": "transcribe",
        ...         "cost_usd": 0.05,
        ...         "unit": "request"
        ...     }
        ... )
        >>> event.event_name
        'usage.tracked'
    """

    event_name: str = Field(
        default="usage.tracked",
        frozen=True,
        description="Event name (always usage.tracked)"
    )
    event_type: str = Field(
        default="system",
        frozen=True,
        description="Event type (always system)"
    )
