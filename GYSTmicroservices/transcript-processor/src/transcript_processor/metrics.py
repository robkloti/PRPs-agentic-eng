"""Prometheus metrics and observability for transcript-processor.

Tracks:
- HTTP request metrics (count, duration, status codes)
- Transcription job metrics (submitted, completed, failed)
- Provider performance metrics
- Billing metrics (costs, usage)
- System health metrics
"""

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Summary,
    CollectorRegistry,
    REGISTRY,
)
from typing import Optional
import time


# ============================================================================
# HTTP Request Metrics
# ============================================================================

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests by method and path",
    ["method", "path", "status_code"],
    registry=REGISTRY,
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path", "status_code"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)

http_request_size_bytes = Histogram(
    "http_request_size_bytes",
    "HTTP request size in bytes",
    ["method", "path"],
    registry=REGISTRY,
)

http_response_size_bytes = Histogram(
    "http_response_size_bytes",
    "HTTP response size in bytes",
    ["method", "path", "status_code"],
    registry=REGISTRY,
)


# ============================================================================
# Transcription Job Metrics
# ============================================================================

transcription_jobs_submitted_total = Counter(
    "transcription_jobs_submitted_total",
    "Total transcription jobs submitted",
    ["provider", "plan"],
    registry=REGISTRY,
)

transcription_jobs_completed_total = Counter(
    "transcription_jobs_completed_total",
    "Total transcription jobs completed successfully",
    ["provider", "plan"],
    registry=REGISTRY,
)

transcription_jobs_failed_total = Counter(
    "transcription_jobs_failed_total",
    "Total transcription jobs that failed",
    ["provider", "plan", "error_type"],
    registry=REGISTRY,
)

transcription_job_duration_seconds = Histogram(
    "transcription_job_duration_seconds",
    "Transcription job processing duration in seconds",
    ["provider", "plan"],
    buckets=(5, 10, 30, 60, 300, 600, 1800, 3600),
    registry=REGISTRY,
)

transcription_job_audio_duration_seconds = Summary(
    "transcription_job_audio_duration_seconds",
    "Audio duration for transcribed files in seconds",
    ["provider", "plan"],
    registry=REGISTRY,
)

transcription_job_word_count = Summary(
    "transcription_job_word_count",
    "Word count in completed transcriptions",
    ["provider", "plan"],
    registry=REGISTRY,
)

transcription_jobs_in_progress = Gauge(
    "transcription_jobs_in_progress",
    "Number of transcription jobs currently processing",
    ["provider"],
    registry=REGISTRY,
)

transcription_jobs_queued = Gauge(
    "transcription_jobs_queued",
    "Number of transcription jobs waiting to process",
    registry=REGISTRY,
)


# ============================================================================
# Provider Metrics
# ============================================================================

provider_api_calls_total = Counter(
    "provider_api_calls_total",
    "Total API calls to transcription providers",
    ["provider", "operation", "status"],
    registry=REGISTRY,
)

provider_api_duration_seconds = Histogram(
    "provider_api_duration_seconds",
    "Provider API call duration in seconds",
    ["provider", "operation"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0),
    registry=REGISTRY,
)

provider_errors_total = Counter(
    "provider_errors_total",
    "Total errors from transcription providers",
    ["provider", "error_type"],
    registry=REGISTRY,
)

provider_availability = Gauge(
    "provider_availability",
    "Provider availability status (1 = available, 0 = unavailable)",
    ["provider"],
    registry=REGISTRY,
)


# ============================================================================
# Billing Metrics
# ============================================================================

billing_revenue_usd_total = Counter(
    "billing_revenue_usd_total",
    "Total revenue in USD",
    ["provider", "plan"],
    registry=REGISTRY,
)

billing_usage_minutes_total = Counter(
    "billing_usage_minutes_total",
    "Total audio minutes processed",
    ["provider", "plan"],
    registry=REGISTRY,
)

billing_customers_by_plan = Gauge(
    "billing_customers_by_plan",
    "Number of customers by plan tier",
    ["plan"],
    registry=REGISTRY,
)

