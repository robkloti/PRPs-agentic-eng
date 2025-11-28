"""Tests for transcript models."""

import pytest
from pydantic import ValidationError
from gyst_models.transcripts import TranscriptInput, TranscriptOutput


class TestTranscriptInput:
    """Tests for TranscriptInput model."""

    def test_transcript_input_valid(self):
        """Test creating a valid TranscriptInput."""
        transcript_in = TranscriptInput(
            audio_url="https://example.com/audio.mp3"
        )
        assert str(transcript_in.audio_url) == "https://example.com/audio.mp3"
        assert transcript_in.language == "en"
        assert transcript_in.speaker_labels is False
        assert transcript_in.callback_url is None

    def test_transcript_input_all_fields(self):
        """Test TranscriptInput with all fields."""
        transcript_in = TranscriptInput(
            audio_url="https://example.com/audio.wav",
            language="es",
            speaker_labels=True,
            callback_url="https://myapp.com/webhooks/transcript"
        )
        assert transcript_in.language == "es"
        assert transcript_in.speaker_labels is True
        assert str(transcript_in.callback_url) == "https://myapp.com/webhooks/transcript"

    def test_transcript_input_language_default(self):
        """Test language defaults to 'en'."""
        transcript_in = TranscriptInput(
            audio_url="https://example.com/audio.mp3"
        )
        assert transcript_in.language == "en"

    def test_transcript_input_language_valid_codes(self):
        """Test various valid language codes."""
        for code in ["en", "es", "fr", "de", "ja", "zh"]:
            transcript_in = TranscriptInput(
                audio_url="https://example.com/audio.mp3",
                language=code
            )
            assert transcript_in.language == code

    def test_transcript_input_language_invalid_too_long(self):
        """Test language validation rejects 3+ letter codes."""
        with pytest.raises(ValidationError):
            TranscriptInput(
                audio_url="https://example.com/audio.mp3",
                language="eng"
            )

    def test_transcript_input_language_invalid_too_short(self):
        """Test language validation rejects 1 letter codes."""
        with pytest.raises(ValidationError):
            TranscriptInput(
                audio_url="https://example.com/audio.mp3",
                language="e"
            )

    def test_transcript_input_language_invalid_uppercase(self):
        """Test language validation requires lowercase."""
        with pytest.raises(ValidationError):
            TranscriptInput(
                audio_url="https://example.com/audio.mp3",
                language="EN"
            )

    def test_transcript_input_invalid_audio_url(self):
        """Test URL validation."""
        with pytest.raises(ValidationError):
            TranscriptInput(
                audio_url="not-a-url"
            )

    def test_transcript_input_speaker_labels_default(self):
        """Test speaker_labels defaults to False."""
        transcript_in = TranscriptInput(
            audio_url="https://example.com/audio.mp3"
        )
        assert transcript_in.speaker_labels is False

    def test_transcript_input_serialization(self):
        """Test serialization."""
        transcript_in = TranscriptInput(
            audio_url="https://example.com/audio.mp3",
            language="fr",
            speaker_labels=True
        )
        data = transcript_in.model_dump()
        assert data["language"] == "fr"
        assert data["speaker_labels"] is True

        json_str = transcript_in.model_dump_json()
        assert "audio.mp3" in json_str


class TestTranscriptOutput:
    """Tests for TranscriptOutput model."""

    def test_transcript_output_valid_minimal(self):
        """Test creating TranscriptOutput with required fields only."""
        output = TranscriptOutput(
            job_id="job-123",
            status="completed"
        )
        assert output.job_id == "job-123"
        assert output.status == "completed"
        assert output.text_content is None
        assert output.duration_seconds is None
        assert output.confidence_score is None

    def test_transcript_output_all_fields(self):
        """Test TranscriptOutput with all fields."""
        output = TranscriptOutput(
            job_id="job-456",
            status="completed",
            text_content="Hello world",
            duration_seconds=45.5,
            word_count=2,
            speakers=["Speaker 1", "Speaker 2"],
            confidence_score=0.95
        )
        assert output.text_content == "Hello world"
        assert output.duration_seconds == 45.5
        assert output.word_count == 2
        assert len(output.speakers) == 2
        assert output.confidence_score == 0.95

    def test_transcript_output_confidence_score_boundary_0(self):
        """Test confidence score at boundary (0)."""
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            confidence_score=0.0
        )
        assert output.confidence_score == 0.0

    def test_transcript_output_confidence_score_boundary_1(self):
        """Test confidence score at boundary (1.0)."""
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            confidence_score=1.0
        )
        assert output.confidence_score == 1.0

    def test_transcript_output_confidence_score_too_high(self):
        """Test confidence score validation rejects > 1.0."""
        with pytest.raises(ValidationError):
            TranscriptOutput(
                job_id="test",
                status="completed",
                confidence_score=1.1
            )

    def test_transcript_output_confidence_score_negative(self):
        """Test confidence score validation rejects < 0."""
        with pytest.raises(ValidationError):
            TranscriptOutput(
                job_id="test",
                status="completed",
                confidence_score=-0.1
            )

    def test_transcript_output_duration_validation(self):
        """Test duration must be non-negative."""
        # Valid
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            duration_seconds=0.0
        )
        assert output.duration_seconds == 0.0

        # Invalid
        with pytest.raises(ValidationError):
            TranscriptOutput(
                job_id="test",
                status="completed",
                duration_seconds=-1.0
            )

    def test_transcript_output_word_count_validation(self):
        """Test word count must be non-negative."""
        # Valid
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            word_count=0
        )
        assert output.word_count == 0

        # Invalid
        with pytest.raises(ValidationError):
            TranscriptOutput(
                job_id="test",
                status="completed",
                word_count=-1
            )

    def test_transcript_output_status_values(self):
        """Test various status values."""
        for status in ["processing", "completed", "failed"]:
            output = TranscriptOutput(
                job_id="test",
                status=status
            )
            assert output.status == status

    def test_transcript_output_speakers_list(self):
        """Test speakers list handling."""
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            speakers=["Alice", "Bob", "Charlie"]
        )
        assert len(output.speakers) == 3
        assert "Alice" in output.speakers

    def test_transcript_output_text_url(self):
        """Test text_url field."""
        output = TranscriptOutput(
            job_id="test",
            status="completed",
            text_url="https://example.com/transcript.txt"
        )
        assert str(output.text_url) == "https://example.com/transcript.txt"

    def test_transcript_output_serialization(self):
        """Test serialization."""
        output = TranscriptOutput(
            job_id="job-789",
            status="completed",
            text_content="Test transcript",
            duration_seconds=30.0,
            word_count=3,
            confidence_score=0.99
        )
        data = output.model_dump()
        assert data["job_id"] == "job-789"
        assert data["status"] == "completed"
        assert data["word_count"] == 3

        json_str = output.model_dump_json()
        assert "job-789" in json_str
        assert "Test transcript" in json_str
