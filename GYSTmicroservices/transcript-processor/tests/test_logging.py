"""Tests for logging and observability system."""

import pytest
import json
import logging
from io import StringIO
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.logging import (
    StructuredFormatter,
    ContextualLogger,
    RequestLogger,
    configure_logging,
    timed_operation,
)
from transcript_processor.metrics import MetricsRecorder


class TestStructuredFormatter:
    """Tests for structured logging formatter."""

    def test_format_basic_log(self):
        """Test formatting a basic log record."""
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert data["level"] == "INFO"
        assert data["message"] == "Test message"
        assert data["logger"] == "test"
        assert "timestamp" in data

    def test_format_with_exception(self):
        """Test formatting a log with exception info."""
        formatter = StructuredFormatter()

        try:
            raise ValueError("Test error")
        except ValueError:
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=1,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert data["level"] == "ERROR"
        assert "exception" in data
        assert data["exception"]["type"] == "ValueError"
        assert data["exception"]["message"] == "Test error"

    def test_format_with_extra_fields(self):
        """Test formatting a log with extra fields."""
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test",
            args=(),
            exc_info=None,
        )
        record.extra = {"customer_id": "cust-123", "request_id": "req-456"}

        output = formatter.format(record)
        data = json.loads(output)

        assert data["customer_id"] == "cust-123"
        assert data["request_id"] == "req-456"


class TestContextualLogger:
    """Tests for contextual logger."""

    def test_basic_logging(self, caplog):
        """Test basic logging operations."""
        logger = ContextualLogger("test")

        with caplog.at_level(logging.INFO):
            logger.info("Test message")

        assert "Test message" in caplog.text

    def test_context_persistence(self, caplog):
        """Test that context persists across logs."""
        logger = ContextualLogger("test")
        logger.set_context(customer_id="cust-123", request_id="req-456")

        with caplog.at_level(logging.INFO):
            logger.info("Message 1")
            logger.info("Message 2")

        # Both messages should be logged
        assert "Message 1" in caplog.text
        assert "Message 2" in caplog.text

    def test_context_clearing(self, caplog):
        """Test context clearing."""
        logger = ContextualLogger("test")
        logger.set_context(customer_id="cust-123")
        logger.clear_context()

        assert logger.context == {}

    def test_context_scope(self, caplog):
        """Test temporary context scope."""
        logger = ContextualLogger("test")
        logger.set_context(customer_id="cust-123")

        with logger.context_scope(request_id="req-456"):
            # Inside scope, both contexts should be available
            assert logger.context["customer_id"] == "cust-123"
            assert logger.context["request_id"] == "req-456"

        # Outside scope, temporary context should be gone
        assert "request_id" not in logger.context
        assert logger.context["customer_id"] == "cust-123"

    def test_log_levels(self, caplog):
        """Test different log levels."""
        logger = ContextualLogger("test")

        with caplog.at_level(logging.DEBUG):
            logger.debug("Debug message")
            logger.info("Info message")
            logger.warning("Warning message")
            logger.error("Error message")
            logger.critical("Critical message")

        assert "Debug message" in caplog.text
        assert "Info message" in caplog.text
        assert "Warning message" in caplog.text
        assert "Error message" in caplog.text
        assert "Critical message" in caplog.text


