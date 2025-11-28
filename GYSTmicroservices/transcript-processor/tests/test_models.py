"""Tests for transcript-processor models."""

import pytest
from pydantic import ValidationError
from datetime import datetime
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.models import (
    TranscriptProcessRequest,
    TranscriptJobResponse,
    TranscriptResultResponse,
    JobStatusRequest,
    JobStatusResponse,
)


class TestTranscriptProcessRequest:
    """Tests for TranscriptProcessRequest model."""

    def test_request_minimal(self):
        """Test creating a request with required fields only."""
        req = TranscriptProcessRequest(
            audio_url="https://example.com/audio.mp3"
        )
        assert str(req.audio_url) == "https://example.com/audio.mp3"
        assert req.language == "en"
        assert req.speaker_labels is False
        assert req.callback_url is None
        assert req.provider is None
        assert req.priority == "normal"

    def test_request_all_fields(self):
        """Test creating a request with all fields."""
        req = TranscriptProcessRequest(
            audio_url="https://example.com/audio.wav",
            language="es",
            speaker_labels=True,
            callback_url="https://myapp.com/webhooks/transcript",
            provider="vapi",
            priority="high"
        )
        assert req.language == "es"
        assert req.speaker_labels is True
        assert req.provider == "vapi"
        assert req.priority == "high"

    def test_request_language_valid_codes(self):
        """Test various valid language codes."""
        for code in ["en", "es", "fr", "de", "ja", "zh"]:
            req = TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                language=code
            )
            assert req.language == code

    def test_request_language_invalid_too_long(self):
        """Test language validation rejects 3+ letter codes."""
        with pytest.raises(ValidationError):
            TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                language="eng"
            )

    def test_request_language_invalid_uppercase(self):
        """Test language validation requires lowercase."""
        with pytest.raises(ValidationError):
            TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                language="EN"
            )

    def test_request_provider_valid(self):
        """Test valid provider values."""
        for provider in ["vapi", "retell"]:
            req = TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                provider=provider
            )
            assert req.provider == provider

    def test_request_provider_invalid(self):
        """Test invalid provider value."""
        with pytest.raises(ValidationError):
            TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                provider="invalid_provider"
            )

    def test_request_priority_valid(self):
        """Test valid priority values."""
        for priority in ["normal", "high", "urgent"]:
            req = TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                priority=priority
            )
            assert req.priority == priority

    def test_request_priority_invalid(self):
        """Test invalid priority value."""
        with pytest.raises(ValidationError):
            TranscriptProcessRequest(
                audio_url="https://example.com/audio.mp3",
                priority="low"
            )

    def test_request_invalid_url(self):
        """Test URL validation."""
        with pytest.raises(ValidationError):
            TranscriptProcessRequest(
                audio_url="not-a-url"
            )

    def test_request_serialization(self):
        """Test serialization to dict and JSON."""
        req = TranscriptProcessRequest(
            audio_url="https://example.com/audio.mp3",
            language="fr",
            speaker_labels=True,
            provider="retell",
            priority="urgent"
        )
        data = req.model_dump()
        assert data["language"] == "fr"
        assert data["speaker_labels"] is True
        assert data["provider"] == "retell"
        assert data["priority"] == "urgent"

        json_str = req.model_dump_json()
        assert "audio.mp3" in json_str
        assert "french" not in json_str  # Language code, not name


class TestTranscriptJobResponse:
    """Tests for TranscriptJobResponse model."""

    def test_job_response_valid(self):
        """Test creating a job response."""
        resp = TranscriptJobResponse(
            job_id="job-123",
            audio_url="https://example.com/audio.mp3",
            language="en"
        )
        assert resp.job_id == "job-123"
        assert resp.status == "queued"
        assert resp.audio_url == "https://example.com/audio.mp3"
        assert resp.language == "en"
        assert resp.job_id is not None
        assert resp.timestamp is not None

    def test_job_response_with_estimated_completion(self):
        """Test job response with estimated completion time."""
        now = datetime.utcnow()
        resp = TranscriptJobResponse(
            job_id="job-456",
            audio_url="https://example.com/audio.mp3",
            language="en",
            estimated_completion=now
        )
        assert resp.estimated_completion == now

    def test_job_response_status_values(self):
        """Test various status values."""
        for status in ["queued", "processing", "completed", "failed"]:
            resp = TranscriptJobResponse(
                job_id="job-test",
                status=status,
                audio_url="https://example.com/audio.mp3",
                language="en"
            )
            assert resp.status == status

    def test_job_response_serialization(self):
        """Test serialization."""
        resp = TranscriptJobResponse(
            job_id="job-789",
            audio_url="https://example.com/audio.mp3",
            language="en"
        )
        data = resp.model_dump()
        assert data["job_id"] == "job-789"
        assert data["status"] == "queued"


