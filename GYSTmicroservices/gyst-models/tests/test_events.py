"""Tests for event models."""

import pytest
from pydantic import ValidationError
from gyst_models.events import (
    BaseEvent,
    TranscriptCompletedEvent,
    LeadQualifiedEvent,
    UsageTrackingEvent,
)


class TestBaseEvent:
    """Tests for BaseEvent model."""

    def test_base_event_valid(self):
        """Test creating a valid BaseEvent."""
        event = BaseEvent(
            event_name="test.event",
            event_type="domain",
            source_service="test-service"
        )
        assert event.event_name == "test.event"
        assert event.event_type == "domain"
        assert event.source_service == "test-service"
        assert event.event_id is not None
        assert event.timestamp is not None
        assert event.correlation_id is None
        assert event.payload == {}

    def test_base_event_with_payload(self):
        """Test BaseEvent with payload."""
        payload = {"key": "value", "number": 42}
        event = BaseEvent(
            event_name="test.event",
            event_type="domain",
            source_service="test-service",
            payload=payload
        )
        assert event.payload == payload

    def test_base_event_with_correlation_id(self):
        """Test BaseEvent with correlation ID."""
        event = BaseEvent(
            event_name="test.event",
            event_type="domain",
            source_service="test-service",
            correlation_id="trace-123"
        )
        assert event.correlation_id == "trace-123"

    def test_base_event_auto_generated_event_id(self):
        """Test that event_id is auto-generated."""
        event1 = BaseEvent(
            event_name="test",
            event_type="domain",
            source_service="test"
        )
        event2 = BaseEvent(
            event_name="test",
            event_type="domain",
            source_service="test"
        )
        assert event1.event_id != event2.event_id

    def test_base_event_timestamp_timezone_aware(self):
        """Test that timestamp is timezone-aware."""
        event = BaseEvent(
            event_name="test",
            event_type="domain",
            source_service="test"
        )
        assert event.timestamp.tzinfo is not None

    def test_base_event_complex_payload(self):
        """Test BaseEvent with complex nested payload."""
        event = BaseEvent(
            event_name="test",
            event_type="domain",
            source_service="test",
            payload={
                "nested": {"key": "value"},
                "list": [1, 2, 3],
                "string": "text",
                "number": 42.5,
                "bool": True
            }
        )
        assert event.payload["nested"]["key"] == "value"
        assert event.payload["list"] == [1, 2, 3]

    def test_base_event_missing_required_fields(self):
        """Test that required fields are enforced."""
        with pytest.raises(ValidationError):
            BaseEvent(event_name="test")

    def test_base_event_serialization(self):
        """Test serialization."""
        event = BaseEvent(
            event_name="test.event",
            event_type="domain",
            source_service="test-service",
            payload={"key": "value"}
        )
        data = event.model_dump()
        assert data["event_name"] == "test.event"
        assert data["event_type"] == "domain"
        assert data["payload"]["key"] == "value"

        json_str = event.model_dump_json()
        assert "test.event" in json_str


class TestTranscriptCompletedEvent:
    """Tests for TranscriptCompletedEvent model."""

    def test_transcript_completed_event_valid(self):
        """Test creating a TranscriptCompletedEvent."""
        event = TranscriptCompletedEvent(
            source_service="transcript-processor-svc",
            payload={"job_id": "job-123", "status": "completed"}
        )
        assert event.event_name == "transcript.completed"
        assert event.event_type == "domain"
        assert event.source_service == "transcript-processor-svc"

    def test_transcript_completed_event_frozen_fields(self):
        """Test that event_name and event_type are fixed."""
        event = TranscriptCompletedEvent(
            source_service="test-svc"
        )
        assert event.event_name == "transcript.completed"
        assert event.event_type == "domain"

    def test_transcript_completed_event_with_correlation_id(self):
        """Test with correlation ID."""
        event = TranscriptCompletedEvent(
            source_service="test-svc",
            correlation_id="job-123"
        )
        assert event.correlation_id == "job-123"

    def test_transcript_completed_event_serialization(self):
        """Test serialization."""
        event = TranscriptCompletedEvent(
            source_service="transcript-processor-svc",
            payload={"job_id": "job-456"}
        )
        json_str = event.model_dump_json()
        assert "transcript.completed" in json_str