class TestRequestLogger:
    """Tests for request logging."""

    def test_correlation_id_generation(self):
        """Test that correlation IDs are generated."""
        logger = RequestLogger()
        assert logger.correlation_id is not None
        assert len(logger.correlation_id) > 0

    def test_custom_correlation_id(self):
        """Test setting custom correlation ID."""
        custom_id = "custom-id-123"
        logger = RequestLogger(correlation_id=custom_id)
        assert logger.correlation_id == custom_id

    def test_log_request_start(self, caplog):
        """Test logging request start."""
        logger = RequestLogger()

        with caplog.at_level(logging.INFO):
            logger.log_request_start(
                method="POST",
                path="/transcribe",
                customer_id="cust-123",
            )

        assert "POST /transcribe" in caplog.text
        assert "cust-123" in caplog.text

    def test_log_request_end(self, caplog):
        """Test logging request end."""
        logger = RequestLogger()

        with caplog.at_level(logging.INFO):
            logger.log_request_end(status_code=200, duration_ms=50.5)

        assert "200" in caplog.text
        assert "50.5" in caplog.text

    def test_log_transcription_submitted(self, caplog):
        """Test logging transcription submission."""
        logger = RequestLogger()

        with caplog.at_level(logging.INFO):
            logger.log_transcription_submitted(
                job_id="job-123",
                customer_id="cust-456",
                provider="vapi",
                audio_duration=45.5,
            )

        assert "job-123" in caplog.text
        assert "cust-456" in caplog.text
        assert "vapi" in caplog.text
        assert "45.5" in caplog.text

    def test_log_transcription_completed(self, caplog):
        """Test logging transcription completion."""
        logger = RequestLogger()

        with caplog.at_level(logging.INFO):
            logger.log_transcription_completed(
                job_id="job-123",
                customer_id="cust-456",
                duration_seconds=45.5,
                word_count=150,
                cost_usd=2.50,
            )

        assert "job-123" in caplog.text
        assert "150" in caplog.text
        assert "2.50" in caplog.text

    def test_log_transcription_failed(self, caplog):
        """Test logging transcription failure."""
        logger = RequestLogger()

        with caplog.at_level(logging.ERROR):
            logger.log_transcription_failed(
                job_id="job-123",
                customer_id="cust-456",
                error_message="Provider timeout",
            )

        assert "job-123" in caplog.text
        assert "Provider timeout" in caplog.text

    def test_log_limit_exceeded(self, caplog):
        """Test logging limit exceeded."""
        logger = RequestLogger()

        with caplog.at_level(logging.WARNING):
            logger.log_limit_exceeded(
                customer_id="cust-123",
                plan="free",
                limit_type="minutes",
                current_value=60.0,
                limit=60.0,
            )

        assert "cust-123" in caplog.text
        assert "free" in caplog.text
        assert "minutes" in caplog.text

    def test_log_provider_error(self, caplog):
        """Test logging provider error."""
        logger = RequestLogger()

        with caplog.at_level(logging.ERROR):
            logger.log_provider_error(
                provider="vapi",
                error_message="API rate limit exceeded",
                status_code=429,
            )

        assert "vapi" in caplog.text
        assert "429" in caplog.text

    def test_log_authentication_failure(self, caplog):
        """Test logging authentication failure."""
        logger = RequestLogger()

        with caplog.at_level(logging.WARNING):
            logger.log_authentication_failure(
                reason="Missing API key",
                auth_type="api_key",
            )

        assert "Missing API key" in caplog.text
        assert "api_key" in caplog.text

    def test_log_authentication_success(self, caplog):
        """Test logging successful authentication."""
        logger = RequestLogger()

        with caplog.at_level(logging.INFO):
            logger.log_authentication_success(
                customer_id="cust-123",
                auth_type="header",
                plan="pro",
            )

        assert "cust-123" in caplog.text
        assert "header" in caplog.text
        assert "pro" in caplog.text


class TestConfigureLogging:
    """Tests for logging configuration."""

    def test_configure_logging_debug(self):
        """Test configuring logging with debug level."""
        configure_logging("DEBUG")
        root = logging.getLogger()
        assert root.level == logging.DEBUG

    def test_configure_logging_info(self):
        """Test configuring logging with info level."""
        configure_logging("INFO")
        root = logging.getLogger()
        assert root.level == logging.INFO

    def test_configure_logging_error(self):
        """Test configuring logging with error level."""
        configure_logging("ERROR")
        root = logging.getLogger()
        assert root.level == logging.ERROR

    def test_configure_logging_handler(self):
        """Test that configured logging has proper handlers."""
        configure_logging("INFO")
        root = logging.getLogger()
        assert len(root.handlers) > 0

        # Check that handler is StreamHandler with StructuredFormatter
        handler = root.handlers[0]
        assert isinstance(handler, logging.StreamHandler)
        assert isinstance(handler.formatter, StructuredFormatter)


