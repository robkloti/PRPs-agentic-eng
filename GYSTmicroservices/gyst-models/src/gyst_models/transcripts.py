"""Transcript-related models for audio processing."""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime


class TranscriptInput(BaseModel):
    """Input for transcript processing service.

    This model represents a request to transcribe audio. It includes the
    audio source, language specification, and optional callback for results.

    Attributes:
        audio_url: URL to the audio file to transcribe
        language: Language code (e.g., 'en', 'es', 'fr')
        speaker_labels: Whether to identify different speakers
        callback_url: Optional URL to POST results when complete

    Example:
        >>> transcript_input = TranscriptInput(
        ...     audio_url="https://example.com/audio.mp3",
        ...     language="en",
        ...     speaker_labels=True,
        ...     callback_url="https://myapp.com/webhooks/transcript"
        ... )
        >>> transcript_input.language
        'en'
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

    model_config = {
        "json_schema_extra": {
            "example": {
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "speaker_labels": True,
                "callback_url": "https://myapp.com/webhooks/transcript"
            }
        }
    }


class TranscriptOutput(BaseModel):
    """Output from transcript processing service.

    This model represents the results of transcribing audio. It includes
    the transcribed text, speaker information, and processing metadata.

    Attributes:
        job_id: Unique identifier for this transcription job
        status: Processing status (processing, completed, failed)
        text_url: Optional URL where full text is stored
        text_content: Optional full transcribed text
        duration_seconds: Length of the audio in seconds
        word_count: Number of words in transcript
        speakers: List of identified speakers (if speaker_labels=True)
        confidence_score: Overall confidence of the transcription (0-1)
        processed_at: When transcription was completed

    Example:
        >>> transcript_output = TranscriptOutput(
        ...     job_id="job-123",
        ...     status="completed",
        ...     text_content="Hello, this is a test transcript.",
        ...     duration_seconds=45.5,
        ...     word_count=7,
        ...     speakers=["Speaker 1"],
        ...     confidence_score=0.95
        ... )
        >>> transcript_output.status
        'completed'
    """

    job_id: str = Field(
        ...,
        description="Unique job identifier",
        min_length=1,
        max_length=256
    )
    status: str = Field(
        ...,
        description="Processing status (processing, completed, failed)",
        min_length=1,
        max_length=50
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
    speakers: Optional[list[str]] = Field(
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

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "job-456",
                "status": "completed",
                "text_content": "Hello, this is a test of the transcript system.",
                "duration_seconds": 45.5,
                "word_count": 9,
                "speakers": ["Speaker 1", "Speaker 2"],
                "confidence_score": 0.95,
                "processed_at": "2024-01-15T10:35:00Z"
            }
        }
    }
