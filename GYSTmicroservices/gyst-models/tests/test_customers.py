"""Tests for customer models."""

import pytest
from pydantic import ValidationError
from gyst_models.customers import Customer, UsageEvent, PlanLimits


class TestCustomer:
    """Tests for Customer model."""

    def test_customer_valid_minimal(self):
        """Test creating a Customer with required fields only."""
        customer = Customer(
            id="cust-123",
            email="john@example.com",
            api_key="sk_live_1234567890abcdef"
        )
        assert customer.id == "cust-123"
        assert customer.email == "john@example.com"
        assert customer.api_key == "sk_live_1234567890abcdef"
        assert customer.plan == "free"
        assert customer.status == "active"
        assert customer.name is None
        assert customer.company is None

    def test_customer_valid_all_fields(self):
        """Test Customer with all fields."""
        customer = Customer(
            id="cust-456",
            email="jane@company.com",
            name="Jane Doe",
            company="Acme Corp",
            plan="pro",
            status="active",
            api_key="sk_live_abcdefghijklmnop"
        )
        assert customer.name == "Jane Doe"
        assert customer.company == "Acme Corp"
        assert customer.plan == "pro"

    def test_customer_plan_default(self):
        """Test plan defaults to 'free'."""
        customer = Customer(
            id="cust-789",
            email="test@example.com",
            api_key="sk_live_1234567890abcdef"
        )
        assert customer.plan == "free"

    def test_customer_status_default(self):
        """Test status defaults to 'active'."""
        customer = Customer(
            id="cust-789",
            email="test@example.com",
            api_key="sk_live_1234567890abcdef"
        )
        assert customer.status == "active"

    def test_customer_plan_valid_values(self):
        """Test all valid plan values."""
        for plan in ["free", "starter", "pro", "enterprise"]:
            customer = Customer(
                id="cust-test",
                email="test@example.com",
                api_key="sk_live_1234567890abcdef",
                plan=plan
            )
            assert customer.plan == plan

    def test_customer_plan_invalid(self):
        """Test invalid plan value."""
        with pytest.raises(ValidationError):
            Customer(
                id="cust-test",
                email="test@example.com",
                api_key="sk_live_1234567890abcdef",
                plan="invalid_plan"
            )

    def test_customer_status_valid_values(self):
        """Test all valid status values."""
        for status in ["active", "suspended", "cancelled"]:
            customer = Customer(
                id="cust-test",
                email="test@example.com",
                api_key="sk_live_1234567890abcdef",
                status=status
            )
            assert customer.status == status

    def test_customer_status_invalid(self):
        """Test invalid status value."""
        with pytest.raises(ValidationError):
            Customer(
                id="cust-test",
                email="test@example.com",
                api_key="sk_live_1234567890abcdef",
                status="inactive"
            )

    def test_customer_api_key_too_short(self):
        """Test API key must be at least 20 chars."""
        with pytest.raises(ValidationError):
            Customer(
                id="cust-test",
                email="test@example.com",
                api_key="short"
            )

    def test_customer_api_key_valid_length(self):
        """Test API key with exactly 20 chars."""
        customer = Customer(
            id="cust-test",
            email="test@example.com",
            api_key="12345678901234567890"
        )
        assert customer.api_key == "12345678901234567890"

    def test_customer_invalid_email(self):
        """Test invalid email."""
        with pytest.raises(ValidationError):
            Customer(
                id="cust-test",
                email="not-an-email",
                api_key="sk_live_1234567890abcdef"
            )

    def test_customer_timestamp(self):
        """Test that created_at is set and timezone-aware."""
        customer = Customer(
            id="cust-test",
            email="test@example.com",
            api_key="sk_live_1234567890abcdef"
        )
        assert customer.created_at is not None
        assert customer.created_at.tzinfo is not None

    def test_customer_serialization(self):
        """Test serialization."""
        customer = Customer(
            id="cust-test",
            email="test@example.com",
            api_key="sk_live_1234567890abcdef",
            plan="pro"
        )
        data = customer.model_dump()
        assert data["id"] == "cust-test"
        assert data["plan"] == "pro"
        assert "created_at" in data