class TestTimedOperationDecorator:
    """Tests for timed operation decorator."""

    def test_sync_function_timing(self, caplog):
        """Test timing of synchronous function."""
        logger = ContextualLogger("test")

        @timed_operation(logger)
        def test_func():
            return "result"

        with caplog.at_level(logging.INFO):
            result = test_func()

        assert result == "result"
        assert "operation_completed" in caplog.text or "test_func" in caplog.text

    def test_sync_function_error(self, caplog):
        """Test error handling in synchronous function."""
        logger = ContextualLogger("test")

        @timed_operation(logger)
        def test_func():
            raise ValueError("Test error")

        with caplog.at_level(logging.ERROR):
            with pytest.raises(ValueError):
                test_func()

        assert "operation_failed" in caplog.text or "test_func" in caplog.text

    @pytest.mark.asyncio
    async def test_async_function_timing(self, caplog):
        """Test timing of asynchronous function."""
        logger = ContextualLogger("test")

        @timed_operation(logger)
        async def test_func():
            return "result"

        with caplog.at_level(logging.INFO):
            result = await test_func()

        assert result == "result"

    @pytest.mark.asyncio
    async def test_async_function_error(self, caplog):
        """Test error handling in asynchronous function."""
        logger = ContextualLogger("test")

        @timed_operation(logger)
        async def test_func():
            raise ValueError("Test error")

        with caplog.at_level(logging.ERROR):
            with pytest.raises(ValueError):
                await test_func()


class TestMetricsRecorder:
    """Tests for metrics recording."""

    def test_record_http_request(self):
        """Test recording HTTP request metrics."""
        # Should not raise
        MetricsRecorder.record_http_request(
            method="GET",
            path="/health",
            status_code=200,
            duration_seconds=0.05,
        )

    def test_record_transcription_submitted(self):
        """Test recording transcription submission."""
        MetricsRecorder.record_transcription_submitted(
            provider="vapi",
            plan="pro",
        )

    def test_record_transcription_completed(self):
        """Test recording transcription completion."""
        MetricsRecorder.record_transcription_completed(
            provider="vapi",
            plan="pro",
            duration_seconds=30.0,
            audio_duration_seconds=45.5,
            word_count=150,
        )

    def test_record_transcription_failed(self):
        """Test recording transcription failure."""
        MetricsRecorder.record_transcription_failed(
            provider="retell",
            plan="free",
            error_type="timeout",
        )

    def test_record_provider_api_call(self):
        """Test recording provider API call."""
        MetricsRecorder.record_provider_api_call(
            provider="vapi",
            operation="submit",
            duration_seconds=0.5,
            status="success",
        )

    def test_record_provider_error(self):
        """Test recording provider error."""
        MetricsRecorder.record_provider_error(
            provider="retell",
            error_type="rate_limit",
        )

    def test_record_billing_revenue(self):
        """Test recording billing revenue."""
        MetricsRecorder.record_billing_revenue(
            provider="vapi",
            plan="pro",
            amount_usd=25.50,
        )

    def test_record_billing_usage(self):
        """Test recording billing usage."""
        MetricsRecorder.record_billing_usage(
            provider="vapi",
            plan="pro",
            minutes=45.5,
        )

    def test_record_authentication(self):
        """Test recording authentication."""
        MetricsRecorder.record_authentication(
            auth_type="api_key",
            success=True,
            duration_seconds=0.01,
        )

    def test_record_database_query(self):
        """Test recording database query."""
        MetricsRecorder.record_database_query(
            operation="select",
            table="transcriptions",
            duration_seconds=0.05,
            success=True,
        )

    def test_record_database_error(self):
        """Test recording database error."""
        MetricsRecorder.record_database_query(
            operation="insert",
            table="usage_events",
            duration_seconds=0.1,
            success=False,
            error_type="constraint_violation",
        )

    def test_set_limit_exceeded(self):
        """Test recording limit exceeded."""
        MetricsRecorder.set_limit_exceeded(
            plan="free",
            limit_type="minutes",
        )

    def test_update_health_status(self):
        """Test updating health status."""
        MetricsRecorder.set_health_status(True)
        MetricsRecorder.set_health_status(False)

    def test_update_uptime(self):
        """Test updating uptime."""
        MetricsRecorder.update_uptime(3600.0)

    def test_set_startup_time(self):
        """Test setting startup time."""
        MetricsRecorder.set_startup_time(2.5)