class TestLeadQualifiedEvent:
    """Tests for LeadQualifiedEvent model."""

    def test_lead_qualified_event_valid(self):
        """Test creating a LeadQualifiedEvent."""
        event = LeadQualifiedEvent(
            source_service="lead-qualifier-svc",
            payload={"lead_id": "lead-123", "tier": "hot"}
        )
        assert event.event_name == "lead.qualified"
        assert event.event_type == "domain"
        assert event.source_service == "lead-qualifier-svc"

    def test_lead_qualified_event_frozen_fields(self):
        """Test that event_name and event_type are fixed."""
        event = LeadQualifiedEvent(
            source_service="test-svc"
        )
        assert event.event_name == "lead.qualified"
        assert event.event_type == "domain"

    def test_lead_qualified_event_with_payload(self):
        """Test with detailed payload."""
        event = LeadQualifiedEvent(
            source_service="lead-qualifier-svc",
            correlation_id="lead-456",
            payload={
                "lead_id": "lead-456",
                "qualification_score": 85.5,
                "tier": "hot",
                "recommended_action": "Call immediately"
            }
        )
        assert event.payload["tier"] == "hot"
        assert event.correlation_id == "lead-456"

    def test_lead_qualified_event_serialization(self):
        """Test serialization."""
        event = LeadQualifiedEvent(
            source_service="lead-qualifier-svc",
            payload={"lead_id": "lead-789"}
        )
        json_str = event.model_dump_json()
        assert "lead.qualified" in json_str


class TestUsageTrackingEvent:
    """Tests for UsageTrackingEvent model."""

    def test_usage_tracking_event_valid(self):
        """Test creating a UsageTrackingEvent."""
        event = UsageTrackingEvent(
            source_service="transcript-processor-svc",
            payload={
                "customer_id": "cust-123",
                "service_name": "transcript-processor",
                "cost_usd": 0.05
            }
        )
        assert event.event_name == "usage.tracked"
        assert event.event_type == "system"

    def test_usage_tracking_event_frozen_fields(self):
        """Test that event_name and event_type are fixed."""
        event = UsageTrackingEvent(
            source_service="test-svc"
        )
        assert event.event_name == "usage.tracked"
        assert event.event_type == "system"

    def test_usage_tracking_event_payload(self):
        """Test usage tracking with typical payload."""
        event = UsageTrackingEvent(
            source_service="embedding-svc",
            payload={
                "customer_id": "cust-456",
                "service_name": "embedding-svc",
                "action": "embed",
                "quantity": 1000,
                "cost_usd": 0.10
            }
        )
        assert event.payload["quantity"] == 1000
        assert event.payload["cost_usd"] == 0.10

    def test_usage_tracking_event_serialization(self):
        """Test serialization."""
        event = UsageTrackingEvent(
            source_service="test-svc",
            payload={"customer_id": "cust-789"}
        )
        json_str = event.model_dump_json()
        assert "usage.tracked" in json_str
        assert "system" in json_str


class TestEventInheritance:
    """Tests for event inheritance and specialization."""

    def test_all_events_have_base_event_fields(self):
        """Test that all events inherit from BaseEvent."""
        events = [
            TranscriptCompletedEvent(source_service="test"),
            LeadQualifiedEvent(source_service="test"),
            UsageTrackingEvent(source_service="test"),
        ]

        for event in events:
            assert hasattr(event, "event_id")
            assert hasattr(event, "timestamp")
            assert hasattr(event, "source_service")
            assert event.event_id is not None
            assert event.timestamp is not None

    def test_event_polymorphism(self):
        """Test that specialized events work as BaseEvent."""
        event: BaseEvent = TranscriptCompletedEvent(
            source_service="test-svc"
        )
        assert isinstance(event, BaseEvent)
        assert event.event_name == "transcript.completed"

    def test_multiple_events_different_ids(self):
        """Test that multiple events have unique IDs."""
        events = [
            BaseEvent(
                event_name=f"test-{i}",
                event_type="domain",
                source_service="test"
            )
            for i in range(5)
        ]

        event_ids = [e.event_id for e in events]
        assert len(event_ids) == len(set(event_ids))  # All unique
