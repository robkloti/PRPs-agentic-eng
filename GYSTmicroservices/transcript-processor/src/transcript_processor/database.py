"""Supabase database client and operations for transcript-processor service.

This module provides a wrapper around the Supabase client to handle:
- Connection management
- Query building with customer_id isolation (critical for multi-tenancy)
- Error handling
- Transaction support
- Automatic timestamp management

CRITICAL SECURITY:
All database queries MUST include customer_id to prevent cross-tenant data leakage.
Pattern: WHERE customer_id = $1 AND <other_conditions>
NEVER: WHERE job_id = $1 (would expose other customers' transcriptions)
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# Optional Supabase imports (for testing)
try:
    from supabase import create_client, Client
    from supabase.lib.client_options import ClientOptions
except ImportError:
    # Allow tests to run without Supabase installed
    Client = type('Client', (), {})  # type: ignore
    create_client = lambda *args, **kwargs: None  # type: ignore
    ClientOptions = type('ClientOptions', (), {})  # type: ignore

from .config import ConfigManager


logger = logging.getLogger(__name__)


class DatabaseClient:
    """Wrapper around Supabase client for transcript-processor.

    Ensures proper multi-tenant isolation and error handling.
    """

    def __init__(self, config: ConfigManager):
        """Initialize database client.

        Args:
            config: Configuration manager with Supabase credentials

        Raises:
            ValueError: If Supabase credentials are missing
        """
        if not config.supabase_url or not config.supabase_key:
            raise ValueError("Supabase URL and key are required")

        self.config = config
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Get or create Supabase client (lazy initialization)."""
        if self._client is None:
            try:
                options = ClientOptions(
                    auto_refresh_token=True,
                    persist_session=False,
                    storage_key="transcript-processor",
                )
                self._client = create_client(
                    supabase_url=self.config.supabase_url,
                    supabase_key=self.config.supabase_key,
                    options=options,
                )
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        return self._client

    def health_check(self) -> bool:
        """Check if database connection is healthy.

        Returns:
            True if database is accessible
        """
        try:
            # Simple query to verify connectivity
            result = self.client.table("transcriptions").select("count").limit(1).execute()
            logger.debug("Database health check passed")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


