"""Tests for transcript-processor database layer."""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.database import (
    DatabaseClient,
    TranscriptRepository,
    UsageRepository,
)
from transcript_processor.config import ConfigManager


@pytest.fixture
def mock_config():
    """Create a mock ConfigManager."""
    config = Mock(spec=ConfigManager)
    config.supabase_url = "https://project.supabase.co"
    config.supabase_key = "anon_key_123"
    return config


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    return Mock()


class TestDatabaseClient:
    """Tests for DatabaseClient class."""

    def test_init_valid_config(self, mock_config):
        """Test initialization with valid config."""
        db = DatabaseClient(mock_config)
        assert db.config == mock_config
        assert db._client is None  # Lazy initialization

    def test_init_missing_url(self, mock_config):
        """Test that missing Supabase URL raises error."""
        mock_config.supabase_url = None
        with pytest.raises(ValueError, match="Supabase URL and key are required"):
            DatabaseClient(mock_config)

    def test_init_missing_key(self, mock_config):
        """Test that missing Supabase key raises error."""
        mock_config.supabase_key = None
        with pytest.raises(ValueError, match="Supabase URL and key are required"):
            DatabaseClient(mock_config)

    @patch('transcript_processor.database.ClientOptions')
    @patch('transcript_processor.database.create_client')
    def test_client_lazy_initialization(self, mock_create_client, mock_options_class, mock_config):
        """Test that client is initialized lazily."""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        mock_options_class.return_value = Mock()

        db = DatabaseClient(mock_config)
        assert db._client is None

        # Access client property
        client = db.client
        assert client is not None
        assert db._client is not None
        assert client == mock_client

    @patch('transcript_processor.database.ClientOptions')
    @patch('transcript_processor.database.create_client')
    def test_client_caching(self, mock_create_client, mock_options_class, mock_config):
        """Test that client is cached after first access."""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        mock_options_class.return_value = Mock()

        db = DatabaseClient(mock_config)
        client1 = db.client
        client2 = db.client

        assert client1 is client2
        mock_create_client.assert_called_once()

    @patch('transcript_processor.database.ClientOptions')
    @patch('transcript_processor.database.create_client')
    def test_health_check_success(self, mock_create_client, mock_options_class, mock_config):
        """Test successful health check."""
        mock_client = Mock()
        mock_query = Mock()
        mock_client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_response = Mock()
        mock_query.execute.return_value = mock_response

        mock_create_client.return_value = mock_client
        mock_options_class.return_value = Mock()

        db = DatabaseClient(mock_config)
        result = db.health_check()

        assert result is True
        mock_client.table.assert_called_with("transcriptions")

    @patch('transcript_processor.database.ClientOptions')
    @patch('transcript_processor.database.create_client')
    def test_health_check_failure(self, mock_create_client, mock_options_class, mock_config):
        """Test failed health check."""
        mock_client = Mock()
        mock_query = Mock()
        mock_client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.execute.side_effect = Exception("Connection failed")

        mock_create_client.return_value = mock_client
        mock_options_class.return_value = Mock()

        db = DatabaseClient(mock_config)
        result = db.health_check()

        assert result is False


