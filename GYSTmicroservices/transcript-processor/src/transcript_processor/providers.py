"""Transcription provider integrations for VAPI and Retell.

This module provides abstractions for communicating with external transcription
services. Currently supports:
- VAPI: Voice AI Platform for audio processing
- Retell: AI voice platform for real-time transcription

Each provider has:
- Client wrapper for API communication
- Job submission and status checking
- Result retrieval and parsing
- Error handling specific to the provider
"""

import logging
import httpx
from typing import Optional, Dict, Any
from enum import Enum
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from .config import ConfigManager


logger = logging.getLogger(__name__)


class TranscriptionStatus(str, Enum):
    """Standard transcription status across providers."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProviderError(Exception):
    """Base exception for provider-related errors."""

    def __init__(self, message: str, provider: str, status_code: Optional[int] = None):
        """Initialize provider error.

        Args:
            message: Error description
            provider: Provider name (vapi, retell)
            status_code: Optional HTTP status code
        """
        self.message = message
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"{provider} error: {message}")


class TranscriptionResult:
    """Result from a completed transcription."""

    def __init__(
        self,
        job_id: str,
        text: str,
        duration_seconds: float = 0.0,
        confidence_score: float = 0.0,
        speakers: Optional[list] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Initialize transcription result.

        Args:
            job_id: Original job ID
            text: Transcribed text content
            duration_seconds: Audio duration in seconds
            confidence_score: Overall confidence (0-1)
            speakers: List of identified speakers
            metadata: Provider-specific metadata
        """
        self.job_id = job_id
        self.text = text
        self.duration_seconds = duration_seconds
        self.confidence_score = confidence_score
        self.speakers = speakers or []
        self.metadata = metadata or {}
        self.completed_at = datetime.now(timezone.utc)


