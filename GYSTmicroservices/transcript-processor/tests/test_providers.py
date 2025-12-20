"""Tests for transcription provider integrations."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.providers import (
    TranscriptionStatus,
    ProviderError,
    TranscriptionResult,
    VAPIProvider,
    RetellProvider,
    ProviderFactory,
)
from transcript_processor.config import ConfigManager


@pytest.fixture
def mock_config_vapi():
    """Create mock config with VAPI credentials."""
    config = Mock(spec=ConfigManager)
    config.vapi_api_key = "test-vapi-key"
    config.vapi_endpoint = "https://api.vapi.ai"
    config.retell_api_key = None
    config.default_provider = "vapi"
    return config


@pytest.fixture
def mock_config_retell():
    """Create mock config with Retell credentials."""
    config = Mock(spec=ConfigManager)
    config.vapi_api_key = None
    config.retell_api_key = "test-retell-key"
    config.retell_endpoint = "https://api.retell.ai"
    config.default_provider = "retell"
    return config


class TestTranscriptionStatus:
    """Tests for TranscriptionStatus enum."""

    def test_status_values(self):
        """Test that all status values are defined."""
        assert TranscriptionStatus.QUEUED == "queued"
        assert TranscriptionStatus.PROCESSING == "processing"
        assert TranscriptionStatus.COMPLETED == "completed"
        assert TranscriptionStatus.FAILED == "failed"


class TestProviderError:
    """Tests for ProviderError exception."""

    def test_error_creation(self):
        """Test creating a provider error."""
        error = ProviderError("Test error", provider="vapi")
        assert error.message == "Test error"
        assert error.provider == "vapi"
        assert error.status_code is None

    def test_error_with_status_code(self):
        """Test creating error with status code."""
        error = ProviderError("Not found", provider="retell", status_code=404)
        assert error.status_code == 404

    def test_error_is_exception(self):
        """Test that ProviderError is an Exception."""
        error = ProviderError("Test", provider="vapi")
        assert isinstance(error, Exception)


class TestTranscriptionResult:
    """Tests for TranscriptionResult class."""

    def test_creation_minimal(self):
        """Test creating result with minimal fields."""
        result = TranscriptionResult(
            job_id="job-123",
            text="Hello world"
        )
        assert result.job_id == "job-123"
        assert result.text == "Hello world"
        assert result.duration_seconds == 0.0
        assert result.confidence_score == 0.0
        assert result.speakers == []
        assert result.completed_at is not None

    def test_creation_full(self):
        """Test creating result with all fields."""
        result = TranscriptionResult(
            job_id="job-456",
            text="Test transcript",
            duration_seconds=45.5,
            confidence_score=0.95,
            speakers=["Speaker 1", "Speaker 2"],
            metadata={"provider": "vapi"}
        )
        assert result.job_id == "job-456"
        assert result.duration_seconds == 45.5
        assert result.confidence_score == 0.95
        assert len(result.speakers) == 2


class TestVAPIProvider:
    """Tests for VAPI provider."""

    def test_init_valid(self, mock_config_vapi):
        """Test VAPI provider initialization."""
        provider = VAPIProvider(mock_config_vapi)
        assert provider.api_key == "test-vapi-key"
        assert provider.endpoint == "https://api.vapi.ai"

    def test_init_missing_api_key(self, mock_config_vapi):
        """Test VAPI init fails without API key."""
        mock_config_vapi.vapi_api_key = None
        with pytest.raises(ValueError, match="VAPI_API_KEY"):
            VAPIProvider(mock_config_vapi)

    @pytest.mark.asyncio
    async def test_submit_job_success(self, mock_config_vapi):
        """Test successful job submission."""
        provider = VAPIProvider(mock_config_vapi)

        # Mock the HTTP response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json = Mock(return_value={"jobId": "vapi-job-123"})

        provider.http_client.post = AsyncMock(return_value=mock_response)

        job_id = await provider.submit_job(
            audio_url="https://example.com/audio.mp3",
            language="en",
            speaker_labels=True
        )

        assert job_id == "vapi-job-123"
        provider.http_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_submit_job_failure(self, mock_config_vapi):
        """Test job submission failure."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        provider.http_client.post = AsyncMock(return_value=mock_response)

        with pytest.raises(ProviderError) as exc_info:
            await provider.submit_job("https://example.com/audio.mp3")

        assert exc_info.value.provider == "vapi"
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_submit_job_missing_job_id(self, mock_config_vapi):
        """Test submission response without job ID."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={})
        provider.http_client.post = AsyncMock(return_value=mock_response)

        with pytest.raises(ProviderError) as exc_info:
            await provider.submit_job("https://example.com/audio.mp3")

        assert "jobId" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_get_status_processing(self, mock_config_vapi):
        """Test getting processing status."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={"status": "processing"})
        provider.http_client.get = AsyncMock(return_value=mock_response)

        status = await provider.get_status("job-123")

        assert status == TranscriptionStatus.PROCESSING

    @pytest.mark.asyncio
    async def test_get_status_completed(self, mock_config_vapi):
        """Test getting completed status."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={"status": "completed"})
        provider.http_client.get = AsyncMock(return_value=mock_response)

        status = await provider.get_status("job-123")

        assert status == TranscriptionStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_get_status_not_found(self, mock_config_vapi):
        """Test status check for non-existent job."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 404
        provider.http_client.get = AsyncMock(return_value=mock_response)

        with pytest.raises(ProviderError) as exc_info:
            await provider.get_status("nonexistent-job")

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_result_success(self, mock_config_vapi):
        """Test retrieving completed transcription."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={
            "text": "Hello world",
            "duration": 30.5,
            "confidence": 0.95,
            "speakers": ["Speaker 1"]
        })
        provider.http_client.get = AsyncMock(return_value=mock_response)

        result = await provider.get_result("job-123")

        assert result.job_id == "job-123"
        assert result.text == "Hello world"
        assert result.duration_seconds == 30.5
        assert result.confidence_score == 0.95
        assert len(result.speakers) == 1

    @pytest.mark.asyncio
    async def test_get_result_not_found(self, mock_config_vapi):
        """Test result retrieval for non-existent job."""
        provider = VAPIProvider(mock_config_vapi)

        mock_response = Mock()
        mock_response.status_code = 404
        provider.http_client.get = AsyncMock(return_value=mock_response)

        with pytest.raises(ProviderError) as exc_info:
            await provider.get_result("nonexistent-job")

        assert exc_info.value.status_code == 404


class TestRetellProvider:
    """Tests for Retell provider."""

    def test_init_valid(self, mock_config_retell):
        """Test Retell provider initialization."""
        provider = RetellProvider(mock_config_retell)
        assert provider.api_key == "test-retell-key"
        assert provider.endpoint == "https://api.retell.ai"

    def test_init_missing_api_key(self, mock_config_retell):
        """Test Retell init fails without API key."""
        mock_config_retell.retell_api_key = None
        with pytest.raises(ValueError, match="RETELL_API_KEY"):
            RetellProvider(mock_config_retell)

    @pytest.mark.asyncio
    async def test_submit_job_success(self, mock_config_retell):
        """Test successful job submission to Retell."""
        provider = RetellProvider(mock_config_retell)

        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json = Mock(return_value={"transcriptionId": "retell-job-456"})
        provider.http_client.post = AsyncMock(return_value=mock_response)

        job_id = await provider.submit_job("https://example.com/audio.mp3")

        assert job_id == "retell-job-456"

    @pytest.mark.asyncio
    async def test_submit_job_with_job_id_field(self, mock_config_retell):
        """Test submission with alternate job ID field."""
        provider = RetellProvider(mock_config_retell)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={"jobId": "retell-job-789"})
        provider.http_client.post = AsyncMock(return_value=mock_response)

        job_id = await provider.submit_job("https://example.com/audio.mp3")

        assert job_id == "retell-job-789"

    @pytest.mark.asyncio
    async def test_get_status_done(self, mock_config_retell):
        """Test getting 'done' status from Retell."""
        provider = RetellProvider(mock_config_retell)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={"status": "done"})
        provider.http_client.get = AsyncMock(return_value=mock_response)

        status = await provider.get_status("job-123")

        assert status == TranscriptionStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_get_status_in_progress(self, mock_config_retell):
        """Test getting 'in_progress' status from Retell."""
        provider = RetellProvider(mock_config_retell)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={"status": "in_progress"})
        provider.http_client.get = AsyncMock(return_value=mock_response)

        status = await provider.get_status("job-123")

        assert status == TranscriptionStatus.PROCESSING

    @pytest.mark.asyncio
    async def test_get_result_success(self, mock_config_retell):
        """Test retrieving result from Retell."""
        provider = RetellProvider(mock_config_retell)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value={
            "transcript": "Retell transcription",
            "durationSeconds": 60.0,
            "confidence": 0.92,
            "speakers": ["Speaker A", "Speaker B"]
        })
        provider.http_client.get = AsyncMock(return_value=mock_response)

        result = await provider.get_result("job-123")

        assert result.text == "Retell transcription"
        assert result.duration_seconds == 60.0
        assert result.confidence_score == 0.92
        assert len(result.speakers) == 2


class TestProviderFactory:
    """Tests for provider factory."""

    def test_create_vapi(self, mock_config_vapi):
        """Test creating VAPI provider."""
        provider = ProviderFactory.create(mock_config_vapi, "vapi")
        assert isinstance(provider, VAPIProvider)

    def test_create_retell(self, mock_config_retell):
        """Test creating Retell provider."""
        provider = ProviderFactory.create(mock_config_retell, "retell")
        assert isinstance(provider, RetellProvider)

    def test_create_case_insensitive(self, mock_config_vapi):
        """Test provider creation is case-insensitive."""
        provider = ProviderFactory.create(mock_config_vapi, "VAPI")
        assert isinstance(provider, VAPIProvider)

        provider = ProviderFactory.create(mock_config_vapi, "VaPi")
        assert isinstance(provider, VAPIProvider)

    def test_create_unsupported(self, mock_config_vapi):
        """Test creation with unsupported provider."""
        with pytest.raises(ValueError, match="Unsupported provider"):
            ProviderFactory.create(mock_config_vapi, "unsupported")

    def test_get_default_provider_vapi(self, mock_config_vapi):
        """Test getting default VAPI provider."""
        provider = ProviderFactory.get_default_provider(mock_config_vapi)
        assert isinstance(provider, VAPIProvider)

    def test_get_default_provider_retell(self, mock_config_retell):
        """Test getting default Retell provider."""
        provider = ProviderFactory.get_default_provider(mock_config_retell)
        assert isinstance(provider, RetellProvider)


class TestProviderIntegration:
    """Integration tests for providers."""

    @pytest.mark.asyncio
    async def test_vapi_full_workflow(self, mock_config_vapi):
        """Test complete VAPI workflow: submit → check status → get result."""
        provider = VAPIProvider(mock_config_vapi)

        # Mock job submission
        submit_response = Mock()
        submit_response.status_code = 201
        submit_response.json = Mock(return_value={"jobId": "vapi-job-test"})

        # Mock status check
        status_response = Mock()
        status_response.status_code = 200
        status_response.json = Mock(return_value={"status": "completed"})

        # Mock result retrieval
        result_response = Mock()
        result_response.status_code = 200
        result_response.json = Mock(return_value={
            "text": "Workflow test",
            "duration": 15.0,
            "confidence": 0.98
        })

        # Set up mocks
        provider.http_client.post = AsyncMock(return_value=submit_response)
        provider.http_client.get = AsyncMock(
            side_effect=[status_response, result_response]
        )

        # Execute workflow
        job_id = await provider.submit_job("https://example.com/audio.mp3")
        assert job_id == "vapi-job-test"

        status = await provider.get_status(job_id)
        assert status == TranscriptionStatus.COMPLETED

        result = await provider.get_result(job_id)
        assert result.text == "Workflow test"

    @pytest.mark.asyncio
    async def test_retell_full_workflow(self, mock_config_retell):
        """Test complete Retell workflow: submit → check status → get result."""
        provider = RetellProvider(mock_config_retell)

        # Mock job submission
        submit_response = Mock()
        submit_response.status_code = 200
        submit_response.json = Mock(return_value={"transcriptionId": "retell-job-test"})

        # Mock status check
        status_response = Mock()
        status_response.status_code = 200
        status_response.json = Mock(return_value={"status": "done"})

        # Mock result retrieval
        result_response = Mock()
        result_response.status_code = 200
        result_response.json = Mock(return_value={
            "transcript": "Retell workflow test",
            "durationSeconds": 20.0,
            "confidence": 0.96
        })

        # Set up mocks
        provider.http_client.post = AsyncMock(return_value=submit_response)
        provider.http_client.get = AsyncMock(
            side_effect=[status_response, result_response]
        )

        # Execute workflow
        job_id = await provider.submit_job("https://example.com/audio.mp3")
        assert job_id == "retell-job-test"

        status = await provider.get_status(job_id)
        assert status == TranscriptionStatus.COMPLETED

        result = await provider.get_result(job_id)
        assert result.text == "Retell workflow test"