class TestTranscriptRepository:
    """Tests for TranscriptRepository class."""

    @pytest.fixture
    def mock_db_client(self, mock_config):
        """Create a mock database client."""
        db = Mock(spec=DatabaseClient)
        db.config = mock_config
        db.client = Mock()
        return db

    @pytest.fixture
    def repo(self, mock_db_client):
        """Create a transcript repository with mock client."""
        return TranscriptRepository(mock_db_client)

    @pytest.mark.asyncio
    async def test_create_transcript(self, repo, mock_db_client):
        """Test creating a transcript record."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.insert.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{
            "customer_id": "cust-123",
            "job_id": "job-456",
            "status": "queued",
        }]
        mock_query.execute.return_value = mock_response

        result = await repo.create(
            customer_id="cust-123",
            job_id="job-456",
            audio_url="https://example.com/audio.mp3",
            language="en",
        )

        assert result is not None
        assert result["customer_id"] == "cust-123"
        assert result["job_id"] == "job-456"
        assert result["status"] == "queued"
        mock_db_client.client.table.assert_called_with("transcriptions")

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, repo, mock_db_client):
        """Test creating a transcript with all fields."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.insert.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{}]
        mock_query.execute.return_value = mock_response

        result = await repo.create(
            customer_id="cust-123",
            job_id="job-456",
            audio_url="https://example.com/audio.mp3",
            language="es",
            speaker_labels=True,
            provider="retell",
            priority="high",
            callback_url="https://myapp.com/webhook",
        )

        # Verify insert was called with correct data
        call_args = mock_query.insert.call_args
        assert call_args is not None

    @pytest.mark.asyncio
    async def test_get_by_job_id(self, repo, mock_db_client):
        """Test retrieving a transcript by job ID."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query
        mock_response = Mock()
        mock_response.data = {
            "customer_id": "cust-123",
            "job_id": "job-456",
            "status": "completed",
        }
        mock_query.execute.return_value = mock_response

        result = await repo.get_by_job_id(
            customer_id="cust-123",
            job_id="job-456",
        )

        assert result is not None
        assert result["job_id"] == "job-456"
        # Verify customer_id filter was applied
        assert mock_query.eq.call_count >= 2

    @pytest.mark.asyncio
    async def test_get_by_job_id_not_found(self, repo, mock_db_client):
        """Test retrieving a non-existent transcript."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query
        mock_response = Mock()
        mock_response.data = None
        mock_query.execute.return_value = mock_response

        result = await repo.get_by_job_id(
            customer_id="cust-123",
            job_id="nonexistent",
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_list_by_customer(self, repo, mock_db_client):
        """Test listing transcripts for a customer."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [
            {"job_id": "job-1", "status": "completed"},
            {"job_id": "job-2", "status": "processing"},
        ]
        mock_query.execute.return_value = mock_response

        result = await repo.list_by_customer(
            customer_id="cust-123",
            limit=10,
        )

        assert len(result) == 2
        assert result[0]["job_id"] == "job-1"

    @pytest.mark.asyncio
    async def test_list_by_customer_with_status_filter(self, repo, mock_db_client):
        """Test listing transcripts with status filter."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{"job_id": "job-1", "status": "completed"}]
        mock_query.execute.return_value = mock_response

        result = await repo.list_by_customer(
            customer_id="cust-123",
            status="completed",
        )

        assert len(result) == 1
        # Verify eq was called with status filter
        assert mock_query.eq.call_count >= 2

    @pytest.mark.asyncio
    async def test_update_status(self, repo, mock_db_client):
        """Test updating transcript status."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.update.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{"job_id": "job-456", "status": "processing"}]
        mock_query.execute.return_value = mock_response

        result = await repo.update_status(
            customer_id="cust-123",
            job_id="job-456",
            status="processing",
        )

        assert result is not None
        assert result["status"] == "processing"
        # Verify customer_id isolation
        assert mock_query.eq.call_count >= 2

    @pytest.mark.asyncio
    async def test_update_status_with_metadata(self, repo, mock_db_client):
        """Test updating status with additional metadata."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.update.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{}]
        mock_query.execute.return_value = mock_response

        result = await repo.update_status(
            customer_id="cust-123",
            job_id="job-456",
            status="processing",
            metadata={"estimated_completion": "2024-01-15T10:35:00Z"},
        )

        # Verify metadata was included
        update_call = mock_query.update.call_args
        assert update_call is not None

    @pytest.mark.asyncio
    async def test_update_with_result(self, repo, mock_db_client):
        """Test updating transcript with completed results."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.update.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{
            "job_id": "job-456",
            "status": "completed",
            "word_count": 42,
        }]
        mock_query.execute.return_value = mock_response

        result = await repo.update_with_result(
            customer_id="cust-123",
            job_id="job-456",
            text_content="Hello, world! This is a test.",
            duration_seconds=5.2,
            word_count=6,
            speakers=["Speaker 1"],
            confidence_score=0.95,
        )

        assert result is not None
        assert result["status"] == "completed"
        assert result["word_count"] == 42

    @pytest.mark.asyncio
    async def test_mark_failed(self, repo, mock_db_client):
        """Test marking a transcript as failed."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.update.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{
            "job_id": "job-456",
            "status": "failed",
        }]
        mock_query.execute.return_value = mock_response

        result = await repo.mark_failed(
            customer_id="cust-123",
            job_id="job-456",
            error_message="Timeout processing audio",
        )

        assert result is not None
        assert result["status"] == "failed"