class TranscriptionProvider(ABC):
    """Abstract base class for transcription providers."""

    def __init__(self, config: ConfigManager):
        """Initialize provider.

        Args:
            config: Configuration manager
        """
        self.config = config
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client connection."""
        await self.http_client.aclose()

    @abstractmethod
    async def submit_job(
        self,
        audio_url: str,
        language: str = "en",
        speaker_labels: bool = False,
    ) -> str:
        """Submit an audio file for transcription.

        Args:
            audio_url: URL of audio file to transcribe
            language: Language code (ISO 639-1)
            speaker_labels: Whether to identify speakers

        Returns:
            Job ID for tracking transcription

        Raises:
            ProviderError: If submission fails
        """

    @abstractmethod
    async def get_status(self, job_id: str) -> TranscriptionStatus:
        """Get current status of a transcription job.

        Args:
            job_id: Job ID from submit_job

        Returns:
            TranscriptionStatus enum value

        Raises:
            ProviderError: If status check fails
        """

    @abstractmethod
    async def get_result(self, job_id: str) -> TranscriptionResult:
        """Retrieve completed transcription result.

        Args:
            job_id: Job ID from submit_job

        Returns:
            TranscriptionResult with text and metadata

        Raises:
            ProviderError: If retrieval fails
        """


class VAPIProvider(TranscriptionProvider):
    """VAPI (Voice AI Platform) transcription provider."""

    def __init__(self, config: ConfigManager):
        """Initialize VAPI provider.

        Args:
            config: Configuration manager with VAPI credentials

        Raises:
            ValueError: If VAPI API key not configured
        """
        super().__init__(config)

        if not config.vapi_api_key:
            raise ValueError("VAPI_API_KEY not configured")

        self.api_key = config.vapi_api_key
        self.endpoint = config.vapi_endpoint
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def submit_job(
        self,
        audio_url: str,
        language: str = "en",
        speaker_labels: bool = False,
    ) -> str:
        """Submit audio to VAPI for transcription.

        Args:
            audio_url: URL of audio file
            language: Language code
            speaker_labels: Enable speaker identification

        Returns:
            VAPI job ID

        Raises:
            ProviderError: If submission fails
        """
        try:
            payload = {
                "audioUrl": audio_url,
                "language": language,
                "speakerLabels": speaker_labels,
            }

            response = await self.http_client.post(
                f"{self.endpoint}/v1/transcription/submit",
                json=payload,
                headers=self.headers,
            )

            if response.status_code not in [200, 201]:
                raise ProviderError(
                    f"Failed to submit job: {response.text}",
                    provider="vapi",
                    status_code=response.status_code,
                )

            data = response.json()
            job_id = data.get("jobId")

            if not job_id:
                raise ProviderError(
                    "No jobId in response",
                    provider="vapi",
                )

            logger.info(f"VAPI job submitted: {job_id}")
            return job_id

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="vapi",
            )

    async def get_status(self, job_id: str) -> TranscriptionStatus:
        """Get VAPI transcription job status.

        Args:
            job_id: VAPI job ID

        Returns:
            TranscriptionStatus

        Raises:
            ProviderError: If status check fails
        """
        try:
            response = await self.http_client.get(
                f"{self.endpoint}/v1/transcription/{job_id}",
                headers=self.headers,
            )

            if response.status_code == 404:
                raise ProviderError(
                    f"Job not found: {job_id}",
                    provider="vapi",
                    status_code=404,
                )

            if response.status_code != 200:
                raise ProviderError(
                    f"Failed to get status: {response.text}",
                    provider="vapi",
                    status_code=response.status_code,
                )

            data = response.json()
            status_str = data.get("status", "").lower()

            # Map VAPI status to standard status
            status_map = {
                "pending": TranscriptionStatus.QUEUED,
                "queued": TranscriptionStatus.QUEUED,
                "processing": TranscriptionStatus.PROCESSING,
                "completed": TranscriptionStatus.COMPLETED,
                "failed": TranscriptionStatus.FAILED,
            }

            return status_map.get(status_str, TranscriptionStatus.PROCESSING)

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="vapi",
            )

    async def get_result(self, job_id: str) -> TranscriptionResult:
        """Get VAPI transcription result.

        Args:
            job_id: VAPI job ID

        Returns:
            TranscriptionResult

        Raises:
            ProviderError: If result retrieval fails
        """
        try:
            response = await self.http_client.get(
                f"{self.endpoint}/v1/transcription/{job_id}/result",
                headers=self.headers,
            )

            if response.status_code == 404:
                raise ProviderError(
                    f"Job not found: {job_id}",
                    provider="vapi",
                    status_code=404,
                )

            if response.status_code != 200:
                raise ProviderError(
                    f"Failed to get result: {response.text}",
                    provider="vapi",
                    status_code=response.status_code,
                )

            data = response.json()

            return TranscriptionResult(
                job_id=job_id,
                text=data.get("text", ""),
                duration_seconds=float(data.get("duration", 0)),
                confidence_score=float(data.get("confidence", 0)),
                speakers=data.get("speakers", []),
                metadata=data,
            )

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="vapi",
            )


class RetellProvider(TranscriptionProvider):
    """Retell AI transcription provider."""

    def __init__(self, config: ConfigManager):
        """Initialize Retell provider.

        Args:
            config: Configuration manager with Retell credentials

        Raises:
            ValueError: If Retell API key not configured
        """
        super().__init__(config)

        if not config.retell_api_key:
            raise ValueError("RETELL_API_KEY not configured")

        self.api_key = config.retell_api_key
        self.endpoint = config.retell_endpoint
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def submit_job(
        self,
        audio_url: str,
        language: str = "en",
        speaker_labels: bool = False,
    ) -> str:
        """Submit audio to Retell for transcription.

        Args:
            audio_url: URL of audio file
            language: Language code
            speaker_labels: Enable speaker identification

        Returns:
            Retell job ID

        Raises:
            ProviderError: If submission fails
        """
        try:
            payload = {
                "audioUrl": audio_url,
                "language": language,
                "speakerLabels": speaker_labels,
            }

            response = await self.http_client.post(
                f"{self.endpoint}/api/transcription/submit",
                json=payload,
                headers=self.headers,
            )

            if response.status_code not in [200, 201]:
                raise ProviderError(
                    f"Failed to submit job: {response.text}",
                    provider="retell",
                    status_code=response.status_code,
                )

            data = response.json()
            job_id = data.get("transcriptionId") or data.get("jobId")

            if not job_id:
                raise ProviderError(
                    "No job ID in response",
                    provider="retell",
                )

            logger.info(f"Retell job submitted: {job_id}")
            return job_id

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="retell",
            )

    async def get_status(self, job_id: str) -> TranscriptionStatus:
        """Get Retell transcription job status.

        Args:
            job_id: Retell job ID

        Returns:
            TranscriptionStatus

        Raises:
            ProviderError: If status check fails
        """
        try:
            response = await self.http_client.get(
                f"{self.endpoint}/api/transcription/{job_id}/status",
                headers=self.headers,
            )

            if response.status_code == 404:
                raise ProviderError(
                    f"Job not found: {job_id}",
                    provider="retell",
                    status_code=404,
                )

            if response.status_code != 200:
                raise ProviderError(
                    f"Failed to get status: {response.text}",
                    provider="retell",
                    status_code=response.status_code,
                )

            data = response.json()
            status_str = data.get("status", "").lower()

            # Map Retell status to standard status
            status_map = {
                "pending": TranscriptionStatus.QUEUED,
                "queued": TranscriptionStatus.QUEUED,
                "in_progress": TranscriptionStatus.PROCESSING,
                "processing": TranscriptionStatus.PROCESSING,
                "done": TranscriptionStatus.COMPLETED,
                "completed": TranscriptionStatus.COMPLETED,
                "error": TranscriptionStatus.FAILED,
                "failed": TranscriptionStatus.FAILED,
            }

            return status_map.get(status_str, TranscriptionStatus.PROCESSING)

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="retell",
            )

    async def get_result(self, job_id: str) -> TranscriptionResult:
        """Get Retell transcription result.

        Args:
            job_id: Retell job ID

        Returns:
            TranscriptionResult

        Raises:
            ProviderError: If result retrieval fails
        """
        try:
            response = await self.http_client.get(
                f"{self.endpoint}/api/transcription/{job_id}",
                headers=self.headers,
            )

            if response.status_code == 404:
                raise ProviderError(
                    f"Job not found: {job_id}",
                    provider="retell",
                    status_code=404,
                )

            if response.status_code != 200:
                raise ProviderError(
                    f"Failed to get result: {response.text}",
                    provider="retell",
                    status_code=response.status_code,
                )

            data = response.json()

            return TranscriptionResult(
                job_id=job_id,
                text=data.get("transcript", "") or data.get("text", ""),
                duration_seconds=float(data.get("durationSeconds", 0)),
                confidence_score=float(data.get("confidence", 0)),
                speakers=data.get("speakers", []),
                metadata=data,
            )

        except httpx.RequestError as e:
            raise ProviderError(
                f"Request failed: {str(e)}",
                provider="retell",
            )


class ProviderFactory:
    """Factory for creating transcription provider instances."""

    @staticmethod
    def create(config: ConfigManager, provider_name: str) -> TranscriptionProvider:
        """Create a transcription provider instance.

        Args:
            config: Configuration manager
            provider_name: Provider name ('vapi' or 'retell')

        Returns:
            TranscriptionProvider instance

        Raises:
            ValueError: If provider not supported or not configured
        """
        provider_name = provider_name.lower()

        if provider_name == "vapi":
            return VAPIProvider(config)
        elif provider_name == "retell":
            return RetellProvider(config)
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")

    @staticmethod
    def get_default_provider(config: ConfigManager) -> TranscriptionProvider:
        """Get the default provider based on configuration.

        Args:
            config: Configuration manager

        Returns:
            Default TranscriptionProvider instance

        Raises:
            ValueError: If default provider not configured
        """
        default_provider = config.default_provider
        return ProviderFactory.create(config, default_provider)