class TestTranscriptResultResponse:
    """Tests for TranscriptResultResponse model."""

    def test_result_response_minimal(self):
        """Test creating a result response with required fields only."""
        resp = TranscriptResultResponse(
            job_id="job-123",
            status="completed"
        )
        assert resp.job_id == "job-123"
        assert resp.status == "completed"
        assert resp.text_content is None
        assert resp.duration_seconds is None
        assert resp.confidence_score is None

    def test_result_response_all_fields(self):
        """Test result response with all fields."""
        resp = TranscriptResultResponse(
            job_id="job-456",
            status="completed",
            text_content="Hello world",
            duration_seconds=45.5,
            word_count=2,
            speakers=["Speaker 1", "Speaker 2"],
            confidence_score=0.95
        )
        assert resp.text_content == "Hello world"
        assert resp.duration_seconds == 45.5
        assert resp.word_count == 2
        assert len(resp.speakers) == 2
        assert resp.confidence_score == 0.95

    def test_result_response_confidence_boundaries(self):
        """Test confidence score boundaries (0-1)."""
        # Valid boundaries
        for score in [0.0, 0.5, 1.0]:
            resp = TranscriptResultResponse(
                job_id="test",
                status="completed",
                confidence_score=score
            )
            assert resp.confidence_score == score

        # Invalid boundaries
        with pytest.raises(ValidationError):
            TranscriptResultResponse(
                job_id="test",
                status="completed",
                confidence_score=1.1
            )

        with pytest.raises(ValidationError):
            TranscriptResultResponse(
                job_id="test",
                status="completed",
                confidence_score=-0.1
            )

    def test_result_response_duration_validation(self):
        """Test duration must be non-negative."""
        # Valid
        resp = TranscriptResultResponse(
            job_id="test",
            status="completed",
            duration_seconds=0.0
        )
        assert resp.duration_seconds == 0.0

        # Invalid
        with pytest.raises(ValidationError):
            TranscriptResultResponse(
                job_id="test",
                status="completed",
                duration_seconds=-1.0
            )

    def test_result_response_word_count_validation(self):
        """Test word count must be non-negative."""
        # Valid
        resp = TranscriptResultResponse(
            job_id="test",
            status="completed",
            word_count=0
        )
        assert resp.word_count == 0

        # Invalid
        with pytest.raises(ValidationError):
            TranscriptResultResponse(
                job_id="test",
                status="completed",
                word_count=-1
            )

    def test_result_response_failed_with_error(self):
        """Test failed response with error message."""
        resp = TranscriptResultResponse(
            job_id="job-failed",
            status="failed",
            error="Timeout processing audio"
        )
        assert resp.status == "failed"
        assert resp.error == "Timeout processing audio"

    def test_result_response_serialization(self):
        """Test serialization."""
        resp = TranscriptResultResponse(
            job_id="job-789",
            status="completed",
            text_content="Test transcript",
            duration_seconds=30.0,
            word_count=3,
            confidence_score=0.99
        )
        data = resp.model_dump()
        assert data["job_id"] == "job-789"
        assert data["status"] == "completed"
        assert data["word_count"] == 3


class TestJobStatusRequest:
    """Tests for JobStatusRequest model."""

    def test_status_request_valid(self):
        """Test creating a status request."""
        req = JobStatusRequest(job_id="job-123")
        assert req.job_id == "job-123"

    def test_status_request_empty_id(self):
        """Test that empty job_id is rejected."""
        with pytest.raises(ValidationError):
            JobStatusRequest(job_id="")

    def test_status_request_serialization(self):
        """Test serialization."""
        req = JobStatusRequest(job_id="job-test")
        data = req.model_dump()
        assert data["job_id"] == "job-test"


class TestJobStatusResponse:
    """Tests for JobStatusResponse model."""

    def test_status_response_valid(self):
        """Test creating a status response."""
        resp = JobStatusResponse(
            job_id="job-123",
            status="processing"
        )
        assert resp.job_id == "job-123"
        assert resp.status == "processing"
        assert resp.progress_percent is None
        assert resp.error is None

    def test_status_response_with_progress(self):
        """Test status response with progress."""
        resp = JobStatusResponse(
            job_id="job-456",
            status="processing",
            progress_percent=65
        )
        assert resp.progress_percent == 65

    def test_status_response_progress_boundaries(self):
        """Test progress percentage boundaries (0-100)."""
        for percent in [0, 50, 100]:
            resp = JobStatusResponse(
                job_id="test",
                status="processing",
                progress_percent=percent
            )
            assert resp.progress_percent == percent

        # Invalid boundaries
        with pytest.raises(ValidationError):
            JobStatusResponse(
                job_id="test",
                status="processing",
                progress_percent=101
            )

        with pytest.raises(ValidationError):
            JobStatusResponse(
                job_id="test",
                status="processing",
                progress_percent=-1
            )

    def test_status_response_failed(self):
        """Test status response with error."""
        resp = JobStatusResponse(
            job_id="job-failed",
            status="failed",
            error="Audio format not supported"
        )
        assert resp.status == "failed"
        assert resp.error == "Audio format not supported"

    def test_status_response_serialization(self):
        """Test serialization."""
        resp = JobStatusResponse(
            job_id="job-789",
            status="completed",
            progress_percent=100
        )
        data = resp.model_dump()
        assert data["job_id"] == "job-789"
        assert data["progress_percent"] == 100
