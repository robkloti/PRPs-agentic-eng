"""FastAPI application for transcript-processor microservice.

Main application with endpoints for:
- Transcription job submission and processing
- Job status checking
- Result retrieval with pagination
- Health checks and service info
- Billing and usage tracking

Supports dual-mode deployment:
- Internal: Simple header-based authentication (X-Customer-ID)
- External: API key authentication with rate limiting and billing
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional
from datetime import datetime, timezone

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Header,
    Query,
    status,
)
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import ConfigManager
from .database import DatabaseClient, TranscriptRepository, UsageRepository
from .auth import AuthenticationManager, AuthenticatedRequest, AuthenticationError
from .providers import ProviderFactory, TranscriptionStatus, ProviderError
from .billing import BillingService
from .models import (
    TranscriptProcessRequest,
    TranscriptJobResponse,
    TranscriptResultResponse,
    JobStatusRequest,
    JobStatusResponse,
)

# Configure logging
logger = logging.getLogger(__name__)


# Dependency injection setup
async def get_config() -> ConfigManager:
    """Get configuration manager."""
    if not hasattr(get_config, "_config"):
        get_config._config = ConfigManager()
    return get_config._config


async def get_db(config: ConfigManager = Depends(get_config)) -> DatabaseClient:
    """Get database client."""
    if not hasattr(get_db, "_db"):
        get_db._db = DatabaseClient(config)
    return get_db._db


async def get_auth_manager(
    config: ConfigManager = Depends(get_config),
    db: DatabaseClient = Depends(get_db),
) -> AuthenticationManager:
    """Get authentication manager."""
    if not hasattr(get_auth_manager, "_auth"):
        get_auth_manager._auth = AuthenticationManager(config, db)
    return get_auth_manager._auth


async def get_billing_service(
    db: DatabaseClient = Depends(get_db),
) -> BillingService:
    """Get billing service."""
    if not hasattr(get_billing_service, "_billing"):
        get_billing_service._billing = BillingService(db)
    return get_billing_service._billing


async def get_current_customer(
    auth_manager: AuthenticationManager = Depends(get_auth_manager),
    headers: dict = Header(),
) -> AuthenticatedRequest:
    """Get authenticated customer from request headers.

    Raises:
        HTTPException: If authentication fails
    """
    try:
        return await auth_manager.authenticate_async(headers)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )


# Lifespan context for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("transcript-processor service starting up")
    try:
        config = await get_config()
        db = await get_db(config)
        health = db.health_check()
        if health:
            logger.info("Database health check passed")
        else:
            logger.warning("Database health check failed, continuing anyway")
    except Exception as e:
        logger.error(f"Startup check failed: {e}")

    yield

    # Shutdown
    logger.info("transcript-processor service shutting down")


def create_app(config: Optional[ConfigManager] = None) -> FastAPI:
    """Create and configure FastAPI application.

    Args:
        config: Optional configuration manager for testing

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title="Transcript Processor",
        description="Audio transcription processing service",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health and info endpoints
    @app.get("/health")
    async def health_check(db: DatabaseClient = Depends(get_db)):
        """Health check endpoint."""
        is_healthy = db.health_check()
        status_code = 200 if is_healthy else 503
        return JSONResponse(
            status_code=status_code,
            content={
                "status": "healthy" if is_healthy else "unhealthy",
                "service": "transcript-processor",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.get("/info")
    async def service_info():
        """Service information endpoint."""
        return {
            "service": "transcript-processor",
            "version": "1.0.0",
            "mode": "dual-mode (internal/external)",
            "providers": ["vapi", "retell"],
            "plans": ["free", "starter", "pro", "enterprise"],
        }

    # Transcription submission endpoint
    @app.post(
        "/transcribe",
        response_model=TranscriptJobResponse,
        status_code=status.HTTP_202_ACCEPTED,
    )
    async def submit_transcription(
        request: TranscriptProcessRequest,
        current_customer: AuthenticatedRequest = Depends(get_current_customer),
        db: DatabaseClient = Depends(get_db),
        config: ConfigManager = Depends(get_config),
        billing: BillingService = Depends(get_billing_service),
    ) -> TranscriptJobResponse:
        """Submit an audio file for transcription.

        Creates a new transcription job and returns a job ID for tracking.

        - **audio_url**: URL to the audio file to transcribe
        - **language**: Language code (ISO 639-1, default 'en')
        - **speaker_labels**: Enable speaker identification (default False)
        - **callback_url**: Optional webhook URL for completion notification
        - **provider**: Override default provider (vapi or retell)
        - **priority**: Job priority (normal, high, urgent)

        Returns:
            Job ID, status, and estimated completion time

        Raises:
            400: Invalid request parameters
            401: Authentication failed
            429: Rate limit exceeded (plan limit)
        """
        try:
            import uuid

            # Determine which provider to use
            provider_name = request.provider or config.default_provider

            # Check billing limits before allowing submission
            limit_check = await billing.check_limits(
                customer_id=current_customer.customer_id,
                provider=provider_name,
                duration_seconds=600.0,  # Estimate 10 minutes for limit checking
                plan=current_customer.plan,
            )

            if not limit_check["within_limits"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=limit_check["reason"],
                )

            # Create transcript record in database
            job_id = f"job-{uuid.uuid4().hex[:12]}"
            transcript_repo = TranscriptRepository(db)

            transcript = await transcript_repo.create(
                customer_id=current_customer.customer_id,
                job_id=job_id,
                audio_url=str(request.audio_url),
                language=request.language,
                speaker_labels=request.speaker_labels,
                provider=provider_name,
                priority=request.priority,
                callback_url=str(request.callback_url) if request.callback_url else None,
            )

            # Submit job to provider
            provider = ProviderFactory.create(config, provider_name)
            try:
                provider_job_id = await provider.submit_job(
                    audio_url=str(request.audio_url),
                    language=request.language,
                    speaker_labels=request.speaker_labels,
                )
                await provider.close()
            except ProviderError as e:
                logger.error(f"Provider error: {e.message}")
                await transcript_repo.mark_failed(
                    customer_id=current_customer.customer_id,
                    job_id=job_id,
                    error_message=f"Provider error: {e.message}",
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Transcription service temporarily unavailable",
                )

            # Log submission
            logger.info(
                f"Transcription submitted: customer={current_customer.customer_id}, "
                f"job={job_id}, provider={provider_name}"
            )

            return TranscriptJobResponse(
                job_id=job_id,
                status="queued",
                audio_url=str(request.audio_url),
                language=request.language,
                correlation_id=transcript.get("id"),
                timestamp=datetime.now(timezone.utc),
                estimated_completion=None,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting transcription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # Status check endpoint
    @app.post("/status", response_model=JobStatusResponse)
    async def check_job_status(
        request: JobStatusRequest,
        current_customer: AuthenticatedRequest = Depends(get_current_customer),
        db: DatabaseClient = Depends(get_db),
        config: ConfigManager = Depends(get_config),
    ) -> JobStatusResponse:
        """Check the status of a transcription job.

        - **job_id**: The job ID to check

        Returns:
            Current job status, progress percentage, and error message if failed

        Raises:
            401: Authentication failed
            404: Job not found
        """
        try:
            transcript_repo = TranscriptRepository(db)
            transcript = await transcript_repo.get_by_job_id(
                customer_id=current_customer.customer_id,
                job_id=request.job_id,
            )

            if not transcript:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job {request.job_id} not found",
                )

            status_str = transcript.get("status", "unknown")

            # If job is still processing, get status from provider
            if status_str in ["queued", "processing"]:
                provider_name = transcript.get("provider", config.default_provider)
                provider = ProviderFactory.create(config, provider_name)
                try:
                    provider_status = await provider.get_status(request.job_id)
                    status_str = provider_status.value

                    # Update database if status changed
                    if status_str != transcript.get("status"):
                        await transcript_repo.update_status(
                            customer_id=current_customer.customer_id,
                            job_id=request.job_id,
                            status=status_str,
                        )
                except ProviderError:
                    # Use cached status from database
                    pass
                finally:
                    await provider.close()

            return JobStatusResponse(
                job_id=request.job_id,
                status=status_str,
                correlation_id=transcript.get("id"),
                timestamp=datetime.now(timezone.utc),
                progress_percent=50 if status_str == "processing" else None,
                error=transcript.get("error_message"),
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking job status: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # Result retrieval endpoint
    @app.post("/result", response_model=TranscriptResultResponse)
    async def get_job_result(
        request: JobStatusRequest,
        current_customer: AuthenticatedRequest = Depends(get_current_customer),
        db: DatabaseClient = Depends(get_db),
        config: ConfigManager = Depends(get_config),
        billing: BillingService = Depends(get_billing_service),
    ) -> TranscriptResultResponse:
        """Retrieve the result of a completed transcription job.

        - **job_id**: The job ID to retrieve

        Returns:
            Transcription text, duration, confidence, speakers, and metadata

        Raises:
            401: Authentication failed
            404: Job not found
            410: Job still processing or failed
        """
        try:
            transcript_repo = TranscriptRepository(db)
            transcript = await transcript_repo.get_by_job_id(
                customer_id=current_customer.customer_id,
                job_id=request.job_id,
            )

            if not transcript:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job {request.job_id} not found",
                )

            status_str = transcript.get("status")

            # Check if job is complete
            if status_str == "completed":
                # Record usage for billing
                duration = transcript.get("duration_seconds", 0)
                if duration > 0:
                    await billing.record_transcription(
                        customer_id=current_customer.customer_id,
                        job_id=request.job_id,
                        provider=transcript.get("provider", "vapi"),
                        duration_seconds=duration,
                        plan=current_customer.plan,
                    )

                return TranscriptResultResponse(
                    job_id=request.job_id,
                    status="completed",
                    text_content=transcript.get("text_content"),
                    duration_seconds=transcript.get("duration_seconds"),
                    word_count=transcript.get("word_count"),
                    speakers=transcript.get("speakers"),
                    confidence_score=transcript.get("confidence_score"),
                    processed_at=transcript.get("processed_at"),
                    correlation_id=transcript.get("id"),
                    timestamp=datetime.now(timezone.utc),
                )

            elif status_str == "failed":
                return TranscriptResultResponse(
                    job_id=request.job_id,
                    status="failed",
                    error=transcript.get("error_message"),
                    correlation_id=transcript.get("id"),
                    timestamp=datetime.now(timezone.utc),
                )

            else:
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail=f"Job is still {status_str}, not yet complete",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving job result: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # Usage and billing endpoint
    @app.get("/usage")
    async def get_usage_summary(
        current_customer: AuthenticatedRequest = Depends(get_current_customer),
        days: int = Query(30, ge=1, le=365, description="Days to include in summary"),
        billing: BillingService = Depends(get_billing_service),
    ):
        """Get usage summary and billing information for current customer.

        - **days**: Number of days to include (1-365, default 30)

        Returns:
            Total minutes used, total cost, job count, and breakdown by provider and day

        Raises:
            401: Authentication failed
        """
        try:
            summary = await billing.get_usage_summary(
                customer_id=current_customer.customer_id,
                days=days,
            )

            return {
                "customer_id": summary.customer_id,
                "period_start": summary.period_start.isoformat(),
                "period_end": summary.period_end.isoformat(),
                "total_minutes": summary.total_minutes,
                "total_cost_usd": summary.total_cost_usd,
                "job_count": summary.job_count,
                "provider_breakdown": summary.provider_breakdown,
                "daily_breakdown": summary.daily_breakdown,
                "plan": current_customer.plan,
            }

        except Exception as e:
            logger.error(f"Error getting usage summary: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # List jobs endpoint
    @app.get("/jobs")
    async def list_jobs(
        current_customer: AuthenticatedRequest = Depends(get_current_customer),
        status: Optional[str] = Query(
            None,
            description="Filter by status (queued, processing, completed, failed)",
        ),
        limit: int = Query(50, ge=1, le=200, description="Maximum jobs to return"),
        offset: int = Query(0, ge=0, description="Jobs to skip"),
        db: DatabaseClient = Depends(get_db),
    ):
        """List transcription jobs for current customer.

        - **status**: Optional status filter
        - **limit**: Maximum jobs to return (1-200, default 50)
        - **offset**: Jobs to skip for pagination

        Returns:
            Array of job records with pagination info

        Raises:
            401: Authentication failed
        """
        try:
            transcript_repo = TranscriptRepository(db)
            jobs = await transcript_repo.list_by_customer(
                customer_id=current_customer.customer_id,
                status=status,
                limit=limit,
                offset=offset,
            )

            return {
                "jobs": jobs,
                "count": len(jobs),
                "limit": limit,
                "offset": offset,
                "customer_id": current_customer.customer_id,
            }

        except Exception as e:
            logger.error(f"Error listing jobs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    return app


# Create the application instance
app = create_app()
