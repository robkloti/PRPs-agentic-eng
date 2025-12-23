"""Structured logging and observability utilities for transcript-processor.

Provides:
- JSON-formatted structured logging
- Request correlation IDs for distributed tracing
- Performance timing tracking
- Error context enrichment
- Log level management
"""

import logging
import json
import time
import uuid
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from contextlib import contextmanager
from functools import wraps
import traceback


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs JSON-structured logs."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON.

        Args:
            record: LogRecord to format

        Returns:
            JSON-formatted log string
        """
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Add extra fields if present
        if hasattr(record, "extra"):
            log_data.update(record.extra)

        return json.dumps(log_data)


class ContextualLogger:
    """Logger wrapper with context management for request tracking."""

    def __init__(self, name: str):
        """Initialize contextual logger.

        Args:
            name: Logger name
        """
        self.logger = logging.getLogger(name)
        self.context: Dict[str, Any] = {}

    def _log(self, level: int, message: str, **kwargs):
        """Internal logging with context.

        Args:
            level: Log level
            message: Log message
            **kwargs: Additional context fields
        """
        extra = {**self.context, **kwargs}
        self.logger.log(level, message, extra={"extra": extra})

    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        """Log info message."""
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message."""
        self._log(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message."""
        self._log(logging.CRITICAL, message, **kwargs)

    def set_context(self, **kwargs):
        """Set context fields for all subsequent logs.

        Args:
            **kwargs: Context fields to set
        """
        self.context.update(kwargs)

    def clear_context(self):
        """Clear all context fields."""
        self.context.clear()

    @contextmanager
    def context_scope(self, **kwargs):
        """Temporary context scope.

        Args:
            **kwargs: Temporary context fields
        """
        old_context = self.context.copy()
        self.context.update(kwargs)
        try:
            yield
        finally:
            self.context = old_context


class RequestLogger:
    """Logger for tracking request-level metrics and events."""

    def __init__(self, correlation_id: Optional[str] = None):
        """Initialize request logger.

        Args:
            correlation_id: Optional correlation ID for tracing
        """
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.logger = ContextualLogger(__name__)
        self.logger.set_context(correlation_id=self.correlation_id)
        self.start_time = time.time()

    def log_request_start(
        self,
        method: str,
        path: str,
        customer_id: Optional[str] = None,
        **kwargs
    ):
        """Log request start.

        Args:
            method: HTTP method
            path: Request path
            customer_id: Customer ID if authenticated
            **kwargs: Additional fields
        """
        msg = f"{method} {path}"
        if customer_id:
            msg += f" (customer: {customer_id})"
        self.logger.info(
            msg,
            event="request_start",
            method=method,
            path=path,
            customer_id=customer_id,
            **kwargs
        )

    def log_request_end(
        self,
        status_code: int,
        duration_ms: Optional[float] = None,
        **kwargs
    ):
        """Log request end.

        Args:
            status_code: HTTP status code
            duration_ms: Request duration in milliseconds
            **kwargs: Additional fields
        """
        if duration_ms is None:
            duration_ms = (time.time() - self.start_time) * 1000

        self.logger.info(
            f"Request completed with status {status_code} ({round(duration_ms, 2)}ms)",
            event="request_end",
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            **kwargs
        )

    def log_transcription_submitted(
        self,
        job_id: str,
        customer_id: str,
        provider: str,
        audio_duration: Optional[float] = None,
    ):
        """Log transcription job submission.

        Args:
            job_id: Job ID
            customer_id: Customer ID
            provider: Provider name
            audio_duration: Estimated audio duration
        """
        duration_str = f", duration: {audio_duration}s" if audio_duration else ""
        self.logger.info(
            f"Transcription job submitted: {job_id} (provider: {provider}, customer: {customer_id}{duration_str})",
            event="transcription_submitted",
            job_id=job_id,
            customer_id=customer_id,
            provider=provider,
            audio_duration=audio_duration,
        )

    def log_transcription_completed(
        self,
        job_id: str,
        customer_id: str,
        duration_seconds: float,
        word_count: int,
        cost_usd: float,
    ):
        """Log transcription completion.

        Args:
            job_id: Job ID
            customer_id: Customer ID
            duration_seconds: Audio duration
            word_count: Word count in transcript
            cost_usd: Cost charged
        """
        self.logger.info(
            f"Transcription completed: {job_id} ({word_count} words, {round(duration_seconds, 1)}s, ${cost_usd:.2f})",
            event="transcription_completed",
            job_id=job_id,
            customer_id=customer_id,
            duration_seconds=duration_seconds,
            word_count=word_count,
            cost_usd=cost_usd,
        )

    def log_transcription_failed(
        self,
        job_id: str,
        customer_id: str,
        error_message: str,
    ):
        """Log transcription failure.

        Args:
            job_id: Job ID
            customer_id: Customer ID
            error_message: Error description
        """
        self.logger.error(
            f"Transcription failed for {job_id}: {error_message}",
            event="transcription_failed",
            job_id=job_id,
            customer_id=customer_id,
            error_message=error_message,
        )

    def log_limit_exceeded(
        self,
        customer_id: str,
        plan: str,
        limit_type: str,
        current_value: float,
        limit: float,
    ):
        """Log plan limit exceeded.

        Args:
            customer_id: Customer ID
            plan: Plan tier
            limit_type: Type of limit (minutes, cost)
            current_value: Current usage value
            limit: Limit threshold
        """
        self.logger.warning(
            f"Plan limit exceeded for {customer_id} ({plan}): {limit_type} ({current_value}/{limit})",
            event="limit_exceeded",
            customer_id=customer_id,
            plan=plan,
            limit_type=limit_type,
            current_value=current_value,
            limit=limit,
        )

    def log_provider_error(
        self,
        provider: str,
        error_message: str,
        status_code: Optional[int] = None,
    ):
        """Log provider error.

        Args:
            provider: Provider name
            error_message: Error description
            status_code: HTTP status code if applicable
        """
        msg = f"Provider error: {provider} - {error_message}"
        if status_code:
            msg += f" (status: {status_code})"
        self.logger.error(
            msg,
            event="provider_error",
            provider=provider,
            error_message=error_message,
            status_code=status_code,
        )

    def log_database_error(
        self,
        operation: str,
        error_message: str,
    ):
        """Log database error.

        Args:
            operation: Database operation name
            error_message: Error description
        """
        self.logger.error(
            f"Database error during {operation}",
            event="database_error",
            operation=operation,
            error_message=error_message,
        )

    def log_authentication_failure(
        self,
        reason: str,
        auth_type: str,
    ):
        """Log authentication failure.

        Args:
            reason: Failure reason
            auth_type: Authentication type (header, api_key)
        """
        self.logger.warning(
            f"Authentication failed ({auth_type}): {reason}",
            event="authentication_failed",
            reason=reason,
            auth_type=auth_type,
        )

    def log_authentication_success(
        self,
        customer_id: str,
        auth_type: str,
        plan: str,
    ):
        """Log successful authentication.

        Args:
            customer_id: Customer ID
            auth_type: Authentication type
            plan: Customer plan
        """
        self.logger.info(
            f"Authentication successful for {customer_id} ({auth_type}, {plan})",
            event="authentication_success",
            customer_id=customer_id,
            auth_type=auth_type,
            plan=plan,
        )


def configure_logging(level: str = "INFO") -> None:
    """Configure application-wide logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console handler with JSON formatter
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)

    # Set specific loggers
    logging.getLogger("transcript_processor").setLevel(level)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)


def timed_operation(logger: ContextualLogger):
    """Decorator to log operation timing.

    Args:
        logger: Logger instance

    Returns:
        Decorator function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            operation_name = func.__name__
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                logger.info(
                    f"{operation_name} completed",
                    event="operation_completed",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"{operation_name} failed",
                    event="operation_failed",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            operation_name = func.__name__
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                logger.info(
                    f"{operation_name} completed",
                    event="operation_completed",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"{operation_name} failed",
                    event="operation_failed",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise

        if hasattr(func, "__call__"):
            import inspect
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            else:
                return wrapper
        return wrapper

    return decorator
