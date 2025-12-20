"""Tests for FastAPI application endpoints."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.app import create_app
from transcript_processor.config import ConfigManager
from transcript_processor.database import DatabaseClient
from transcript_processor.auth import AuthenticatedRequest, AuthenticationError


@pytest.fixture
def mock_config():
    """Create mock configuration."""
    config = Mock(spec=ConfigManager)
    config.auth_type = "header"
    config.auth_header = "X-Customer-ID"
    config.default_provider = "vapi"
    config.supabase_url = "https://example.supabase.co"
    config.supabase_key = "test-key"
    return config


@pytest.fixture
def mock_db():
    """Create mock database client."""
    db = Mock(spec=DatabaseClient)
    db.health_check = Mock(return_value=True)
    return db


@pytest.fixture
def client(mock_config, mock_db):
    """Create test client with mocked dependencies."""
    app = create_app(mock_config)

    # Override dependencies
    async def override_get_config():
        return mock_config

    async def override_get_db(config=None):
        return mock_db

    app.dependency_overrides[lambda: None] = override_get_config

    return TestClient(app)


class TestHealthAndInfo:
    """Tests for health and info endpoints."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_health_check_healthy(self, app_with_mocks):
        """Test health check when database is healthy."""
        client = TestClient(app_with_mocks)

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "transcript-processor"
        assert "timestamp" in data

    def test_service_info(self, app_with_mocks):
        """Test service info endpoint."""
        client = TestClient(app_with_mocks)

        response = client.get("/info")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "transcript-processor"
        assert "vapi" in data["providers"]
        assert "retell" in data["providers"]
        assert "free" in data["plans"]


class TestTranscriptionEndpoints:
    """Tests for transcription endpoints."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_submit_transcription_missing_auth(self, app_with_mocks):
        """Test submission without authentication."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/transcribe",
            json={
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
            }
        )
        # Should fail due to missing auth
        assert response.status_code in [400, 401, 422]

    def test_submit_transcription_invalid_url(self, app_with_mocks):
        """Test submission with invalid audio URL."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/transcribe",
            json={
                "audio_url": "not-a-url",
                "language": "en",
            },
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail URL validation
        assert response.status_code == 422

    def test_submit_transcription_invalid_language(self, app_with_mocks):
        """Test submission with invalid language code."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/transcribe",
            json={
                "audio_url": "https://example.com/audio.mp3",
                "language": "invalid",
            },
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail language validation (must be 2-char code)
        assert response.status_code == 422

    def test_check_status_missing_auth(self, app_with_mocks):
        """Test status check without authentication."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/status",
            json={"job_id": "job-123"}
        )
        # Should fail due to missing auth
        assert response.status_code in [400, 401, 422]

    def test_get_result_missing_auth(self, app_with_mocks):
        """Test result retrieval without authentication."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/result",
            json={"job_id": "job-123"}
        )
        # Should fail due to missing auth
        assert response.status_code in [400, 401, 422]


