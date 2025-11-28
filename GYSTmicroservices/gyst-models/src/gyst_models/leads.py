"""Lead-related models for qualification and management."""

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone


class LeadInput(BaseModel):
    """Input data for lead qualification.

    This model represents a lead that needs to be qualified. It includes
    validation for phone numbers and email addresses to ensure data quality.

    Attributes:
        lead_id: Unique identifier for this lead
        phone: Phone number (supports various formats, stored as digits only)
        email: Valid email address
        first_name: Optional first name
        last_name: Optional last name
        source: Where the lead came from (web, phone, referral, etc.)

    Example:
        >>> lead = LeadInput(
        ...     lead_id="lead-123",
        ...     phone="+1-202-555-1234",
        ...     email="john@example.com",
        ...     first_name="John",
        ...     last_name="Doe",
        ...     source="web"
        ... )
        >>> lead.phone
        '2025551234'
    """

    lead_id: str = Field(
        ...,
        description="Unique lead identifier",
        min_length=1,
        max_length=256
    )
    phone: str = Field(
        ...,
        description="Phone number (digits only after validation)",
    )
    email: EmailStr = Field(
        ...,
        description="Valid email address"
    )
    first_name: Optional[str] = Field(
        default=None,
        description="Lead first name",
        max_length=256
    )
    last_name: Optional[str] = Field(
        default=None,
        description="Lead last name",
        max_length=256
    )
    source: str = Field(
        ...,
        description="Lead source (web, phone, referral, etc.)",
        min_length=1,
        max_length=256
    )

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Strip formatting from phone number, keep only digits.

        Accepts various formats:
        - +1-202-555-1234
        - (202) 555-1234
        - 202.555.1234
        - 2025551234

        Returns only digits: 2025551234
        """
        if not isinstance(v, str):
            raise ValueError("Phone must be a string")

        # Strip all non-digit characters
        digits_only = ''.join(filter(str.isdigit, v))

        # Validate we have 9-15 digits (US: 10, International: 9-15)
        if not (9 <= len(digits_only) <= 15):
            raise ValueError(f"Phone must have 9-15 digits, got {len(digits_only)}")

        return digits_only


class LeadQualificationResult(BaseModel):
    """Output from lead qualification service.

    This model represents the result of qualifying a lead. It includes
    a qualification score (0-100), tier classification, and recommended actions.

    Attributes:
        lead_id: The ID of the qualified lead
        qualification_score: Score from 0-100
        tier: Lead tier (hot, warm, cold, unqualified)
        reasons: List of reasons for this qualification
        recommended_action: What to do next with this lead
        qualified_at: When qualification occurred (UTC)

    Example:
        >>> result = LeadQualificationResult(
        ...     lead_id="lead-123",
        ...     qualification_score=85.5,
        ...     tier="hot",
        ...     reasons=["High budget", "Decision maker", "Immediate need"],
        ...     recommended_action="Call immediately"
        ... )
        >>> result.tier
        'hot'
    """

    lead_id: str = Field(
        ...,
        description="ID of the qualified lead",
        min_length=1
    )
    qualification_score: float = Field(
        ...,
        description="Qualification score (0-100)",
        ge=0.0,
        le=100.0
    )
    tier: Literal["hot", "warm", "cold", "unqualified"] = Field(
        ...,
        description="Lead tier classification"
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="Reasons for this qualification",
        max_length=10
    )
    recommended_action: str = Field(
        ...,
        description="Recommended next action",
        min_length=1,
        max_length=1000
    )
    qualified_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When qualification occurred (UTC)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "lead_id": "lead-456",
                "qualification_score": 85.5,
                "tier": "hot",
                "reasons": [
                    "High budget detected",
                    "Decision maker identified",
                    "Immediate need"
                ],
                "recommended_action": "Call within 1 hour",
                "qualified_at": "2024-01-15T10:30:00Z"
            }
        }
    }
