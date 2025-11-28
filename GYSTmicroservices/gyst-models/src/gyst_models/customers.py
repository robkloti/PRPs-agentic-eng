"""Customer and billing-related models for SaaS operations."""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime, timezone


class Customer(BaseModel):
    """Customer record for SaaS external mode.

    This model represents a customer in the external SaaS platform.
    Used to track subscription status, API key, and plan information.

    Attributes:
        id: Unique customer identifier
        email: Customer email address
        name: Customer/company name
        company: Company name (if different from name)
        plan: Subscription plan tier
        status: Account status (active, suspended, cancelled)
        api_key: API key for authentication
        created_at: When account was created (UTC)

    Example:
        >>> customer = Customer(
        ...     id="cust-123",
        ...     email="john@company.com",
        ...     name="John Doe",
        ...     company="Acme Corp",
        ...     plan="pro",
        ...     status="active",
        ...     api_key="sk_live_123456789"
        ... )
        >>> customer.plan
        'pro'
    """

    id: str = Field(
        ...,
        description="Unique customer identifier",
        min_length=1,
        max_length=256
    )
    email: EmailStr = Field(
        ...,
        description="Customer email address"
    )
    name: Optional[str] = Field(
        default=None,
        description="Customer or primary contact name",
        max_length=256
    )
    company: Optional[str] = Field(
        default=None,
        description="Company name",
        max_length=256
    )
    plan: Literal["free", "starter", "pro", "enterprise"] = Field(
        default="free",
        description="Subscription plan tier"
    )
    status: Literal["active", "suspended", "cancelled"] = Field(
        default="active",
        description="Account status"
    )
    api_key: str = Field(
        ...,
        description="API key for authentication",
        min_length=20,
        max_length=256
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When account was created (UTC)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "cust-456",
                "email": "john@company.com",
                "name": "John Doe",
                "company": "Acme Corp",
                "plan": "pro",
                "status": "active",
                "api_key": "sk_live_1234567890abcdef",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }
    }


class UsageEvent(BaseModel):
    """Usage tracking event for billing.

    This model represents a single usage/billing event. Multiple events
    are aggregated over time to create invoices and track customer costs.

    Attributes:
        customer_id: Which customer performed the action
        service_name: Name of service used (transcript-processor, embedding-svc, etc.)
        service_action: Specific action (transcribe, embed, search, etc.)
        quantity: How many units of the action
        unit: Unit of measurement (request, minute, token, etc.)
        cost_usd: Cost in USD for this usage (non-negative)
        timestamp: When usage occurred (UTC)

    Example:
        >>> usage = UsageEvent(
        ...     customer_id="cust-123",
        ...     service_name="transcript-processor",
        ...     service_action="transcribe",
        ...     quantity=1,
        ...     unit="request",
        ...     cost_usd=0.05
        ... )
        >>> usage.cost_usd
        0.05
    """

    customer_id: str = Field(
        ...,
        description="Customer performing the action",
        min_length=1,
        max_length=256
    )
    service_name: str = Field(
        ...,
        description="Name of service used",
        min_length=1,
        max_length=256
    )
    service_action: str = Field(
        ...,
        description="Specific action performed",
        min_length=1,
        max_length=256
    )
    quantity: int = Field(
        default=1,
        description="Number of units",
        ge=1,
        le=1000000
    )
    unit: str = Field(
        default="request",
        description="Unit of measurement (request, minute, token, etc.)",
        min_length=1,
        max_length=50
    )
    cost_usd: float = Field(
        ...,
        description="Cost in USD",
        ge=0.0,
        le=1000000.0
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When usage occurred (UTC)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "customer_id": "cust-123",
                "service_name": "transcript-processor",
                "service_action": "transcribe",
                "quantity": 1,
                "unit": "request",
                "cost_usd": 0.05,
                "timestamp": "2024-01-15T10:35:00Z"
            }
        }
    }


class PlanLimits(BaseModel):
    """Limits and quotas for a subscription plan.

    This model defines the usage limits for each plan tier.
    Used to enforce rate limiting and quota management.

    Attributes:
        plan: Which plan these limits apply to
        requests_per_month: Maximum API requests per month
        requests_per_minute: Maximum API requests per minute
        max_concurrent: Maximum concurrent requests
        max_file_size_mb: Maximum file size in MB
        storage_gb: Maximum storage in GB

    Example:
        >>> limits = PlanLimits(
        ...     plan="pro",
        ...     requests_per_month=50000,
        ...     requests_per_minute=100,
        ...     max_concurrent=10,
        ...     max_file_size_mb=500,
        ...     storage_gb=100
        ... )
        >>> limits.requests_per_month
        50000
    """

    plan: Literal["free", "starter", "pro", "enterprise"] = Field(
        ...,
        description="Plan tier"
    )
    requests_per_month: Optional[int] = Field(
        default=None,
        description="Maximum API requests per month",
        ge=1
    )
    requests_per_minute: Optional[int] = Field(
        default=None,
        description="Maximum API requests per minute",
        ge=1
    )
    max_concurrent: Optional[int] = Field(
        default=None,
        description="Maximum concurrent requests",
        ge=1
    )
    max_file_size_mb: Optional[int] = Field(
        default=None,
        description="Maximum file size in MB",
        ge=1
    )
    storage_gb: Optional[float] = Field(
        default=None,
        description="Maximum storage in GB",
        ge=0.0
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "plan": "pro",
                "requests_per_month": 50000,
                "requests_per_minute": 100,
                "max_concurrent": 10,
                "max_file_size_mb": 500,
                "storage_gb": 100.0
            }
        }
    }
