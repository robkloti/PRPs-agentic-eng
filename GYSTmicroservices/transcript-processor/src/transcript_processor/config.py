"""Configuration management for transcript-processor service.

Supports dual-mode architecture:
- Internal: No authentication, no rate limits, no billing
- External: API key auth, rate limits, billing enabled

Configuration is loaded from:
1. config/{mode}.yaml (deployment config)
2. Environment variables (secrets, API keys)
3. System environment (python-dotenv)
"""

import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AuthConfig(BaseModel):
    """Authentication configuration."""

    type: str = Field(
        description="Auth type: 'header' (internal), 'api_key' (external), or 'none'"
    )
    required_header: Optional[str] = Field(
        default=None,
        description="Header name for header-based auth (e.g., X-Customer-ID)"
    )
    header: Optional[str] = Field(
        default=None,
        description="Header name for API key auth (e.g., Authorization)"
    )
    prefix: Optional[str] = Field(
        default=None,
        description="Prefix for API key (e.g., Bearer, ApiKey)"
    )


class BillingConfig(BaseModel):
    """Billing configuration."""

    enabled: bool = Field(
        description="Whether billing/usage tracking is enabled"
    )
    track_usage: Optional[bool] = Field(
        default=False,
        description="Whether to track usage events"
    )
    base_cost_per_transcription: Optional[float] = Field(
        default=0.0,
        description="Base cost per transcription job in USD"
    )


class LimitsConfig(BaseModel):
    """Rate limiting and quota configuration."""

    requests_per_minute: Optional[int] = Field(
        default=None,
        description="Rate limit: requests per minute"
    )
    requests_per_hour: Optional[int] = Field(
        default=None,
        description="Rate limit: requests per hour"
    )
    requests_per_month: Optional[int] = Field(
        default=None,
        description="Quota: requests per month"
    )
    concurrent_jobs: Optional[int] = Field(
        default=None,
        description="Max concurrent transcription jobs"
    )


class DeploymentConfig(BaseModel):
    """Complete deployment mode configuration."""

    deployment_mode: str = Field(
        description="Deployment mode: 'internal' or 'external'"
    )
    auth: AuthConfig = Field(
        description="Authentication configuration"
    )
    billing: BillingConfig = Field(
        description="Billing configuration"
    )
    limits: LimitsConfig = Field(
        description="Rate limits and quotas"
    )


