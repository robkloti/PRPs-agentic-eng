"""Tests for billing and usage tracking system."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.billing import (
    Plan,
    Provider,
    PricingModel,
    UsageEvent,
    UsageSummary,
    PricingService,
    BillingService,
)
from transcript_processor.database import DatabaseClient


class TestPlan:
    """Tests for Plan enum."""

    def test_plan_values(self):
        """Test that all plan values are defined."""
        assert Plan.FREE == "free"
        assert Plan.STARTER == "starter"
        assert Plan.PRO == "pro"
        assert Plan.ENTERPRISE == "enterprise"


class TestProvider:
    """Tests for Provider enum."""

    def test_provider_values(self):
        """Test that all provider values are defined."""
        assert Provider.VAPI == "vapi"
        assert Provider.RETELL == "retell"


class TestPricingModel:
    """Tests for PricingModel class."""

    def test_creation_minimal(self):
        """Test creating pricing model with minimal fields."""
        pricing = PricingModel(
            provider="vapi",
            plan="free",
            cost_per_minute=0.05
        )
        assert pricing.provider == "vapi"
        assert pricing.plan == "free"
        assert pricing.cost_per_minute == 0.05
        assert pricing.monthly_limit_minutes is None
        assert pricing.monthly_limit_cost_usd is None

    def test_creation_full(self):
        """Test creating pricing model with all fields."""
        pricing = PricingModel(
            provider="retell",
            plan="pro",
            cost_per_minute=0.03,
            monthly_limit_minutes=5000,
            monthly_limit_cost_usd=500.0,
            concurrent_job_limit=100
        )
        assert pricing.provider == "retell"
        assert pricing.plan == "pro"
        assert pricing.cost_per_minute == 0.03
        assert pricing.monthly_limit_minutes == 5000
        assert pricing.monthly_limit_cost_usd == 500.0
        assert pricing.concurrent_job_limit == 100

    def test_invalid_cost_negative(self):
        """Test that negative cost is rejected."""
        with pytest.raises(ValueError):
            PricingModel(
                provider="vapi",
                plan="free",
                cost_per_minute=-0.01
            )

    def test_invalid_monthly_limit_zero(self):
        """Test that zero monthly limit is rejected."""
        with pytest.raises(ValueError):
            PricingModel(
                provider="vapi",
                plan="free",
                cost_per_minute=0.05,
                monthly_limit_minutes=0
            )


class TestUsageEvent:
    """Tests for UsageEvent class."""

    def test_creation_minimal(self):
        """Test creating usage event with minimal fields."""
        event = UsageEvent(
            customer_id="cust-123",
            job_id="job-456",
            provider="vapi",
            duration_seconds=30.0
        )
        assert event.customer_id == "cust-123"
        assert event.job_id == "job-456"
        assert event.provider == "vapi"
        assert event.duration_seconds == 30.0
        assert event.cost_usd == 0.0
        assert event.timestamp is not None

    def test_creation_with_cost(self):
        """Test creating usage event with cost."""
        event = UsageEvent(
            customer_id="cust-123",
            job_id="job-456",
            provider="retell",
            duration_seconds=60.0,
            cost_usd=2.50
        )
        assert event.cost_usd == 2.50

    def test_invalid_duration_negative(self):
        """Test that negative duration is rejected."""
        with pytest.raises(ValueError):
            UsageEvent(
                customer_id="cust-123",
                job_id="job-456",
                provider="vapi",
                duration_seconds=-5.0
            )


class TestUsageSummary:
    """Tests for UsageSummary class."""

    def test_creation_minimal(self):
        """Test creating usage summary with minimal fields."""
        now = datetime.now(timezone.utc)
        summary = UsageSummary(
            customer_id="cust-123",
            period_start=now - timedelta(days=30),
            period_end=now
        )
        assert summary.customer_id == "cust-123"
        assert summary.total_minutes == 0.0
        assert summary.total_cost_usd == 0.0
        assert summary.job_count == 0
        assert summary.provider_breakdown == {}

    def test_creation_with_data(self):
        """Test creating usage summary with data."""
        now = datetime.now(timezone.utc)
        summary = UsageSummary(
            customer_id="cust-123",
            period_start=now - timedelta(days=30),
            period_end=now,
            total_minutes=150.0,
            total_cost_usd=5.50,
            job_count=5,
            provider_breakdown={"vapi": 3.00, "retell": 2.50}
        )
        assert summary.total_minutes == 150.0
        assert summary.total_cost_usd == 5.50
        assert summary.job_count == 5
        assert summary.provider_breakdown["vapi"] == 3.00


class TestPricingService:
    """Tests for PricingService."""

    def test_init(self):
        """Test pricing service initialization."""
        service = PricingService()
        assert len(service.pricing_models) > 0

    def test_default_pricing_loaded(self):
        """Test that default pricing is loaded."""
        service = PricingService()
        # Check that we have VAPI and Retell pricing
        assert "vapi:free" in service.pricing_models
        assert "retell:free" in service.pricing_models
        assert "vapi:enterprise" in service.pricing_models

    def test_get_pricing_found(self):
        """Test getting existing pricing model."""
        service = PricingService()
        pricing = service.get_pricing("vapi", "free")
        assert pricing is not None
        assert pricing.provider == "vapi"
        assert pricing.plan == "free"
        assert pricing.cost_per_minute > 0

    def test_get_pricing_not_found(self):
        """Test getting non-existent pricing model."""
        service = PricingService()
        pricing = service.get_pricing("invalid", "invalid")
        assert pricing is None

    def test_get_pricing_case_insensitive(self):
        """Test that pricing lookup is case-insensitive."""
        service = PricingService()
        pricing1 = service.get_pricing("VAPI", "FREE")
        pricing2 = service.get_pricing("vapi", "free")
        assert pricing1 is not None
        assert pricing2 is not None
        assert pricing1.cost_per_minute == pricing2.cost_per_minute

    def test_calculate_cost_basic(self):
        """Test basic cost calculation."""
        service = PricingService()
        # 1 minute at $0.05/min should be $0.05
        cost = service.calculate_cost(60.0, "vapi", "free")
        assert cost == 0.05

    def test_calculate_cost_multiple_minutes(self):
        """Test cost calculation for multiple minutes."""
        service = PricingService()
        # 10 minutes at $0.05/min = $0.50
        cost = service.calculate_cost(600.0, "vapi", "free")
        assert cost == 0.50

    def test_calculate_cost_partial_minute(self):
        """Test cost calculation for partial minute."""
        service = PricingService()
        # 30 seconds at $0.05/min = $0.025
        cost = service.calculate_cost(30.0, "vapi", "free")
        assert cost == 0.025

    def test_calculate_cost_retell_different_price(self):
        """Test that Retell has different pricing than VAPI."""
        service = PricingService()
        vapi_cost = service.calculate_cost(60.0, "vapi", "free")
        retell_cost = service.calculate_cost(60.0, "retell", "free")
        # Retell should be more expensive in free tier
        assert retell_cost > vapi_cost

    def test_calculate_cost_plan_difference(self):
        """Test that pricing varies by plan."""
        service = PricingService()
        free_cost = service.calculate_cost(60.0, "vapi", "free")
        starter_cost = service.calculate_cost(60.0, "vapi", "starter")
        # Starter should be cheaper than free
        assert starter_cost < free_cost

    def test_calculate_cost_invalid_plan(self):
        """Test cost calculation with invalid plan."""
        service = PricingService()
        with pytest.raises(ValueError, match="Pricing not found"):
            service.calculate_cost(60.0, "invalid", "invalid")

    def test_set_pricing(self):
        """Test setting custom pricing."""
        service = PricingService()
        new_pricing = PricingModel(
            provider="custom",
            plan="custom",
            cost_per_minute=0.10
        )
        service.set_pricing(new_pricing)
        assert "custom:custom" in service.pricing_models
        assert service.get_pricing("custom", "custom") is not None

    def test_set_pricing_override(self):
        """Test overriding existing pricing."""
        service = PricingService()
        old_pricing = service.get_pricing("vapi", "free")
        assert old_pricing is not None
        old_cost = old_pricing.cost_per_minute

        new_pricing = PricingModel(
            provider="vapi",
            plan="free",
            cost_per_minute=0.10
        )
        service.set_pricing(new_pricing)
        updated = service.get_pricing("vapi", "free")
        assert updated.cost_per_minute == 0.10
        assert updated.cost_per_minute != old_cost


class TestBillingService:
    """Tests for BillingService."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database client."""
        return Mock(spec=DatabaseClient)

    @pytest.fixture
    def billing_service(self, mock_db):
        """Create billing service with mock database."""
        return BillingService(mock_db)

    @pytest.mark.asyncio
    async def test_record_transcription_success(self, billing_service):
        """Test recording a transcription."""
        billing_service.usage_repo.create = AsyncMock(
            return_value={"id": "event-123", "cost_usd": 0.05}
        )

        result = await billing_service.record_transcription(
            customer_id="cust-123",
            job_id="job-456",
            provider="vapi",
            duration_seconds=60.0,
            plan="free"
        )

        assert result["job_id"] == "job-456"
        assert result["cost_usd"] == 0.05
        assert result["duration_seconds"] == 60.0
        billing_service.usage_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_record_transcription_different_providers(self, billing_service):
        """Test recording transcriptions with different providers."""
        billing_service.usage_repo.create = AsyncMock(
            return_value={"id": "event-123"}
        )

        # Record VAPI transcription
        result1 = await billing_service.record_transcription(
            customer_id="cust-123",
            job_id="job-1",
            provider="vapi",
            duration_seconds=60.0,
            plan="free"
        )

        # Record Retell transcription
        result2 = await billing_service.record_transcription(
            customer_id="cust-123",
            job_id="job-2",
            provider="retell",
            duration_seconds=60.0,
            plan="free"
        )

        # Retell should cost more in free tier
        assert result2["cost_usd"] > result1["cost_usd"]

    @pytest.mark.asyncio
    async def test_record_transcription_invalid_plan(self, billing_service):
        """Test recording with invalid plan."""
        with pytest.raises(ValueError):
            await billing_service.record_transcription(
                customer_id="cust-123",
                job_id="job-456",
                provider="vapi",
                duration_seconds=60.0,
                plan="invalid"
            )

    @pytest.mark.asyncio
    async def test_get_usage_summary_empty(self, billing_service):
        """Test getting usage summary for customer with no events."""
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=[])

        summary = await billing_service.get_usage_summary("cust-123")

        assert summary.customer_id == "cust-123"
        assert summary.total_minutes == 0.0
        assert summary.total_cost_usd == 0.0
        assert summary.job_count == 0

    @pytest.mark.asyncio
    async def test_get_usage_summary_with_events(self, billing_service):
        """Test getting usage summary with events."""
        now = datetime.now(timezone.utc)
        events = [
            {
                "id": "event-1",
                "quantity": 1,
                "cost_usd": 0.05,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
            {
                "id": "event-2",
                "quantity": 2,
                "cost_usd": 0.12,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_retell"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)

        summary = await billing_service.get_usage_summary("cust-123", days=30)

        assert summary.total_minutes == 3  # 1 + 2
        assert summary.total_cost_usd == 0.17
        assert summary.job_count == 2
        assert "vapi" in summary.provider_breakdown
        assert "retell" in summary.provider_breakdown

    @pytest.mark.asyncio
    async def test_get_usage_summary_filters_by_date(self, billing_service):
        """Test that usage summary filters by date."""
        now = datetime.now(timezone.utc)
        old_date = now - timedelta(days=60)

        events = [
            {
                "id": "event-1",
                "quantity": 1,
                "cost_usd": 0.05,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
            {
                "id": "event-2",
                "quantity": 1,
                "cost_usd": 0.05,
                "timestamp": old_date.isoformat(),
                "service_action": "transcribe_vapi"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)

        summary = await billing_service.get_usage_summary("cust-123", days=30)

        # Should only include recent event
        assert summary.job_count == 1
        assert summary.total_cost_usd == 0.05

    @pytest.mark.asyncio
    async def test_check_limits_within_limits(self, billing_service):
        """Test check_limits when within limits."""
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=[])

        result = await billing_service.check_limits(
            customer_id="cust-123",
            provider="vapi",
            duration_seconds=60.0,
            plan="free"
        )

        assert result["within_limits"] is True
        assert result["cost"] == 0.05
        assert result["reason"] is None

    @pytest.mark.asyncio
    async def test_check_limits_exceeds_minute_limit(self, billing_service):
        """Test check_limits when exceeding minute limit."""
        now = datetime.now(timezone.utc)
        # Simulate 59 minutes already used in free tier (60 minute limit)
        events = [
            {
                "id": "event-1",
                "quantity": 59,
                "cost_usd": 2.95,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)

        # Try to use 5 more minutes (would exceed 60 minute limit)
        result = await billing_service.check_limits(
            customer_id="cust-123",
            provider="vapi",
            duration_seconds=300.0,  # 5 minutes
            plan="free"
        )

        assert result["within_limits"] is False
        assert "Exceeds monthly minute limit" in result["reason"]
        assert result["remaining_minutes"] == 1  # 60 - 59

    @pytest.mark.asyncio
    async def test_check_limits_exceeds_cost_limit(self, billing_service):
        """Test check_limits when exceeding cost limit."""
        now = datetime.now(timezone.utc)
        # Simulate $450 spent out of $500 limit on Pro plan
        # At $0.03/min, that's 15,000 minutes
        events = [
            {
                "id": "event-1",
                "quantity": 15000,
                "cost_usd": 450.0,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)

        # Try to use 2000 more minutes (would cost $60 more, exceeding $500 limit)
        result = await billing_service.check_limits(
            customer_id="cust-123",
            provider="vapi",
            duration_seconds=120000.0,  # 2000 minutes = $60, total $510, exceeds $500
            plan="pro"
        )

        assert result["within_limits"] is False
        assert "Exceeds monthly cost limit" in result["reason"]

    @pytest.mark.asyncio
    async def test_check_limits_enterprise_no_limits(self, billing_service):
        """Test that enterprise plan has no limits."""
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=[])

        # Enterprise tier has no limits
        result = await billing_service.check_limits(
            customer_id="cust-123",
            provider="vapi",
            duration_seconds=10000.0,  # Very large
            plan="enterprise"
        )

        assert result["within_limits"] is True
        assert result["remaining_minutes"] is None
        assert result["remaining_cost"] is None

    @pytest.mark.asyncio
    async def test_check_limits_shows_remaining(self, billing_service):
        """Test that check_limits shows remaining resources."""
        now = datetime.now(timezone.utc)
        # Simulate 10 minutes already used
        events = [
            {
                "id": "event-1",
                "quantity": 10,
                "cost_usd": 0.40,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)

        result = await billing_service.check_limits(
            customer_id="cust-123",
            provider="vapi",
            duration_seconds=600.0,  # 10 more minutes
            plan="starter"  # Starter has 1000 minute limit
        )

        assert result["within_limits"] is True
        # remaining_minutes shows what's left after current month usage (before this request)
        # So: 1000 - 10 = 990 remaining
        assert result["remaining_minutes"] == 990


class TestBillingIntegration:
    """Integration tests for billing system."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database client."""
        return Mock(spec=DatabaseClient)

    @pytest.fixture
    def billing_service(self, mock_db):
        """Create billing service."""
        return BillingService(mock_db)

    @pytest.mark.asyncio
    async def test_full_billing_workflow(self, billing_service):
        """Test complete billing workflow: record and summarize."""
        now = datetime.now(timezone.utc)

        # Mock the usage repository
        events = [
            {
                "id": "event-1",
                "quantity": 10,
                "cost_usd": 0.50,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_vapi"
            },
            {
                "id": "event-2",
                "quantity": 5,
                "cost_usd": 0.30,
                "timestamp": now.isoformat(),
                "service_action": "transcribe_retell"
            },
        ]
        billing_service.usage_repo.list_by_customer = AsyncMock(return_value=events)
        billing_service.usage_repo.create = AsyncMock(
            return_value={"id": "event-3", "cost_usd": 0.30}
        )

        # Record a new transcription
        record_result = await billing_service.record_transcription(
            customer_id="cust-123",
            job_id="job-new",
            provider="retell",
            duration_seconds=300.0,
            plan="free"
        )

        assert record_result["job_id"] == "job-new"
        assert record_result["cost_usd"] > 0

        # Get usage summary
        summary = await billing_service.get_usage_summary("cust-123")

        assert summary.customer_id == "cust-123"
        assert summary.total_minutes == 15  # 10 + 5
        assert summary.total_cost_usd == 0.80  # 0.50 + 0.30

    @pytest.mark.asyncio
    async def test_pricing_service_with_billing(self, mock_db):
        """Test custom pricing service with billing."""
        custom_pricing = PricingService()

        # Set custom pricing
        custom_pricing.set_pricing(
            PricingModel(
                provider="test",
                plan="test",
                cost_per_minute=0.10
            )
        )

        billing = BillingService(mock_db, custom_pricing)

        # Calculate cost with custom pricing
        cost = billing.pricing_service.calculate_cost(60.0, "test", "test")
        assert cost == 0.10