billing_limit_exceeded_total = Counter(
    "billing_limit_exceeded_total",
    "Total times a customer hit a plan limit",
    ["plan", "limit_type"],
    registry=REGISTRY,
)


# ============================================================================
# Authentication Metrics
# ============================================================================

authentication_attempts_total = Counter(
    "authentication_attempts_total",
    "Total authentication attempts",
    ["auth_type", "result"],
    registry=REGISTRY,
)

authentication_duration_seconds = Histogram(
    "authentication_duration_seconds",
    "Authentication processing duration",
    ["auth_type"],
    registry=REGISTRY,
)


# ============================================================================
# Database Metrics
# ============================================================================

database_queries_total = Counter(
    "database_queries_total",
    "Total database queries",
    ["operation", "table", "status"],
    registry=REGISTRY,
)

database_query_duration_seconds = Histogram(
    "database_query_duration_seconds",
    "Database query duration in seconds",
    ["operation", "table"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0),
    registry=REGISTRY,
)

database_errors_total = Counter(
    "database_errors_total",
    "Total database errors",
    ["operation", "error_type"],
    registry=REGISTRY,
)

database_connection_pool_size = Gauge(
    "database_connection_pool_size",
    "Database connection pool size",
    registry=REGISTRY,
)


# ============================================================================
# System Health Metrics
# ============================================================================

service_health = Gauge(
    "service_health",
    "Service health status (1 = healthy, 0 = unhealthy)",
    registry=REGISTRY,
)

service_startup_time_seconds = Gauge(
    "service_startup_time_seconds",
    "Service startup duration in seconds",
    registry=REGISTRY,
)

service_uptime_seconds = Gauge(
    "service_uptime_seconds",
    "Service uptime in seconds",
    registry=REGISTRY,
)


# ============================================================================
# Context Managers and Timers
# ============================================================================

