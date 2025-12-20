"""Billing and usage tracking system for transcript-processor service.

Provides pricing models, usage event tracking, and cost calculations for:
- Multiple transcription providers (VAPI, Retell)
- Different customer plans (free, starter, pro, enterprise)
- Usage-based billing (cost per minute of audio processed)
- Usage limits and quota enforcement
- Monthly billing cycles and cost tracking

Architecture:
- PricingModel: Defines costs per provider and plan
- UsageEvent: Individual service usage tracking
- UsageSummary: Aggregated usage metrics
- BillingService: High-level billing operations
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
from pydantic import BaseModel, Field

from .database import DatabaseClient, UsageRepository
from .config import ConfigManager


logger = logging.getLogger(__name__)


class Plan(str, Enum):
    """Customer billing plans."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Provider(str, Enum):
    """Transcription service providers."""

    VAPI = "vapi"
    RETELL = "retell"


class PricingModel(BaseModel):
    """Pricing configuration for transcription services.

    Attributes:
        provider: Transcription provider (vapi, retell)
        plan: Customer plan tier
        cost_per_minute: Cost in USD per minute of audio
        monthly_limit_minutes: Maximum minutes per month (None = unlimited)
        monthly_limit_cost_usd: Maximum cost per month (None = unlimited)
        concurrent_job_limit: Maximum concurrent jobs (None = unlimited)
    """

    provider: str = Field(..., description="Provider name (vapi, retell)")
    plan: str = Field(..., description="Plan tier (free, starter, pro, enterprise)")
    cost_per_minute: float = Field(..., ge=0.0, description="Cost per minute in USD")
    monthly_limit_minutes: Optional[int] = Field(
        default=None,
        ge=1,
        description="Monthly minute limit (None = unlimited)"
    )
    monthly_limit_cost_usd: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Monthly cost limit in USD (None = unlimited)"
    )
    concurrent_job_limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum concurrent jobs"
    )


class UsageEvent(BaseModel):
    """Single usage event for a transcription.

    Attributes:
        customer_id: Customer ID for isolation
        job_id: Associated transcription job ID
        provider: Transcription provider used
        duration_seconds: Duration of audio processed
        cost_usd: Cost of this transcription
        timestamp: When the usage was recorded
    """

    customer_id: str = Field(..., description="Customer ID")
    job_id: str = Field(..., description="Transcription job ID")
    provider: str = Field(..., description="Provider used (vapi, retell)")
    duration_seconds: float = Field(..., ge=0.0, description="Audio duration")
    cost_usd: float = Field(default=0.0, ge=0.0, description="Cost in USD")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UsageSummary(BaseModel):
    """Aggregated usage metrics for a customer.

    Attributes:
        customer_id: Customer ID
        period_start: Start of billing period
        period_end: End of billing period
        total_minutes: Total minutes processed
        total_cost_usd: Total cost in USD
        job_count: Number of transcriptions
        provider_breakdown: Cost per provider
        daily_breakdown: Cost per day
    """

    customer_id: str = Field(..., description="Customer ID")
    period_start: datetime = Field(..., description="Billing period start")
    period_end: datetime = Field(..., description="Billing period end")
    total_minutes: float = Field(default=0.0, ge=0.0, description="Total minutes")
    total_cost_usd: float = Field(default=0.0, ge=0.0, description="Total cost")
    job_count: int = Field(default=0, ge=0, description="Number of jobs")
    provider_breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Cost per provider"
    )
    daily_breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Cost per day"
    )