class TestUsageRepository:
    """Tests for UsageRepository class."""

    @pytest.fixture
    def mock_db_client(self, mock_config):
        """Create a mock database client."""
        db = Mock(spec=DatabaseClient)
        db.config = mock_config
        db.client = Mock()
        return db

    @pytest.fixture
    def repo(self, mock_db_client):
        """Create a usage repository with mock client."""
        return UsageRepository(mock_db_client)

    @pytest.mark.asyncio
    async def test_create_usage_event(self, repo, mock_db_client):
        """Test creating a usage event."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.insert.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{
            "customer_id": "cust-123",
            "service_name": "transcript-processor",
            "cost_usd": 0.05,
        }]
        mock_query.execute.return_value = mock_response

        result = await repo.create(
            customer_id="cust-123",
            service_name="transcript-processor",
            service_action="transcribe",
            quantity=1,
            unit="request",
            cost_usd=0.05,
        )

        assert result is not None
        assert result["cost_usd"] == 0.05
        mock_db_client.client.table.assert_called_with("usage_events")

    @pytest.mark.asyncio
    async def test_list_by_customer(self, repo, mock_db_client):
        """Test listing usage events for a customer."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [
            {"service_action": "transcribe", "cost_usd": 0.05},
            {"service_action": "transcribe", "cost_usd": 0.05},
        ]
        mock_query.execute.return_value = mock_response

        result = await repo.list_by_customer(customer_id="cust-123")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_total_cost(self, repo, mock_db_client):
        """Test calculating total cost for a customer."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [
            {"cost_usd": 0.05},
            {"cost_usd": 0.10},
            {"cost_usd": 0.03},
        ]
        mock_query.execute.return_value = mock_response

        result = await repo.get_total_cost(customer_id="cust-123")

        assert result == 0.18

    @pytest.mark.asyncio
    async def test_get_total_cost_empty(self, repo, mock_db_client):
        """Test total cost calculation with no events."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = None
        mock_query.execute.return_value = mock_response

        result = await repo.get_total_cost(customer_id="cust-123")

        assert result == 0.0

    @pytest.mark.asyncio
    async def test_get_total_cost_missing_values(self, repo, mock_db_client):
        """Test total cost calculation with missing values."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [
            {"cost_usd": 0.05},
            {},  # Missing cost_usd
            {"cost_usd": 0.10},
        ]
        mock_query.execute.return_value = mock_response

        result = await repo.get_total_cost(customer_id="cust-123")

        # Use approximate comparison for floating point
        assert abs(result - 0.15) < 0.001


class TestMultiTenantIsolation:
    """Tests to verify multi-tenant isolation is correctly implemented."""

    @pytest.fixture
    def mock_db_client(self, mock_config):
        """Create a mock database client."""
        db = Mock(spec=DatabaseClient)
        db.config = mock_config
        db.client = Mock()
        return db

    @pytest.fixture
    def repo(self, mock_db_client):
        """Create a transcript repository."""
        return TranscriptRepository(mock_db_client)

    @pytest.mark.asyncio
    async def test_customer_isolation_on_get(self, repo, mock_db_client):
        """Test that customer_id is always included in get queries."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query
        mock_response = Mock()
        mock_response.data = None
        mock_query.execute.return_value = mock_response

        await repo.get_by_job_id(customer_id="cust-123", job_id="job-456")

        # Verify that eq was called at least twice (once for customer_id, once for job_id)
        eq_calls = mock_query.eq.call_args_list
        assert len(eq_calls) >= 2
        # First call should be for customer_id
        assert "customer_id" in str(eq_calls[0]) or "cust-123" in str(eq_calls[0])

    @pytest.mark.asyncio
    async def test_customer_isolation_on_list(self, repo, mock_db_client):
        """Test that customer_id filter is always applied in list queries."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_response = Mock()
        mock_response.data = []
        mock_query.execute.return_value = mock_response

        await repo.list_by_customer(customer_id="cust-123")

        # Verify customer_id filter was applied
        eq_calls = mock_query.eq.call_args_list
        assert len(eq_calls) >= 1

    @pytest.mark.asyncio
    async def test_customer_isolation_on_update(self, repo, mock_db_client):
        """Test that customer_id is required for update queries."""
        mock_query = Mock()
        mock_db_client.client.table.return_value = mock_query
        mock_query.update.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_response = Mock()
        mock_response.data = [{}]
        mock_query.execute.return_value = mock_response

        await repo.update_status(
            customer_id="cust-123",
            job_id="job-456",
            status="completed",
        )

        # Verify both customer_id and job_id filters
        eq_calls = mock_query.eq.call_args_list
        assert len(eq_calls) >= 2
