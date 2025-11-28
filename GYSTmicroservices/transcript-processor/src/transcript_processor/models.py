"""Request and response models for transcript-processor service."""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from gyst_models import TranscriptInput, TranscriptOutput, BaseResponse


class TranscriptProcessRequest(BaseModel):
    """Request to process a transcript.

    Extends TranscriptInput with service-specific fields.
    This is the wrapper for API requests to the transcript-processor service.

    Attributes:
        audio_url: URL to the audio file to transcribe
        language: Language code (e.g., 'en', 'es', 'fr')
        speaker_labels: Whether to identify different speakers
        callback_url: Optional URL to POST results when complete
        provider: Optional provider override (vapi, retell, default from config)
        priority: Processing priority (normal, high, urgent)
    """

    audio_url: HttpUrl = Field(
        ...,
        description="URL to the audio file to transcribe"
    )
    language: str = Field(
        default="en",
        description="Language code (ISO 639-1 format)",
        pattern=r'^[a-z]{2}$',
        min_length=2,
        max_length=2
    )
    speaker_labels: bool = Field(
        default=False,
        description="Whether to identify different speakers"
    )
    callback_url: Optional[HttpUrl] = Field(
        default=None,
        description="Optional URL to POST results when transcription completes"
    )
    provider: Optional[str] = Field(
        default=None,
        description="Transcription provider (vapi, retell, or None for default)",
        pattern=r'^(vapi|retell)$|^$'
    )
    priority: str = Field(
        default="normal",
        description="Processing priority",
        pattern=r'^(normal|high|urgent)$'
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "speaker_labels": True,
                "callback_url": "https://myapp.com/webhooks/transcript",
                "provider": "vapi",
                "priority": "high"
            }
        }
    }


class TranscriptJobResponse(BaseResponse):
    """Response when a transcription job is created.

    Extends BaseResponse with job-specific information.
    Returned immediately when a transcription request is accepted.

    Attributes:
        job_id: Unique identifier for this transcription job
        status: Initial status (processing, queued)
        audio_url: Echoed from request
        language: Echoed from request
        estimated_completion: Estimated time when results will be ready
    """

    job_id: str = Field(
        ...,
        description="Unique job identifier",
        min_length=1,
        max_length=256
    )
    status: str = Field(
        default="queued",
        description="Job status (queued, processing, completed, failed)"
    )
    audio_url: str = Field(
        ...,
        description="Audio URL from request"
    )
    language: str = Field(
        ...,
        description="Language code from request"
    )
    estimated_completion: Optional[datetime] = Field(
        default=None,
        description="Estimated completion time (UTC)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "job-123abc",
                "status": "queued",
                "correlation_id": "corr-456def",
                "timestamp": "2024-01-15T10:30:00Z",
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "estimated_completion": "2024-01-15T10:35:00Z"
            }
        }
    }


class TranscriptResultResponse(BaseResponse):
    """Response containing completed transcription results.

    Extends BaseResponse with full transcript data from TranscriptOutput.

    Attributes:
        job_id: Unique identifier for this transcription job
        status: Final status (completed, failed)
        text_url: Optional URL where full text is stored
        text_content: Optional full transcribed text
        duration_seconds: Length of the audio in seconds
        word_count: Number of words in transcript
        speakers: List of identified speakers (if speaker_labels=True)
        confidence_score: Overall confidence of the transcription (0-1)
        processed_at: When transcription was completed
    """

    job_id: str = Field(
        ...,
        description="Unique job identifier",
        min_length=1,
        max_length=256
    )
    status: str = Field(
        ...,
        description="Final status (completed, failed)"
    )
    text_url: Optional[HttpUrl] = Field(
        default=None,
        description="URL where full transcription text is stored"
    )
    text_content: Optional[str] = Field(
        default=None,
        description="Full transcribed text content"
    )
    duration_seconds: Optional[float] = Field(
        default=None,
        description="Duration of audio in seconds",
        ge=0.0
    )
    word_count: Optional[int] = Field(
        default=None,
        description="Total number of words in transcript",
        ge=0
    )
    speakers: Optional[List[str]] = Field(
        default=None,
        description="List of identified speakers"
    )
    confidence_score: Optional[float] = Field(
        default=None,
        description="Overall confidence score (0-1)",
        ge=0.0,
        le=1.0
    )
    processed_at: Optional[datetime] = Field(
        default=None,
        description="When transcription was completed (UTC)"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if status is 'failed'"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "job-456xyz",
                "status": "completed",
                "correlation_id": "corr-789uvw",
                "timestamp": "2024-01-15T10:35:00Z",
                "text_content": "Hello, this is a test of the transcript system.",
                "duration_seconds": 45.5,
                "word_count": 9,
                "speakers": ["Speaker 1", "Speaker 2"],
                "confidence_score": 0.95,
                "processed_at": "2024-01-15T10:35:00Z"
            }
        }
    }


class JobStatusRequest(BaseModel):
    """Request to check status of a transcription job.

    Attributes:
        job_id: The job ID to check status for
    """

    job_id: str = Field(
        ...,
        description="Job ID to check",
        min_length=1,
        max_length=256
    )


class JobStatusResponse(BaseResponse):
    """Response containing job status information.

    Attributes:
        job_id: The requested job ID
        status: Current status (queued, processing, completed, failed)
        progress_percent: Estimated progress percentage (0-100) for active jobs
        error: Error message if status is 'failed'
    """

    job_id: str = Field(
        ...,
        description="Job identifier"
    )
    status: str = Field(
        ...,
        description="Current status"
    )
    progress_percent: Optional[int] = Field(
        default=None,
        description="Progress percentage for active jobs",
        ge=0,
        le=100
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if failed"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "job-123abc",
                "status": "processing",
                "correlation_id": "corr-456def",
                "timestamp": "2024-01-15T10:32:00Z",
                "progress_percent": 65
            }
        }
    }