class TranscriptRepository:
    """Repository for transcript database operations.

    Handles all CRUD operations for transcriptions with built-in customer isolation.
    """

    def __init__(self, db: DatabaseClient):
        """Initialize transcript repository.

        Args:
            db: Database client instance
        """
        self.db = db
        self.table_name = "transcriptions"

    async def create(
        self,
        customer_id: str,
        job_id: str,
        audio_url: str,
        language: str = "en",
        speaker_labels: bool = False,
        provider: str = "vapi",
        priority: str = "normal",
        callback_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new transcription record.

        Args:
            customer_id: Customer ID for multi-tenant isolation
            job_id: Unique job identifier
            audio_url: URL of audio file to transcribe
            language: Language code
            speaker_labels: Whether to identify speakers
            provider: Transcription provider (vapi, retell)
            priority: Job priority (normal, high, urgent)
            callback_url: Optional webhook callback URL

        Returns:
            Created transcript record

        Raises:
            Exception: If database operation fails
        """
        now = datetime.now(timezone.utc)

        record = {
            "customer_id": customer_id,
            "job_id": job_id,
            "audio_url": audio_url,
            "language": language,
            "speaker_labels": speaker_labels,
            "provider": provider,
            "priority": priority,
            "callback_url": callback_url,
            "status": "queued",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        try:
            response = self.db.client.table(self.table_name).insert(record).execute()
            logger.info(f"Created transcript record: customer_id={customer_id}, job_id={job_id}")
            return response.data[0] if response.data else record
        except Exception as e:
            logger.error(f"Failed to create transcript: {e}")
            raise

    async def get_by_job_id(self, customer_id: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Get a transcript by job ID.

        CRITICAL: Uses customer_id for isolation.

        Args:
            customer_id: Customer ID (required for isolation)
            job_id: Job ID to retrieve

        Returns:
            Transcript record if found, None otherwise
        """
        try:
            response = (
                self.db.client.table(self.table_name)
                .select("*")
                .eq("customer_id", customer_id)
                .eq("job_id", job_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            # 406 error means record not found, which is expected
            if "406" not in str(e):
                logger.error(f"Failed to get transcript: {e}")
            return None

    async def list_by_customer(
        self,
        customer_id: str,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List transcripts for a customer.

        CRITICAL: Filtered by customer_id for isolation.

        Args:
            customer_id: Customer ID (required for isolation)
            status: Optional status filter
            limit: Maximum records to return
            offset: Records to skip

        Returns:
            List of transcript records
        """
        try:
            query = (
                self.db.client.table(self.table_name)
                .select("*")
                .eq("customer_id", customer_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )

            if status:
                query = query.eq("status", status)

            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to list transcripts: {e}")
            return []

    async def update_status(
        self,
        customer_id: str,
        job_id: str,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Update transcript status.

        CRITICAL: Uses customer_id for isolation.

        Args:
            customer_id: Customer ID (required for isolation)
            job_id: Job ID to update
            status: New status value
            metadata: Optional additional fields to update

        Returns:
            Updated transcript record
        """
        now = datetime.now(timezone.utc)

        update_data = {
            "status": status,
            "updated_at": now.isoformat(),
        }

        if metadata:
            update_data.update(metadata)

        try:
            response = (
                self.db.client.table(self.table_name)
                .update(update_data)
                .eq("customer_id", customer_id)
                .eq("job_id", job_id)
                .execute()
            )
            logger.info(f"Updated transcript status: job_id={job_id}, status={status}")
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Failed to update transcript: {e}")
            raise

    async def update_with_result(
        self,
        customer_id: str,
        job_id: str,
        text_content: str,
        duration_seconds: float,
        word_count: int,
        speakers: Optional[List[str]] = None,
        confidence_score: float = 0.0,
    ) -> Dict[str, Any]:
        """Update transcript with completed results.

        CRITICAL: Uses customer_id for isolation.

        Args:
            customer_id: Customer ID (required for isolation)
            job_id: Job ID
            text_content: Transcribed text
            duration_seconds: Audio duration
            word_count: Number of words
            speakers: List of identified speakers
            confidence_score: Confidence of transcription

        Returns:
            Updated transcript record
        """
        now = datetime.now(timezone.utc)

        update_data = {
            "status": "completed",
            "text_content": text_content,
            "duration_seconds": duration_seconds,
            "word_count": word_count,
            "speakers": speakers or [],
            "confidence_score": confidence_score,
            "processed_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        try:
            response = (
                self.db.client.table(self.table_name)
                .update(update_data)
                .eq("customer_id", customer_id)
                .eq("job_id", job_id)
                .execute()
            )
            logger.info(f"Updated transcript with results: job_id={job_id}, word_count={word_count}")
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Failed to update transcript with results: {e}")
            raise

    async def mark_failed(
        self,
        customer_id: str,
        job_id: str,
        error_message: str,
    ) -> Dict[str, Any]:
        """Mark a transcript as failed.

        CRITICAL: Uses customer_id for isolation.

        Args:
            customer_id: Customer ID (required for isolation)
            job_id: Job ID
            error_message: Error description

        Returns:
            Updated transcript record
        """
        now = datetime.now(timezone.utc)

        update_data = {
            "status": "failed",
            "error_message": error_message,
            "updated_at": now.isoformat(),
        }

        try:
            response = (
                self.db.client.table(self.table_name)
                .update(update_data)
                .eq("customer_id", customer_id)
                .eq("job_id", job_id)
                .execute()
            )
            logger.warning(f"Marked transcript as failed: job_id={job_id}, error={error_message}")
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Failed to mark transcript as failed: {e}")
            raise


class UsageRepository:
    """Repository for usage/billing event operations.

    Tracks API usage for billing purposes.
    """

    def __init__(self, db: DatabaseClient):
        """Initialize usage repository.

        Args:
            db: Database client instance
        """
        self.db = db
        self.table_name = "usage_events"

    async def create(
        self,
        customer_id: str,
        service_name: str,
        service_action: str,
        quantity: int = 1,
        unit: str = "request",
        cost_usd: float = 0.0,
    ) -> Dict[str, Any]:
        """Create a usage event record.

        Args:
            customer_id: Customer ID for isolation
            service_name: Service that generated the usage (transcript-processor)
            service_action: Action performed (transcribe)
            quantity: Number of units
            unit: Unit of measurement (request, token, second, etc.)
            cost_usd: Cost in USD

        Returns:
            Created usage event record
        """
        now = datetime.now(timezone.utc)

        record = {
            "customer_id": customer_id,
            "service_name": service_name,
            "service_action": service_action,
            "quantity": quantity,
            "unit": unit,
            "cost_usd": cost_usd,
            "timestamp": now.isoformat(),
        }

        try:
            response = self.db.client.table(self.table_name).insert(record).execute()
            logger.debug(f"Created usage event: customer_id={customer_id}, service={service_name}")
            return response.data[0] if response.data else record
        except Exception as e:
            logger.error(f"Failed to create usage event: {e}")
            raise

    async def list_by_customer(
        self,
        customer_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List usage events for a customer.

        Args:
            customer_id: Customer ID
            limit: Maximum records
            offset: Records to skip

        Returns:
            List of usage event records
        """
        try:
            response = (
                self.db.client.table(self.table_name)
                .select("*")
                .eq("customer_id", customer_id)
                .order("timestamp", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to list usage events: {e}")
            return []

    async def get_total_cost(self, customer_id: str) -> float:
        """Get total cost for a customer.

        Args:
            customer_id: Customer ID

        Returns:
            Total cost in USD
        """
        try:
            response = (
                self.db.client.table(self.table_name)
                .select("cost_usd")
                .eq("customer_id", customer_id)
                .execute()
            )

            if not response.data:
                return 0.0

            return sum(item.get("cost_usd", 0.0) for item in response.data)
        except Exception as e:
            logger.error(f"Failed to calculate total cost: {e}")
            return 0.0