class PricingService:
    """Service for managing pricing models and cost calculations."""

    # Default pricing tiers
    DEFAULT_PRICING = {
        "vapi": {
            "free": {"cost_per_minute": 0.05, "monthly_limit_minutes": 60},
            "starter": {"cost_per_minute": 0.04, "monthly_limit_minutes": 1000},
            "pro": {"cost_per_minute": 0.03, "monthly_limit_cost_usd": 500.0},
            "enterprise": {"cost_per_minute": 0.02},
        },
        "retell": {
            "free": {"cost_per_minute": 0.06, "monthly_limit_minutes": 60},
            "starter": {"cost_per_minute": 0.05, "monthly_limit_minutes": 1000},
            "pro": {"cost_per_minute": 0.04, "monthly_limit_cost_usd": 600.0},
            "enterprise": {"cost_per_minute": 0.025},
        },
    }

    def __init__(self, config: Optional[ConfigManager] = None):
        """Initialize pricing service.

        Args:
            config: Optional configuration manager
        """
        self.config = config
        self.pricing_models: Dict[str, PricingModel] = {}
        self._init_default_pricing()

    def _init_default_pricing(self) -> None:
        """Initialize default pricing from hardcoded models."""
        for provider, plans in self.DEFAULT_PRICING.items():
            for plan, pricing_info in plans.items():
                key = f"{provider}:{plan}"
                self.pricing_models[key] = PricingModel(
                    provider=provider,
                    plan=plan,
                    cost_per_minute=pricing_info.get("cost_per_minute", 0.0),
                    monthly_limit_minutes=pricing_info.get("monthly_limit_minutes"),
                    monthly_limit_cost_usd=pricing_info.get("monthly_limit_cost_usd"),
                )

    def get_pricing(self, provider: str, plan: str) -> Optional[PricingModel]:
        """Get pricing model for provider and plan.

        Args:
            provider: Provider name (vapi, retell)
            plan: Plan tier (free, starter, pro, enterprise)

        Returns:
            PricingModel if found, None otherwise
        """
        key = f"{provider.lower()}:{plan.lower()}"
        return self.pricing_models.get(key)

    def calculate_cost(
        self,
        duration_seconds: float,
        provider: str,
        plan: str,
    ) -> float:
        """Calculate cost for a transcription.

        Args:
            duration_seconds: Duration of audio in seconds
            provider: Provider name
            plan: Customer plan

        Returns:
            Cost in USD

        Raises:
            ValueError: If provider/plan combination not found
        """
        pricing = self.get_pricing(provider, plan)
        if not pricing:
            raise ValueError(f"Pricing not found for {provider}:{plan}")

        duration_minutes = duration_seconds / 60.0
        cost = duration_minutes * pricing.cost_per_minute

        return round(cost, 4)  # Round to 4 decimals for currency

    def set_pricing(self, pricing_model: PricingModel) -> None:
        """Set or override pricing model.

        Args:
            pricing_model: PricingModel to set
        """
        key = f"{pricing_model.provider.lower()}:{pricing_model.plan.lower()}"
        self.pricing_models[key] = pricing_model
        logger.info(f"Updated pricing model: {key}")