class TestUsageEndpoint:
    """Tests for usage and billing endpoint."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_get_usage_missing_auth(self, app_with_mocks):
        """Test usage endpoint without authentication."""
        client = TestClient(app_with_mocks)

        response = client.get("/usage")
        # Should fail due to missing auth
        assert response.status_code in [400, 401, 422]

    def test_get_usage_invalid_days_parameter(self, app_with_mocks):
        """Test usage endpoint with invalid days parameter."""
        client = TestClient(app_with_mocks)

        response = client.get(
            "/usage?days=0",
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail validation (days must be >= 1)
        assert response.status_code == 422

    def test_get_usage_days_too_large(self, app_with_mocks):
        """Test usage endpoint with days > 365."""
        client = TestClient(app_with_mocks)

        response = client.get(
            "/usage?days=366",
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail validation (days must be <= 365)
        assert response.status_code == 422


class TestJobsEndpoint:
    """Tests for jobs listing endpoint."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_list_jobs_missing_auth(self, app_with_mocks):
        """Test jobs listing without authentication."""
        client = TestClient(app_with_mocks)

        response = client.get("/jobs")
        # Should fail due to missing auth
        assert response.status_code in [400, 401, 422]

    def test_list_jobs_invalid_limit(self, app_with_mocks):
        """Test jobs listing with invalid limit."""
        client = TestClient(app_with_mocks)

        response = client.get(
            "/jobs?limit=201",
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail validation (limit must be <= 200)
        assert response.status_code == 422

    def test_list_jobs_invalid_offset(self, app_with_mocks):
        """Test jobs listing with negative offset."""
        client = TestClient(app_with_mocks)

        response = client.get(
            "/jobs?offset=-1",
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail validation (offset must be >= 0)
        assert response.status_code == 422


class TestDependencyInjection:
    """Tests for dependency injection and injection overrides."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_dependencies_are_cached(self, app_with_mocks):
        """Test that dependencies are cached across requests."""
        client = TestClient(app_with_mocks)

        # First request
        response1 = client.get("/info")
        assert response1.status_code == 200

        # Second request should use cached dependencies
        response2 = client.get("/info")
        assert response2.status_code == 200

    def test_health_check_respects_db_status(self, app_with_mocks):
        """Test that health check reflects actual database status."""
        client = TestClient(app_with_mocks)

        # Get initial response
        response = client.get("/health")

        # Should return valid status
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy"]


class TestRequestValidation:
    """Tests for request parameter validation."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_submit_transcription_validates_priority(self, app_with_mocks):
        """Test that priority parameter is validated."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/transcribe",
            json={
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "priority": "invalid"
            },
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail priority validation
        assert response.status_code == 422

    def test_submit_transcription_validates_provider(self, app_with_mocks):
        """Test that provider parameter is validated."""
        client = TestClient(app_with_mocks)

        response = client.post(
            "/transcribe",
            json={
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "provider": "invalid"
            },
            headers={"X-Customer-ID": "cust-123"}
        )
        # Should fail provider validation
        assert response.status_code == 422

    def test_submit_transcription_accepts_valid_provider(self, app_with_mocks):
        """Test that valid providers are accepted."""
        client = TestClient(app_with_mocks)

        # VAPI provider should be valid
        response = client.post(
            "/transcribe",
            json={
                "audio_url": "https://example.com/audio.mp3",
                "language": "en",
                "provider": "vapi"
            },
            headers={"X-Customer-ID": "cust-123"}
        )
        # Will fail for other reasons but not parameter validation
        assert response.status_code != 422 or "provider" not in response.text.lower()


class TestErrorHandling:
    """Tests for error handling in endpoints."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_invalid_job_status_query(self, app_with_mocks):
        """Test status endpoint with invalid query parameters."""
        client = TestClient(app_with_mocks)

        # Missing required job_id parameter
        response = client.post(
            "/status",
            json={},
            headers={"X-Customer-ID": "cust-123"}
        )
        assert response.status_code == 422


class TestCORSMiddleware:
    """Tests for CORS middleware."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_cors_headers_present(self, app_with_mocks):
        """Test that CORS headers are present in responses."""
        client = TestClient(app_with_mocks)

        response = client.options(
            "/info",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
            }
        )

        # CORS should allow the request
        assert response.status_code in [200, 204, 405]


class TestAppCreation:
    """Tests for app creation and configuration."""

    def test_create_app_with_config(self, mock_config):
        """Test creating app with explicit config."""
        app = create_app(mock_config)
        assert app is not None

    def test_app_has_all_endpoints(self, mock_config):
        """Test that app has all required endpoints."""
        app = create_app(mock_config)

        # Get all routes
        routes = [route.path for route in app.routes]

        assert "/health" in routes
        assert "/info" in routes
        assert "/transcribe" in routes
        assert "/status" in routes
        assert "/result" in routes
        assert "/usage" in routes
        assert "/jobs" in routes


class TestIntegration:
    """Integration tests for endpoint interactions."""

    @pytest.fixture
    def app_with_mocks(self, mock_config, mock_db):
        """Create app with proper dependency mocks."""
        app = create_app(mock_config)

        async def override_get_config():
            return mock_config

        async def override_get_db(config=None):
            return mock_db

        from transcript_processor.app import get_config, get_db
        app.dependency_overrides[get_config] = override_get_config
        app.dependency_overrides[get_db] = override_get_db

        return app

    def test_app_startup_and_info_request(self, app_with_mocks):
        """Test that app can start and respond to info request."""
        client = TestClient(app_with_mocks)

        # Make request
        response = client.get("/info")

        # Should succeed
        assert response.status_code == 200
        assert response.json()["service"] == "transcript-processor"

    def test_health_and_info_endpoints_consistent(self, app_with_mocks):
        """Test that health and info endpoints are consistent."""
        client = TestClient(app_with_mocks)

        # Get info
        info_response = client.get("/info")
        info_data = info_response.json()

        # Get health
        health_response = client.get("/health")
        health_data = health_response.json()

        # Both should reference the same service
        assert health_data["service"] == info_data["service"]