class EnvironmentConfig(BaseModel):
    """Environment variable configuration (secrets)."""

    # Supabase
    supabase_url: str = Field(
        description="Supabase project URL"
    )
    supabase_key: str = Field(
        description="Supabase API key"
    )

    # VAPI (optional)
    vapi_api_key: Optional[str] = Field(
        default=None,
        description="VAPI API key for transcription"
    )
    vapi_endpoint: Optional[str] = Field(
        default="https://api.vapi.ai",
        description="VAPI API endpoint"
    )

    # Retell (optional)
    retell_api_key: Optional[str] = Field(
        default=None,
        description="Retell API key for transcription"
    )
    retell_endpoint: Optional[str] = Field(
        default="https://api.retell.ai",
        description="Retell API endpoint"
    )

    # Default provider
    default_transcription_provider: str = Field(
        default="vapi",
        description="Default transcription provider (vapi or retell)"
    )

    # Logging
    log_level: str = Field(
        default="INFO",
        description="Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )
    json_logging: bool = Field(
        default=True,
        description="Whether to use JSON structured logging"
    )

    # Feature flags
    enable_callback_webhooks: bool = Field(
        default=True,
        description="Enable webhook callbacks for completed transcriptions"
    )
    enable_speaker_labels: bool = Field(
        default=True,
        description="Enable automatic speaker labeling"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class ConfigManager:
    """Manages configuration for the transcript-processor service.

    Loads deployment mode config from YAML and environment config from .env.
    """

    def __init__(self, mode: Optional[str] = None):
        """Initialize configuration manager.

        Args:
            mode: Deployment mode ('internal' or 'external').
                  If not provided, reads from DEPLOYMENT_MODE env var.
                  Defaults to 'external' if not specified.
        """
        # Determine deployment mode
        if mode is None:
            mode = os.getenv("DEPLOYMENT_MODE", "external")

        if mode not in ["internal", "external"]:
            raise ValueError(f"Invalid deployment mode: {mode}. Must be 'internal' or 'external'.")

        self.mode = mode

        # Load deployment configuration from YAML
        config_dir = Path(__file__).parent.parent.parent / "config"
        config_file = config_dir / f"{mode}.yaml"

        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_file}")

        with open(config_file) as f:
            config_dict = yaml.safe_load(f)

        self.deployment_config = DeploymentConfig(**config_dict)

        # Load environment configuration
        self._load_env_config()

    def _load_env_config(self) -> None:
        """Load environment configuration from .env file and environment variables."""
        # Load from .env file if it exists
        env_file = Path(__file__).parent.parent.parent / ".env"
        if env_file.exists():
            from dotenv import load_dotenv
            load_dotenv(env_file)

        # Build environment config from variables
        env_dict = {
            "supabase_url": os.getenv("SUPABASE_URL", ""),
            "supabase_key": os.getenv("SUPABASE_KEY", ""),
            "vapi_api_key": os.getenv("VAPI_API_KEY"),
            "vapi_endpoint": os.getenv("VAPI_ENDPOINT", "https://api.vapi.ai"),
            "retell_api_key": os.getenv("RETELL_API_KEY"),
            "retell_endpoint": os.getenv("RETELL_ENDPOINT", "https://api.retell.ai"),
            "default_transcription_provider": os.getenv("DEFAULT_TRANSCRIPTION_PROVIDER", "vapi"),
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "json_logging": os.getenv("JSON_LOGGING", "true").lower() == "true",
            "enable_callback_webhooks": os.getenv("ENABLE_CALLBACK_WEBHOOKS", "true").lower() == "true",
            "enable_speaker_labels": os.getenv("ENABLE_SPEAKER_LABELS", "true").lower() == "true",
        }

        # Validate required fields
        if not env_dict["supabase_url"]:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not env_dict["supabase_key"]:
            raise ValueError("SUPABASE_KEY environment variable is required")

        self.env_config = EnvironmentConfig(**env_dict)

    @property
    def auth_type(self) -> str:
        """Get authentication type for this deployment mode."""
        return self.deployment_config.auth.type

    @property
    def auth_header(self) -> Optional[str]:
        """Get the header name for authentication."""
        if self.auth_type == "header":
            return self.deployment_config.auth.required_header
        elif self.auth_type == "api_key":
            return self.deployment_config.auth.header
        return None

    @property
    def auth_prefix(self) -> Optional[str]:
        """Get the prefix for API key authentication."""
        return self.deployment_config.auth.prefix

    @property
    def is_billing_enabled(self) -> bool:
        """Check if billing/usage tracking is enabled."""
        return self.deployment_config.billing.enabled

    @property
    def base_cost_per_transcription(self) -> float:
        """Get base cost per transcription in USD."""
        return self.deployment_config.billing.base_cost_per_transcription or 0.0

    @property
    def rate_limit_per_minute(self) -> Optional[int]:
        """Get rate limit (requests per minute)."""
        return self.deployment_config.limits.requests_per_minute

    @property
    def rate_limit_per_hour(self) -> Optional[int]:
        """Get rate limit (requests per hour)."""
        return self.deployment_config.limits.requests_per_hour

    @property
    def monthly_quota(self) -> Optional[int]:
        """Get monthly request quota."""
        return self.deployment_config.limits.requests_per_month

    @property
    def max_concurrent_jobs(self) -> Optional[int]:
        """Get maximum concurrent transcription jobs."""
        return self.deployment_config.limits.concurrent_jobs

    @property
    def supabase_url(self) -> str:
        """Get Supabase project URL."""
        return self.env_config.supabase_url

    @property
    def supabase_key(self) -> str:
        """Get Supabase API key."""
        return self.env_config.supabase_key

    @property
    def vapi_api_key(self) -> Optional[str]:
        """Get VAPI API key if configured."""
        return self.env_config.vapi_api_key

    @property
    def vapi_endpoint(self) -> str:
        """Get VAPI endpoint URL."""
        return self.env_config.vapi_endpoint

    @property
    def retell_api_key(self) -> Optional[str]:
        """Get Retell API key if configured."""
        return self.env_config.retell_api_key

    @property
    def retell_endpoint(self) -> str:
        """Get Retell endpoint URL."""
        return self.env_config.retell_endpoint

    @property
    def default_provider(self) -> str:
        """Get default transcription provider."""
        return self.env_config.default_transcription_provider

    @property
    def log_level(self) -> str:
        """Get logging level."""
        return self.env_config.log_level

    @property
    def json_logging_enabled(self) -> bool:
        """Check if JSON structured logging is enabled."""
        return self.env_config.json_logging

    @property
    def webhooks_enabled(self) -> bool:
        """Check if webhook callbacks are enabled."""
        return self.env_config.enable_callback_webhooks

    @property
    def speaker_labels_enabled(self) -> bool:
        """Check if automatic speaker labeling is enabled."""
        return self.env_config.enable_speaker_labels

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the current configuration (safe for logging)."""
        return {
            "deployment_mode": self.mode,
            "auth_type": self.auth_type,
            "billing_enabled": self.is_billing_enabled,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "monthly_quota": self.monthly_quota,
            "max_concurrent_jobs": self.max_concurrent_jobs,
            "default_provider": self.default_provider,
            "log_level": self.log_level,
            "json_logging": self.json_logging_enabled,
            "webhooks_enabled": self.webhooks_enabled,
            "speaker_labels_enabled": self.speaker_labels_enabled,
        }

    def validate(self) -> bool:
        """Validate that the configuration is complete and correct.

        Raises:
            ValueError: If configuration is invalid

        Returns:
            True if validation passes
        """
        # Check that at least one provider is configured
        if not self.vapi_api_key and not self.retell_api_key:
            raise ValueError("At least one transcription provider (VAPI or Retell) must be configured")

        # Check that the default provider is configured
        if self.default_provider == "vapi" and not self.vapi_api_key:
            raise ValueError("Default provider is VAPI but VAPI_API_KEY is not configured")
        elif self.default_provider == "retell" and not self.retell_api_key:
            raise ValueError("Default provider is Retell but RETELL_API_KEY is not configured")

        # Check Supabase configuration
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key must be configured")

        return True