class BillingService:
    """High-level billing service for usage tracking and cost management."""

    def __init__(self, db: DatabaseClient, pricing_service: Optional[PricingService] = None):
        """Initialize billing service.

        Args:
            db: Database client instance
            pricing_service: Pricing service (default created if None)
        """
        self.db = db
        self.usage_repo = UsageRepository(db)
        self.pricing_service = pricing_service or PricingService()

    async def record_transcription(
        self,
        customer_id: str,
        job_id: str,
        provider: str,
        duration_seconds: float,
        plan: str = "free",
    ) -> Dict[str, Any]:
        """Record a completed transcription for billing.

        Calculates cost and creates a usage event in the database.

        Args:
            customer_id: Customer ID
            job_id: Transcription job ID
            provider: Provider used (vapi, retell)
            duration_seconds: Duration of audio in seconds
            plan: Customer plan tier

        Returns:
            Dictionary with event_id and cost_usd

        Raises:
            ValueError: If provider/plan not configured
            Exception: If database operation fails
        """
        # Calculate cost
        cost_usd = self.pricing_service.calculate_cost(
            duration_seconds,
            provider,
            plan
        )

        # Record usage event
        event = await self.usage_repo.create(
            customer_id=customer_id,
            service_name="transcript-processor",
            service_action=f"transcribe_{provider}",
            quantity=int(duration_seconds / 60),  # Quantity in minutes
            unit="minute",
            cost_usd=cost_usd,
        )

        logger.info(
            f"Recorded transcription: customer={customer_id}, "
            f"job={job_id}, cost=${cost_usd:.4f}"
        )

        return {
            "event_id": event.get("id"),
            "job_id": job_id,
            "cost_usd": cost_usd,
            "duration_seconds": duration_seconds,
        }

    async def get_usage_summary(
        self,
        customer_id: str,
        days: int = 30,
    ) -> UsageSummary:
        """Get usage summary for a customer over a period.

        Args:
            customer_id: Customer ID
            days: Number of days to include (default 30)

        Returns:
            UsageSummary with aggregated metrics
        """
        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=days)

        # Get all usage events for the period
        events = await self.usage_repo.list_by_customer(
            customer_id,
            limit=10000,  # Get all events
        )

        # Filter by date range
        period_events = [
            e for e in events
            if datetime.fromisoformat(e["timestamp"].replace('Z', '+00:00')) >= period_start
        ]

        # Calculate aggregates
        total_cost = sum(e.get("cost_usd", 0.0) for e in period_events)
        total_minutes = sum(e.get("quantity", 0) for e in period_events)

        # Provider breakdown
        provider_breakdown = {}
        daily_breakdown = {}

        for event in period_events:
            # Provider breakdown
            action = event.get("service_action", "")
            if "vapi" in action:
                provider_breakdown["vapi"] = provider_breakdown.get("vapi", 0.0) + event.get("cost_usd", 0.0)
            elif "retell" in action:
                provider_breakdown["retell"] = provider_breakdown.get("retell", 0.0) + event.get("cost_usd", 0.0)

            # Daily breakdown
            timestamp = event.get("timestamp", "")
            if isinstance(timestamp, str):
                date = timestamp.split("T")[0]
            else:
                date = timestamp.date().isoformat()
            daily_breakdown[date] = daily_breakdown.get(date, 0.0) + event.get("cost_usd", 0.0)

        return UsageSummary(
            customer_id=customer_id,
            period_start=period_start,
            period_end=now,
            total_minutes=float(total_minutes),
            total_cost_usd=round(total_cost, 2),
            job_count=len(period_events),
            provider_breakdown=provider_breakdown,
            daily_breakdown=daily_breakdown,
        )

    async def check_limits(
        self,
        customer_id: str,
        provider: str,
        duration_seconds: float,
        plan: str = "free",
    ) -> Dict[str, Any]:
        """Check if a transcription would exceed plan limits.

        Args:
            customer_id: Customer ID
            provider: Provider name
            duration_seconds: Duration of audio in seconds
            plan: Customer plan

        Returns:
            Dictionary with:
              - within_limits: bool
              - cost: float
              - remaining_minutes: Optional[float]
              - remaining_cost: Optional[float]
              - reason: Optional[str] (if limit exceeded)

        Raises:
            ValueError: If provider/plan not configured
        """
        pricing = self.pricing_service.get_pricing(provider, plan)
        if not pricing:
            raise ValueError(f"Pricing not found for {provider}:{plan}")

        # Calculate cost for this transcription
        cost = self.pricing_service.calculate_cost(duration_seconds, provider, plan)
        duration_minutes = duration_seconds / 60.0

        # Get current month's usage
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        events = await self.usage_repo.list_by_customer(
            customer_id,
            limit=10000,
        )

        month_events = [
            e for e in events
            if datetime.fromisoformat(e["timestamp"].replace('Z', '+00:00')) >= month_start
        ]

        month_minutes = sum(e.get("quantity", 0) for e in month_events)
        month_cost = sum(e.get("cost_usd", 0.0) for e in month_events)

        result = {
            "within_limits": True,
            "cost": round(cost, 4),
            "remaining_minutes": None,
            "remaining_cost": None,
            "reason": None,
        }

        # Check minute limit
        if pricing.monthly_limit_minutes:
            new_total_minutes = month_minutes + duration_minutes
            if new_total_minutes > pricing.monthly_limit_minutes:
                result["within_limits"] = False
                result["remaining_minutes"] = max(0, pricing.monthly_limit_minutes - month_minutes)
                result["reason"] = f"Exceeds monthly minute limit of {pricing.monthly_limit_minutes}"
                return result

        # Check cost limit
        if pricing.monthly_limit_cost_usd:
            new_total_cost = month_cost + cost
            if new_total_cost > pricing.monthly_limit_cost_usd:
                result["within_limits"] = False
                result["remaining_cost"] = max(0.0, pricing.monthly_limit_cost_usd - month_cost)
                result["reason"] = f"Exceeds monthly cost limit of ${pricing.monthly_limit_cost_usd:.2f}"
                return result

        result["remaining_minutes"] = (
            pricing.monthly_limit_minutes - month_minutes
            if pricing.monthly_limit_minutes
            else None
        )
        result["remaining_cost"] = (
            pricing.monthly_limit_cost_usd - month_cost
            if pricing.monthly_limit_cost_usd
            else None
        )

        return result
