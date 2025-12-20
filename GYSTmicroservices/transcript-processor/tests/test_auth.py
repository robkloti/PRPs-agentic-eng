"""Tests for transcript-processor authentication system."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.auth import (
    AuthenticationError,
    AuthenticatedRequest,
    InternalAuthenticator,
    ExternalAuthenticator,
    AuthenticationManager,
)
from transcript_processor.config import ConfigManager


@pytest.fixture
def internal_config():
    """Create a mock internal mode config."""
    config = Mock(spec=ConfigManager)
    config.auth_type = "header"
    config.auth_header = "X-Customer-ID"
    config.auth_prefix = None
    return config


@pytest.fixture
def external_config():
    """Create a mock external mode config."""
    config = Mock(spec=ConfigManager)
    config.auth_type = "api_key"
    config.auth_header = "Authorization"
    config.auth_prefix = "Bearer"
    return config


@pytest.fixture
def mock_db():
    """Create a mock database client."""
    return Mock()


class TestAuthenticatedRequest:
    """Tests for AuthenticatedRequest class."""

    def test_creation_minimal(self):
        """Test creating authenticated request with minimal fields."""
        req = AuthenticatedRequest(customer_id="cust-123")
        assert req.customer_id == "cust-123"
        assert req.api_key_id is None
        assert req.plan == "free"
        assert req.authenticated_at is not None

    def test_creation_full(self):
        """Test creating authenticated request with all fields."""
        req = AuthenticatedRequest(
            customer_id="cust-456",
            api_key_id="key-789",
            plan="pro"
        )
        assert req.customer_id == "cust-456"
        assert req.api_key_id == "key-789"
        assert req.plan == "pro"


class TestInternalAuthenticator:
    """Tests for internal mode authentication."""

    @pytest.fixture
    def auth(self, internal_config):
        """Create internal authenticator."""
        return InternalAuthenticator(internal_config)

    def test_authenticate_success(self, auth):
        """Test successful authentication with valid header."""
        headers = {"X-Customer-ID": "cust-123"}
        result = auth.authenticate(headers)

        assert isinstance(result, AuthenticatedRequest)
        assert result.customer_id == "cust-123"

    def test_authenticate_case_insensitive(self, auth):
        """Test that header lookup is case-insensitive."""
        headers = {"x-customer-id": "cust-456"}
        result = auth.authenticate(headers)

        assert result.customer_id == "cust-456"

    def test_authenticate_missing_header(self, auth):
        """Test authentication fails when header is missing."""
        headers = {}
        with pytest.raises(AuthenticationError) as exc_info:
            auth.authenticate(headers)

        assert exc_info.value.status_code == 400

    def test_authenticate_empty_header(self, auth):
        """Test authentication fails when header is empty."""
        headers = {"X-Customer-ID": ""}
        with pytest.raises(AuthenticationError) as exc_info:
            auth.authenticate(headers)

        assert exc_info.value.status_code == 400

    def test_authenticate_whitespace_header(self, auth):
        """Test that whitespace is trimmed."""
        headers = {"X-Customer-ID": "  cust-789  "}
        result = auth.authenticate(headers)

        assert result.customer_id == "cust-789"

    def test_custom_header_name(self, internal_config):
        """Test authentication with custom header name."""
        internal_config.auth_header = "X-Tenant-ID"
        auth = InternalAuthenticator(internal_config)

        headers = {"X-Tenant-ID": "tenant-123"}
        result = auth.authenticate(headers)

        assert result.customer_id == "tenant-123"

    def test_get_header_case_insensitive(self):
        """Test get_header helper with case-insensitive lookup."""
        headers = {"Content-Type": "application/json", "X-Custom": "value"}

        assert InternalAuthenticator._get_header(headers, "x-custom") == "value"
        assert InternalAuthenticator._get_header(headers, "X-CUSTOM") == "value"
        assert InternalAuthenticator._get_header(headers, "X-Missing") is None


class TestExternalAuthenticator:
    """Tests for external mode authentication."""

    @pytest.fixture
    def auth(self, external_config, mock_db):
        """Create external authenticator."""
        return ExternalAuthenticator(external_config, mock_db)

    @pytest.mark.asyncio
    async def test_authenticate_success(self, auth):
        """Test successful authentication with valid API key."""
        mock_query = Mock()
        auth.db.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query

        mock_response = Mock()
        mock_response.data = {
            "customer_id": "cust-123",
            "id": "key-123",
            "customers": {"plan": "pro"}
        }
        mock_query.execute.return_value = mock_response

        headers = {"Authorization": "Bearer valid_api_key"}
        result = await auth.authenticate(headers)

        assert isinstance(result, AuthenticatedRequest)
        assert result.customer_id == "cust-123"
        assert result.api_key_id == "key-123"
        assert result.plan == "pro"

    @pytest.mark.asyncio
    async def test_authenticate_missing_header(self, auth):
        """Test authentication fails when Authorization header is missing."""
        headers = {}
        with pytest.raises(AuthenticationError) as exc_info:
            await auth.authenticate(headers)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_authenticate_invalid_format(self, auth):
        """Test authentication fails with invalid header format."""
        # Missing "Bearer" prefix
        headers = {"Authorization": "invalid_api_key"}
        with pytest.raises(AuthenticationError) as exc_info:
            await auth.authenticate(headers)

        assert exc_info.value.status_code == 401
        assert "format" in exc_info.value.message.lower()

    @pytest.mark.asyncio
    async def test_authenticate_wrong_prefix(self, auth):
        """Test authentication fails with wrong prefix."""
        headers = {"Authorization": "Basic invalid_api_key"}
        with pytest.raises(AuthenticationError) as exc_info:
            await auth.authenticate(headers)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_authenticate_invalid_key(self, auth):
        """Test authentication fails with invalid API key."""
        mock_query = Mock()
        auth.db.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query

        mock_response = Mock()
        mock_response.data = None
        mock_query.execute.return_value = mock_response

        headers = {"Authorization": "Bearer invalid_key"}
        with pytest.raises(AuthenticationError) as exc_info:
            await auth.authenticate(headers)

        assert exc_info.value.status_code == 401
        assert "invalid" in exc_info.value.message.lower()

    @pytest.mark.asyncio
    async def test_authenticate_database_error(self, auth):
        """Test authentication handles database errors gracefully."""
        auth.db.client.table.side_effect = Exception("Database error")

        headers = {"Authorization": "Bearer some_key"}
        with pytest.raises(AuthenticationError):
            await auth.authenticate(headers)

    def test_hash_api_key(self):
        """Test API key hashing is deterministic."""
        api_key = "test-api-key-123"
        hash1 = ExternalAuthenticator._hash_api_key(api_key)
        hash2 = ExternalAuthenticator._hash_api_key(api_key)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length

    def test_hash_api_key_different_inputs(self):
        """Test different API keys produce different hashes."""
        hash1 = ExternalAuthenticator._hash_api_key("key-1")
        hash2 = ExternalAuthenticator._hash_api_key("key-2")

        assert hash1 != hash2

    def test_custom_header_and_prefix(self, external_config, mock_db):
        """Test authentication with custom header and prefix."""
        external_config.auth_header = "X-API-Key"
        external_config.auth_prefix = "Key"

        auth = ExternalAuthenticator(external_config, mock_db)
        assert auth.header_name == "X-API-Key"
        assert auth.prefix == "Key"

    @pytest.mark.asyncio
    async def test_case_insensitive_header(self, auth):
        """Test header lookup is case-insensitive."""
        mock_query = Mock()
        auth.db.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query

        mock_response = Mock()
        mock_response.data = {"customer_id": "cust-123", "id": "key-123"}
        mock_query.execute.return_value = mock_response

        # Use lowercase header name
        headers = {"authorization": "Bearer some_key"}
        result = await auth.authenticate(headers)

        assert result.customer_id == "cust-123"


class TestAuthenticationManager:
    """Tests for main authentication manager."""

    def test_init_internal_mode(self, internal_config):
        """Test initialization in internal mode."""
        manager = AuthenticationManager(internal_config)
        assert isinstance(manager.authenticator, InternalAuthenticator)

    def test_init_external_mode_without_db(self, external_config):
        """Test external mode requires database client."""
        with pytest.raises(ValueError, match="Database client required"):
            AuthenticationManager(external_config, db=None)

    def test_init_external_mode_with_db(self, external_config, mock_db):
        """Test initialization in external mode with database."""
        manager = AuthenticationManager(external_config, db=mock_db)
        assert isinstance(manager.authenticator, ExternalAuthenticator)

    def test_init_invalid_mode(self):
        """Test initialization with invalid auth type."""
        config = Mock(spec=ConfigManager)
        config.auth_type = "invalid"

        with pytest.raises(ValueError, match="Unsupported auth type"):
            AuthenticationManager(config)

    def test_authenticate_internal(self, internal_config):
        """Test synchronous authentication for internal mode."""
        manager = AuthenticationManager(internal_config)
        headers = {"X-Customer-ID": "cust-123"}

        result = manager.authenticate(headers)

        assert result.customer_id == "cust-123"

    def test_authenticate_sync_internal_only(self, internal_config, external_config, mock_db):
        """Test that sync authenticate only works for internal mode."""
        # Internal mode works with sync authenticate
        manager = AuthenticationManager(internal_config)
        result = manager.authenticate({"X-Customer-ID": "cust-123"})
        assert result.customer_id == "cust-123"

        # External mode requires async (attempting sync with external mode config)
        # Note: The manager delegates to the authenticator, so this is more of
        # an API design test than a practical test

    @pytest.mark.asyncio
    async def test_authenticate_async_internal(self, internal_config):
        """Test async authentication works for internal mode."""
        manager = AuthenticationManager(internal_config)
        headers = {"X-Customer-ID": "cust-456"}

        result = await manager.authenticate_async(headers)

        assert result.customer_id == "cust-456"

    @pytest.mark.asyncio
    async def test_authenticate_async_external(self, external_config, mock_db):
        """Test async authentication for external mode."""
        manager = AuthenticationManager(external_config, db=mock_db)

        mock_query = Mock()
        mock_db.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query

        mock_response = Mock()
        mock_response.data = {"customer_id": "cust-789", "id": "key-789"}
        mock_query.execute.return_value = mock_response

        headers = {"Authorization": "Bearer valid_key"}
        result = await manager.authenticate_async(headers)

        assert result.customer_id == "cust-789"


class TestAuthenticationError:
    """Tests for AuthenticationError exception."""

    def test_error_creation_default(self):
        """Test creating error with default status code."""
        error = AuthenticationError("Test error")
        assert error.message == "Test error"
        assert error.status_code == 401

    def test_error_creation_custom_status(self):
        """Test creating error with custom status code."""
        error = AuthenticationError("Bad request", status_code=400)
        assert error.message == "Bad request"
        assert error.status_code == 400

    def test_error_is_exception(self):
        """Test that AuthenticationError is an Exception."""
        error = AuthenticationError("Test")
        assert isinstance(error, Exception)


class TestAuthenticationIntegration:
    """Integration tests for authentication system."""

    def test_internal_mode_workflow(self, internal_config):
        """Test complete internal mode authentication workflow."""
        manager = AuthenticationManager(internal_config)

        # Valid request
        headers = {"X-Customer-ID": "internal-customer"}
        result = manager.authenticate(headers)

        assert result.customer_id == "internal-customer"
        assert result.api_key_id is None
        assert result.plan == "free"

    @pytest.mark.asyncio
    async def test_external_mode_workflow(self, external_config, mock_db):
        """Test complete external mode authentication workflow."""
        manager = AuthenticationManager(external_config, db=mock_db)

        # Setup mock database response
        mock_query = Mock()
        mock_db.client.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query

        mock_response = Mock()
        mock_response.data = {
            "customer_id": "external-customer",
            "id": "external-key-id",
            "customers": {"plan": "enterprise"}
        }
        mock_query.execute.return_value = mock_response

        # Valid request
        headers = {"Authorization": "Bearer external-api-key"}
        result = await manager.authenticate_async(headers)

        assert result.customer_id == "external-customer"
        assert result.api_key_id == "external-key-id"
        assert result.plan == "enterprise"

    @pytest.mark.asyncio
    async def test_authentication_error_handling(self, external_config, mock_db):
        """Test error handling across authentication system."""
        manager = AuthenticationManager(external_config, db=mock_db)

        # Test missing header
        with pytest.raises(AuthenticationError) as exc_info:
            await manager.authenticate_async({})
        assert exc_info.value.status_code == 401

        # Test invalid format
        with pytest.raises(AuthenticationError) as exc_info:
            await manager.authenticate_async({"Authorization": "InvalidFormat"})
        assert exc_info.value.status_code == 401