class MetricsRecorder:
    """Helper class for recording metrics."""

    @staticmethod
    def record_http_request(
        method: str,
        path: str,
        status_code: int,
        duration_seconds: float,
    ):
        """Record HTTP request metrics.

        Args:
            method: HTTP method
            path: Request path
            status_code: Response status code
            duration_seconds: Request duration
        """
        http_requests_total.labels(
            method=method,
            path=path,
            status_code=status_code,
        ).inc()

        http_request_duration_seconds.labels(
            method=method,
            path=path,
            status_code=status_code,
        ).observe(duration_seconds)

    @staticmethod
    def record_transcription_submitted(
        provider: str,
        plan: str,
    ):
        """Record transcription submission.

        Args:
            provider: Provider name
            plan: Customer plan
        """
        transcription_jobs_submitted_total.labels(
            provider=provider,
            plan=plan,
        ).inc()

    @staticmethod
    def record_transcription_completed(
        provider: str,
        plan: str,
        duration_seconds: float,
        audio_duration_seconds: float,
        word_count: int,
    ):
        """Record transcription completion.

        Args:
            provider: Provider name
            plan: Customer plan
            duration_seconds: Processing duration
            audio_duration_seconds: Audio file duration
            word_count: Words in transcript
        """
        transcription_jobs_completed_total.labels(
            provider=provider,
            plan=plan,
        ).inc()

        transcription_job_duration_seconds.labels(
            provider=provider,
            plan=plan,
        ).observe(duration_seconds)

        transcription_job_audio_duration_seconds.labels(
            provider=provider,
            plan=plan,
        ).observe(audio_duration_seconds)

        transcription_job_word_count.labels(
            provider=provider,
            plan=plan,
        ).observe(word_count)

    @staticmethod
    def record_transcription_failed(
        provider: str,
        plan: str,
        error_type: str,
    ):
        """Record transcription failure.

        Args:
            provider: Provider name
            plan: Customer plan
            error_type: Type of error
        """
        transcription_jobs_failed_total.labels(
            provider=provider,
            plan=plan,
            error_type=error_type,
        ).inc()

    @staticmethod
    def record_provider_api_call(
        provider: str,
        operation: str,
        duration_seconds: float,
        status: str,
    ):
        """Record provider API call.

        Args:
            provider: Provider name
            operation: Operation type (submit, status, result)
            duration_seconds: Call duration
            status: Status (success, failure, timeout)
        """
        provider_api_calls_total.labels(
            provider=provider,
            operation=operation,
            status=status,
        ).inc()

        provider_api_duration_seconds.labels(
            provider=provider,
            operation=operation,
        ).observe(duration_seconds)

    @staticmethod
    def record_provider_error(provider: str, error_type: str):
        """Record provider error.

        Args:
            provider: Provider name
            error_type: Type of error
        """
        provider_errors_total.labels(
            provider=provider,
            error_type=error_type,
        ).inc()

    @staticmethod
    def record_billing_revenue(
        provider: str,
        plan: str,
        amount_usd: float,
    ):
        """Record billing revenue.

        Args:
            provider: Provider name
            plan: Customer plan
            amount_usd: Revenue amount
        """
        billing_revenue_usd_total.labels(
            provider=provider,
            plan=plan,
        ).inc(amount_usd)

    @staticmethod
    def record_billing_usage(
        provider: str,
        plan: str,
        minutes: float,
    ):
        """Record usage minutes.

        Args:
            provider: Provider name
            plan: Customer plan
            minutes: Minutes of audio processed
        """
        billing_usage_minutes_total.labels(
            provider=provider,
            plan=plan,
        ).inc(minutes)

    @staticmethod
    def record_authentication(
        auth_type: str,
        success: bool,
        duration_seconds: float,
    ):
        """Record authentication attempt.

        Args:
            auth_type: Type of authentication
            success: Whether authentication succeeded
            duration_seconds: Authentication duration
        """
        authentication_attempts_total.labels(
            auth_type=auth_type,
            result="success" if success else "failure",
        ).inc()

        authentication_duration_seconds.labels(
            auth_type=auth_type,
        ).observe(duration_seconds)

    @staticmethod
    def record_database_query(
        operation: str,
        table: str,
        duration_seconds: float,
        success: bool,
        error_type: Optional[str] = None,
    ):
        """Record database query.

        Args:
            operation: Query operation (select, insert, update, delete)
            table: Table name
            duration_seconds: Query duration
            success: Whether query succeeded
            error_type: Type of error if failed
        """
        status = "success" if success else "failure"
        database_queries_total.labels(
            operation=operation,
            table=table,
            status=status,
        ).inc()

        database_query_duration_seconds.labels(
            operation=operation,
            table=table,
        ).observe(duration_seconds)

        if not success and error_type:
            database_errors_total.labels(
                operation=operation,
                error_type=error_type,
            ).inc()

    @staticmethod
    def set_limit_exceeded(plan: str, limit_type: str):
        """Record limit exceeded.

        Args:
            plan: Customer plan
            limit_type: Type of limit (minutes, cost)
        """
        billing_limit_exceeded_total.labels(
            plan=plan,
            limit_type=limit_type,
        ).inc()

    @staticmethod
    def update_jobs_in_progress(provider: str, count: int):
        """Update in-progress job count.

        Args:
            provider: Provider name
            count: Current count
        """
        transcription_jobs_in_progress.labels(
            provider=provider,
        ).set(count)

    @staticmethod
    def update_jobs_queued(count: int):
        """Update queued job count.

        Args:
            count: Current count
        """
        transcription_jobs_queued.set(count)

    @staticmethod
    def set_health_status(healthy: bool):
        """Set service health status.

        Args:
            healthy: Whether service is healthy
        """
        service_health.set(1 if healthy else 0)

    @staticmethod
    def set_startup_time(duration_seconds: float):
        """Set startup duration.

        Args:
            duration_seconds: Startup duration
        """
        service_startup_time_seconds.set(duration_seconds)

    @staticmethod
    def update_uptime(duration_seconds: float):
        """Update service uptime.

        Args:
            duration_seconds: Uptime duration
        """
        service_uptime_seconds.set(duration_seconds)
