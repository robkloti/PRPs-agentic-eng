"""Common base models used across all GYST services."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import uuid4


class BaseResponse(BaseModel):
    """Standard response wrapper for all services.

    This model is used for all successful API responses across GYST microservices.
    It provides consistent structure for job tracking and correlation.

    Attributes:
        job_id: Unique identifier for this request/job
        status: Current status (success, processing, failed)
        timestamp: When this response was created (UTC)
        correlation_id: Optional ID for tracing request through services

    Example:
        >>> response = BaseResponse(
        ...     job_id="abc-123-def",
        ...     status="success",
        ...     correlation_id="lead-456_20240115"
        ... )
        >>> response.status
        'success'
    """

    job_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique job identifier"
    )
    status: str = Field(
        ...,
        description="Response status: success, processing, or failed"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When response was generated (UTC)"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID for tracing across services"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "success",
                "timestamp": "2024-01-15T10:30:00Z",
                "correlation_id": "lead-456_20240115"
            }
        }
    )


class BaseError(BaseModel):
    """Standard error response for all services.

    This model is used for all error responses across GYST microservices.
    It provides consistent error structure with detailed information.

    Attributes:
        error_code: Machine-readable error code
        message: Human-readable error message
        details: Optional nested error details
        correlation_id: Optional ID for tracing the error
        timestamp: When this error occurred (UTC)

    Example:
        >>> error = BaseError(
        ...     error_code="INVALID_INPUT",
        ...     message="Email address is invalid",
        ...     details={"field": "email", "value": "not-an-email"}
        ... )
        >>> error.error_code
        'INVALID_INPUT'
    """

    error_code: str = Field(
        ...,
        description="Machine-readable error code"
    )
    message: str = Field(
        ...,
        description="Human-readable error message"
    )
    details: Optional[dict[str, Any]] = Field(
        default=None,
        description="Optional nested error details"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID for tracing"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When error occurred (UTC)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid input parameters",
                "details": {
                    "field": "email",
                    "reason": "Invalid email format"
                },
                "correlation_id": "req-123_20240115",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }
    )
