"""Tests for common models."""

import pytest
from pydantic import ValidationError
from gyst_models.common import BaseResponse, BaseError
from datetime import datetime, timezone


class TestBaseResponse:
    """Tests for BaseResponse model."""

    def test_base_response_valid(self):
        """Test creating a valid BaseResponse."""
        response = BaseResponse(status="success")
        assert response.status == "success"
        assert response.job_id is not None
        assert len(response.job_id) > 0
        assert response.timestamp is not None
        assert response.correlation_id is None

    def test_base_response_with_all_fields(self):
        """Test BaseResponse with all fields set."""
        response = BaseResponse(
            status="processing",
            correlation_id="trace-123"
        )
        assert response.status == "processing"
        assert response.correlation_id == "trace-123"

    def test_base_response_timestamp_timezone_aware(self):
        """Test that timestamp is timezone-aware."""
        response = BaseResponse(status="success")
        assert response.timestamp.tzinfo is not None
        assert response.timestamp.tzinfo == timezone.utc

    def test_base_response_auto_generated_job_id(self):
        """Test that job_id is auto-generated as UUID."""
        response1 = BaseResponse(status="success")
        response2 = BaseResponse(status="success")
        assert response1.job_id != response2.job_id

    def test_base_response_missing_status(self):
        """Test that status is required."""
        with pytest.raises(ValidationError):
            BaseResponse()

    def test_base_response_serialization_dict(self):
        """Test serialization to dict."""
        response = BaseResponse(status="success", correlation_id="trace-123")
        data = response.model_dump()
        assert isinstance(data, dict)
        assert data["status"] == "success"
        assert data["correlation_id"] == "trace-123"
        assert "job_id" in data
        assert "timestamp" in data

    def test_base_response_serialization_json(self):
        """Test serialization to JSON."""
        response = BaseResponse(status="success")
        json_str = response.model_dump_json()
        assert isinstance(json_str, str)
        assert "success" in json_str
        assert "job_id" in json_str


class TestBaseError:
    """Tests for BaseError model."""

    def test_base_error_valid(self):
        """Test creating a valid BaseError."""
        error = BaseError(
            error_code="INVALID_INPUT",
            message="Input validation failed"
        )
        assert error.error_code == "INVALID_INPUT"
        assert error.message == "Input validation failed"
        assert error.details is None
        assert error.correlation_id is None
        assert error.timestamp is not None

    def test_base_error_with_details(self):
        """Test BaseError with details."""
        error = BaseError(
            error_code="VALIDATION_ERROR",
            message="Email is invalid",
            details={"field": "email", "reason": "Invalid format"},
            correlation_id="req-123"
        )
        assert error.error_code == "VALIDATION_ERROR"
        assert error.details == {"field": "email", "reason": "Invalid format"}
        assert error.correlation_id == "req-123"

    def test_base_error_timestamp_timezone_aware(self):
        """Test that timestamp is timezone-aware."""
        error = BaseError(error_code="ERROR", message="Test error")
        assert error.timestamp.tzinfo is not None
        assert error.timestamp.tzinfo == timezone.utc

    def test_base_error_missing_error_code(self):
        """Test that error_code is required."""
        with pytest.raises(ValidationError):
            BaseError(message="Error message")

    def test_base_error_missing_message(self):
        """Test that message is required."""
        with pytest.raises(ValidationError):
            BaseError(error_code="ERROR_CODE")

    def test_base_error_serialization_dict(self):
        """Test serialization to dict."""
        error = BaseError(
            error_code="TEST_ERROR",
            message="Test message",
            details={"key": "value"}
        )
        data = error.model_dump()
        assert isinstance(data, dict)
        assert data["error_code"] == "TEST_ERROR"
        assert data["message"] == "Test message"
        assert data["details"] == {"key": "value"}
        assert "timestamp" in data

    def test_base_error_serialization_json(self):
        """Test serialization to JSON."""
        error = BaseError(error_code="ERROR", message="Test")
        json_str = error.model_dump_json()
        assert isinstance(json_str, str)
        assert "ERROR" in json_str
        assert "Test" in json_str

    def test_base_error_complex_details(self):
        """Test BaseError with complex nested details."""
        error = BaseError(
            error_code="COMPLEX_ERROR",
            message="Complex error",
            details={
                "nested": {
                    "field": "value",
                    "items": [1, 2, 3]
                }
            }
        )
        assert error.details["nested"]["field"] == "value"
        assert error.details["nested"]["items"] == [1, 2, 3]