class TestUsageEvent:
    """Tests for UsageEvent model."""

    def test_usage_event_valid(self):
        """Test creating a valid UsageEvent."""
        usage = UsageEvent(
            customer_id="cust-123",
            service_name="transcript-processor",
            service_action="transcribe",
            cost_usd=0.05
        )
        assert usage.customer_id == "cust-123"
        assert usage.service_name == "transcript-processor"
        assert usage.service_action == "transcribe"
        assert usage.cost_usd == 0.05
        assert usage.quantity == 1
        assert usage.unit == "request"

    def test_usage_event_all_fields(self):
        """Test UsageEvent with all fields."""
        usage = UsageEvent(
            customer_id="cust-456",
            service_name="embedding-svc",
            service_action="embed",
            quantity=1000,
            unit="token",
            cost_usd=0.50
        )
        assert usage.quantity == 1000
        assert usage.unit == "token"

    def test_usage_event_quantity_default(self):
        """Test quantity defaults to 1."""
        usage = UsageEvent(
            customer_id="cust-test",
            service_name="test",
            service_action="test",
            cost_usd=0.0
        )
        assert usage.quantity == 1

    def test_usage_event_unit_default(self):
        """Test unit defaults to 'request'."""
        usage = UsageEvent(
            customer_id="cust-test",
            service_name="test",
            service_action="test",
            cost_usd=0.0
        )
        assert usage.unit == "request"

    def test_usage_event_quantity_validation(self):
        """Test quantity must be >= 1."""
        with pytest.raises(ValidationError):
            UsageEvent(
                customer_id="cust-test",
                service_name="test",
                service_action="test",
                quantity=0,
                cost_usd=0.0
            )

    def test_usage_event_quantity_max(self):
        """Test quantity max value."""
        usage = UsageEvent(
            customer_id="cust-test",
            service_name="test",
            service_action="test",
            quantity=1000000,
            cost_usd=0.0
        )
        assert usage.quantity == 1000000

    def test_usage_event_cost_zero(self):
        """Test cost can be zero."""
        usage = UsageEvent(
            customer_id="cust-test",
            service_name="test",
            service_action="test",
            cost_usd=0.0
        )
        assert usage.cost_usd == 0.0

    def test_usage_event_cost_negative(self):
        """Test cost cannot be negative."""
        with pytest.raises(ValidationError):
            UsageEvent(
                customer_id="cust-test",
                service_name="test",
                service_action="test",
                cost_usd=-0.01
            )

    def test_usage_event_timestamp(self):
        """Test timestamp is timezone-aware."""
        usage = UsageEvent(
            customer_id="cust-test",
            service_name="test",
            service_action="test",
            cost_usd=0.0
        )
        assert usage.timestamp is not None
        assert usage.timestamp.tzinfo is not None

    def test_usage_event_serialization(self):
        """Test serialization."""
        usage = UsageEvent(
            customer_id="cust-123",
            service_name="transcript-processor",
            service_action="transcribe",
            quantity=5,
            unit="request",
            cost_usd=0.25
        )
        data = usage.model_dump()
        assert data["customer_id"] == "cust-123"
        assert data["quantity"] == 5
        assert data["cost_usd"] == 0.25


class TestPlanLimits:
    """Tests for PlanLimits model."""

    def test_plan_limits_valid(self):
        """Test creating PlanLimits."""
        limits = PlanLimits(
            plan="pro",
            requests_per_month=50000,
            requests_per_minute=100,
            max_concurrent=10,
            max_file_size_mb=500,
            storage_gb=100.0
        )
        assert limits.plan == "pro"
        assert limits.requests_per_month == 50000
        assert limits.requests_per_minute == 100
        assert limits.max_concurrent == 10
        assert limits.max_file_size_mb == 500
        assert limits.storage_gb == 100.0

    def test_plan_limits_minimal(self):
        """Test PlanLimits with minimal fields."""
        limits = PlanLimits(plan="free")
        assert limits.plan == "free"
        assert limits.requests_per_month is None
        assert limits.requests_per_minute is None
        assert limits.max_concurrent is None
        assert limits.max_file_size_mb is None
        assert limits.storage_gb is None

    def test_plan_limits_valid_plans(self):
        """Test all valid plan values."""
        for plan in ["free", "starter", "pro", "enterprise"]:
            limits = PlanLimits(plan=plan)
            assert limits.plan == plan

    def test_plan_limits_invalid_plan(self):
        """Test invalid plan value."""
        with pytest.raises(ValidationError):
            PlanLimits(plan="invalid")

    def test_plan_limits_requests_per_month_validation(self):
        """Test requests_per_month must be >= 1 if set."""
        with pytest.raises(ValidationError):
            PlanLimits(plan="free", requests_per_month=0)

    def test_plan_limits_requests_per_minute_validation(self):
        """Test requests_per_minute must be >= 1 if set."""
        with pytest.raises(ValidationError):
            PlanLimits(plan="free", requests_per_minute=0)

    def test_plan_limits_max_concurrent_validation(self):
        """Test max_concurrent must be >= 1 if set."""
        with pytest.raises(ValidationError):
            PlanLimits(plan="free", max_concurrent=0)

    def test_plan_limits_file_size_validation(self):
        """Test max_file_size_mb must be >= 1 if set."""
        with pytest.raises(ValidationError):
            PlanLimits(plan="free", max_file_size_mb=0)

    def test_plan_limits_storage_validation(self):
        """Test storage_gb must be >= 0 if set."""
        limits = PlanLimits(plan="free", storage_gb=0.0)
        assert limits.storage_gb == 0.0

        with pytest.raises(ValidationError):
            PlanLimits(plan="free", storage_gb=-0.1)

    def test_plan_limits_serialization(self):
        """Test serialization."""
        limits = PlanLimits(
            plan="enterprise",
            requests_per_month=1000000,
            storage_gb=1000.0
        )
        data = limits.model_dump()
        assert data["plan"] == "enterprise"
        assert data["requests_per_month"] == 1000000
        assert data["storage_gb"] == 1000.0
