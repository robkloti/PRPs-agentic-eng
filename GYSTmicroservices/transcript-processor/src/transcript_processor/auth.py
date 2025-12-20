"""Authentication system for transcript-processor service.

Supports dual-mode authentication:
- Internal: Header-based (X-Customer-ID) - no verification needed
- External: API key-based (Bearer token) - validates against stored keys

The authentication system ties into the configuration and provides:
- Request validation
- Customer ID extraction
- API key lookup (for external mode)
- Error handling with appropriate HTTP status codes
"""

import logging
from typing import Optional, Tuple
import hashlib
import hmac
from datetime import datetime, timezone

from .config import ConfigManager
from .database import DatabaseClient


logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when authentication fails."""

    def __init__(self, message: str, status_code: int = 401):
        """Initialize authentication error.

        Args:
            message: Error description
            status_code: HTTP status code (401 for auth, 403 for forbidden)
        """
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthenticatedRequest:
    """Represents an authenticated request with extracted customer ID."""

    def __init__(self, customer_id: str, api_key_id: Optional[str] = None, plan: Optional[str] = None):
        """Initialize authenticated request.

        Args:
            customer_id: Extracted customer ID
            api_key_id: Optional API key ID (for external mode)
            plan: Optional plan tier (free, starter, pro, enterprise)
        """
        self.customer_id = customer_id
        self.api_key_id = api_key_id
        self.plan = plan or "free"
        self.authenticated_at = datetime.now(timezone.utc)


class InternalAuthenticator:
    """Authenticator for internal deployment mode.

    In internal mode, authentication is minimal - just extract the customer ID
    from a required header. No validation is performed.
    """

    def __init__(self, config: ConfigManager):
        """Initialize internal authenticator.

        Args:
            config: Configuration manager
        """
        self.config = config
        self.header_name = config.auth_header or "X-Customer-ID"

    def authenticate(self, headers: dict) -> AuthenticatedRequest:
        """Authenticate a request using header-based auth.

        Args:
            headers: HTTP request headers (case-insensitive lookup)

        Returns:
            AuthenticatedRequest with extracted customer ID

        Raises:
            AuthenticationError: If customer ID header is missing
        """
        # Headers dict may have mixed case, so do case-insensitive lookup
        customer_id = self._get_header(headers, self.header_name)

        if not customer_id or not customer_id.strip():
            raise AuthenticationError(
                f"Missing or empty {self.header_name} header",
                status_code=400,
            )

        return AuthenticatedRequest(customer_id=customer_id.strip())

    @staticmethod
    def _get_header(headers: dict, name: str) -> Optional[str]:
        """Get header value with case-insensitive lookup.

        Args:
            headers: Headers dictionary
            name: Header name to find

        Returns:
            Header value if found, None otherwise
        """
        # Try exact match first
        if name in headers:
            return headers[name]

        # Try case-insensitive match
        for key, value in headers.items():
            if key.lower() == name.lower():
                return value

        return None


class ExternalAuthenticator:
    """Authenticator for external deployment mode.

    In external mode, validates API keys against stored credentials.
    Supports Bearer token format in Authorization header.
    """

    def __init__(self, config: ConfigManager, db: DatabaseClient):
        """Initialize external authenticator.

        Args:
            config: Configuration manager
            db: Database client for API key lookups
        """
        self.config = config
        self.db = db
        self.header_name = config.auth_header or "Authorization"
        self.prefix = config.auth_prefix or "Bearer"

    async def authenticate(self, headers: dict) -> AuthenticatedRequest:
        """Authenticate a request using API key validation.

        Args:
            headers: HTTP request headers

        Returns:
            AuthenticatedRequest with customer ID and API key info

        Raises:
            AuthenticationError: If API key is invalid or missing
        """
        auth_header = self._get_header(headers, self.header_name)

        if not auth_header:
            raise AuthenticationError(
                f"Missing {self.header_name} header",
                status_code=401,
            )

        # Extract token from "Bearer <token>" format
        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.prefix:
            raise AuthenticationError(
                f"Invalid {self.header_name} format. Expected '{self.prefix} <token>'",
                status_code=401,
            )

        api_key = parts[1]

        # Validate API key against database
        customer_info = await self._validate_api_key(api_key)
        if not customer_info:
            logger.warning(f"Invalid API key attempted")
            raise AuthenticationError(
                "Invalid API key",
                status_code=401,
            )

        return AuthenticatedRequest(
            customer_id=customer_info["customer_id"],
            api_key_id=customer_info.get("api_key_id"),
            plan=customer_info.get("plan", "free"),
        )

    async def _validate_api_key(self, api_key: str) -> Optional[dict]:
        """Validate an API key against the database.

        Args:
            api_key: API key to validate

        Returns:
            Dictionary with customer info if valid, None otherwise
        """
        try:
            # Hash the API key for comparison (assuming keys are hashed in DB)
            api_key_hash = self._hash_api_key(api_key)

            # Query the database for matching API key
            # This would be implemented with your database schema
            # For now, we return a placeholder that shows the pattern
            response = (
                self.db.client.table("api_keys")
                .select("customer_id, id, customers(plan)")
                .eq("key_hash", api_key_hash)
                .eq("is_active", True)
                .single()
                .execute()
            )

            if not response.data:
                return None

            return {
                "customer_id": response.data["customer_id"],
                "api_key_id": response.data["id"],
                "plan": response.data.get("customers", {}).get("plan", "free"),
            }
        except Exception as e:
            logger.error(f"Error validating API key: {e}")
            return None

    @staticmethod
    def _hash_api_key(api_key: str) -> str:
        """Hash an API key for secure comparison.

        Args:
            api_key: API key to hash

        Returns:
            SHA256 hash of the API key
        """
        return hashlib.sha256(api_key.encode()).hexdigest()

    @staticmethod
    def _get_header(headers: dict, name: str) -> Optional[str]:
        """Get header value with case-insensitive lookup.

        Args:
            headers: Headers dictionary
            name: Header name to find

        Returns:
            Header value if found, None otherwise
        """
        # Try exact match first
        if name in headers:
            return headers[name]

        # Try case-insensitive match
        for key, value in headers.items():
            if key.lower() == name.lower():
                return value

        return None


class AuthenticationManager:
    """Main authentication manager that delegates to mode-specific authenticators."""

    def __init__(self, config: ConfigManager, db: Optional[DatabaseClient] = None):
        """Initialize authentication manager.

        Args:
            config: Configuration manager
            db: Database client (required for external mode)
        """
        self.config = config
        self.db = db

        if config.auth_type == "header":
            self.authenticator = InternalAuthenticator(config)
        elif config.auth_type == "api_key":
            if not db:
                raise ValueError("Database client required for API key authentication")
            self.authenticator = ExternalAuthenticator(config, db)
        else:
            raise ValueError(f"Unsupported auth type: {config.auth_type}")

    def authenticate(self, headers: dict) -> AuthenticatedRequest:
        """Synchronous authentication (for internal mode).

        Args:
            headers: HTTP request headers

        Returns:
            AuthenticatedRequest with extracted customer ID

        Raises:
            AuthenticationError: If authentication fails
        """
        if not isinstance(self.authenticator, InternalAuthenticator):
            raise RuntimeError("Use authenticate_async for external mode")

        return self.authenticator.authenticate(headers)

    async def authenticate_async(self, headers: dict) -> AuthenticatedRequest:
        """Asynchronous authentication (for external mode).

        Args:
            headers: HTTP request headers

        Returns:
            AuthenticatedRequest with extracted customer ID

        Raises:
            AuthenticationError: If authentication fails
        """
        if isinstance(self.authenticator, InternalAuthenticator):
            return self.authenticator.authenticate(headers)
        else:
            return await self.authenticator.authenticate(headers)


# FastAPI dependency for authentication
async def get_current_customer(
    auth_manager: AuthenticationManager,
    headers: dict,
) -> AuthenticatedRequest:
    """FastAPI dependency for authentication.

    Usage in FastAPI:
        @app.post("/transcribe")
        async def transcribe(
            request: TranscriptProcessRequest,
            current_customer: AuthenticatedRequest = Depends(get_current_customer),
        ):
            # current_customer.customer_id is the authenticated customer

    Args:
        auth_manager: Injected authentication manager
        headers: Request headers from FastAPI

    Returns:
        AuthenticatedRequest

    Raises:
        AuthenticationError: If authentication fails
    """
    return await auth_manager.authenticate_async(headers)
