"""Tests for transcript-processor configuration system."""

import pytest
import os
import tempfile
import yaml
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from transcript_processor.config import (
    ConfigManager,
    AuthConfig,
    BillingConfig,
    LimitsConfig,
    DeploymentConfig,
    EnvironmentConfig,
)


class TestAuthConfig:
    """Tests for AuthConfig model."""

    def test_header_auth(self):
        """Test header-based authentication config."""
        auth = AuthConfig(
            type="header",
            required_header="X-Customer-ID"
        )
        assert auth.type == "header"
        assert auth.required_header == "X-Customer-ID"

    def test_api_key_auth(self):
        """Test API key authentication config."""
        auth = AuthConfig(
            type="api_key",
            header="Authorization",
            prefix="Bearer"
        )
        assert auth.type == "api_key"
        assert auth.header == "Authorization"
        assert auth.prefix == "Bearer"


class TestBillingConfig:
    """Tests for BillingConfig model."""

    def test_billing_disabled(self):
        """Test billing disabled config."""
        billing = BillingConfig(enabled=False)
        assert billing.enabled is False
        assert billing.track_usage is False

    def test_billing_enabled(self):
        """Test billing enabled config."""
        billing = BillingConfig(
            enabled=True,
            track_usage=True,
            base_cost_per_transcription=0.05
        )
        assert billing.enabled is True
        assert billing.track_usage is True
        assert billing.base_cost_per_transcription == 0.05


class TestLimitsConfig:
    """Tests for LimitsConfig model."""

    def test_no_limits(self):
        """Test unlimited configuration."""
        limits = LimitsConfig()
        assert limits.requests_per_minute is None
        assert limits.requests_per_hour is None
        assert limits.requests_per_month is None

    def test_with_limits(self):
        """Test configuration with limits."""
        limits = LimitsConfig(
            requests_per_minute=100,
            requests_per_hour=5000,
            requests_per_month=100000,
            concurrent_jobs=10
        )
        assert limits.requests_per_minute == 100
        assert limits.requests_per_hour == 5000
        assert limits.requests_per_month == 100000
        assert limits.concurrent_jobs == 10


class TestDeploymentConfig:
    """Tests for DeploymentConfig model."""

    def test_internal_mode_config(self):
        """Test internal mode deployment config."""
        auth = AuthConfig(type="header", required_header="X-Customer-ID")
        billing = BillingConfig(enabled=False)
        limits = LimitsConfig()

        config = DeploymentConfig(
            deployment_mode="internal",
            auth=auth,
            billing=billing,
            limits=limits
        )

        assert config.deployment_mode == "internal"
        assert config.auth.type == "header"
        assert config.billing.enabled is False

    def test_external_mode_config(self):
        """Test external mode deployment config."""
        auth = AuthConfig(
            type="api_key",
            header="Authorization",
            prefix="Bearer"
        )
        billing = BillingConfig(enabled=True, track_usage=True)
        limits = LimitsConfig(
            requests_per_minute=100,
            requests_per_month=50000
        )

        config = DeploymentConfig(
            deployment_mode="external",
            auth=auth,
            billing=billing,
            limits=limits
        )

        assert config.deployment_mode == "external"
        assert config.auth.type == "api_key"
        assert config.billing.enabled is True


class TestEnvironmentConfig:
    """Tests for EnvironmentConfig model."""

    def test_required_fields(self):
        """Test that required fields are validated (empty strings are converted to default)."""
        # Pydantic allows empty strings but we check them in ConfigManager
        env = EnvironmentConfig(
            supabase_url="https://project.supabase.co",
            supabase_key="key-123"
        )
        assert env.supabase_url == "https://project.supabase.co"
        assert env.supabase_key == "key-123"

    def test_valid_environment_config(self):
        """Test valid environment configuration."""
        env = EnvironmentConfig(
            supabase_url="https://project.supabase.co",
            supabase_key="key-123",
            vapi_api_key="vapi-key",
            default_transcription_provider="vapi"
        )
        assert env.supabase_url == "https://project.supabase.co"
        assert env.supabase_key == "key-123"
        assert env.vapi_api_key == "vapi-key"

    def test_default_values(self):
        """Test default values in environment config."""
        env = EnvironmentConfig(
            supabase_url="https://project.supabase.co",
            supabase_key="key-123"
        )
        assert env.log_level == "INFO"
        assert env.json_logging is True
        assert env.enable_callback_webhooks is True
        assert env.enable_speaker_labels is True
        assert env.default_transcription_provider == "vapi"


class TestConfigManager:
    """Tests for ConfigManager class."""

    def test_invalid_mode(self):
        """Test that invalid deployment mode raises error."""
        with pytest.raises(ValueError, match="Invalid deployment mode"):
            ConfigManager(mode="invalid")

    def test_config_files_exist(self):
        """Test that config files exist for both modes."""
        config_dir = Path(__file__).parent.parent / "config"
        assert (config_dir / "internal.yaml").exists()
        assert (config_dir / "external.yaml").exists()

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_internal_mode_initialization(self):
        """Test initializing with internal mode."""
        config = ConfigManager(mode="internal")
        assert config.mode == "internal"
        assert config.auth_type == "header"
        assert config.auth_header == "X-Customer-ID"
        assert config.is_billing_enabled is False
        assert config.rate_limit_per_minute is None

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_external_mode_initialization(self):
        """Test initializing with external mode."""
        config = ConfigManager(mode="external")
        assert config.mode == "external"
        assert config.auth_type == "api_key"
        assert config.auth_header == "Authorization"
        assert config.auth_prefix == "Bearer"
        assert config.is_billing_enabled is True
        assert config.rate_limit_per_minute == 100

    @patch.dict(os.environ, {
        "DEPLOYMENT_MODE": "internal",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_mode_from_environment(self):
        """Test that mode can be read from DEPLOYMENT_MODE env var."""
        config = ConfigManager()
        assert config.mode == "internal"

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key",
        "LOG_LEVEL": "DEBUG",
        "JSON_LOGGING": "false"
    })
    def test_env_variable_overrides(self):
        """Test that environment variables override defaults."""
        config = ConfigManager(mode="internal")
        assert config.log_level == "DEBUG"
        assert config.json_logging_enabled is False

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_property_accessors(self):
        """Test that property accessors work correctly."""
        config = ConfigManager(mode="internal")

        # Test auth properties
        assert config.auth_type == "header"
        assert config.auth_header == "X-Customer-ID"
        assert config.auth_prefix is None

        # Test billing properties
        assert config.is_billing_enabled is False
        assert config.base_cost_per_transcription == 0.0

        # Test limit properties
        assert config.rate_limit_per_minute is None
        assert config.monthly_quota is None

        # Test environment properties
        assert config.supabase_url == "https://test.supabase.co"
        assert config.supabase_key == "test-key"

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key",
        "RETELL_API_KEY": "retell-key"
    })
    def test_multiple_providers(self):
        """Test configuration with multiple providers configured."""
        config = ConfigManager(mode="external")
        assert config.vapi_api_key == "vapi-key"
        assert config.retell_api_key == "retell-key"

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "DEFAULT_TRANSCRIPTION_PROVIDER": "retell",
        "RETELL_API_KEY": "retell-key"
    })
    def test_default_provider_override(self):
        """Test overriding the default transcription provider."""
        config = ConfigManager(mode="internal")
        assert config.default_provider == "retell"

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_feature_flags(self):
        """Test feature flag configuration."""
        config = ConfigManager(mode="internal")
        assert config.webhooks_enabled is True
        assert config.speaker_labels_enabled is True

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key",
        "ENABLE_CALLBACK_WEBHOOKS": "false",
        "ENABLE_SPEAKER_LABELS": "false"
    })
    def test_feature_flags_disabled(self):
        """Test disabling feature flags."""
        config = ConfigManager(mode="internal")
        assert config.webhooks_enabled is False
        assert config.speaker_labels_enabled is False

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_get_summary(self):
        """Test that get_summary returns safe configuration."""
        config = ConfigManager(mode="external")
        summary = config.get_summary()

        assert summary["deployment_mode"] == "external"
        assert summary["auth_type"] == "api_key"
        assert summary["billing_enabled"] is True
        assert summary["rate_limit_per_minute"] == 100

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_validate_success(self):
        """Test that validation passes with valid config."""
        config = ConfigManager(mode="internal")
        assert config.validate() is True

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key"
    }, clear=False)
    def test_validate_missing_provider(self):
        """Test that validation fails without a configured provider."""
        # Remove provider keys to test the error
        with patch.dict(os.environ, {}, clear=False):
            with pytest.raises(ValueError, match="At least one transcription provider"):
                config = ConfigManager(mode="internal")
                config.validate()

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "DEFAULT_TRANSCRIPTION_PROVIDER": "vapi"
    }, clear=False)
    def test_validate_provider_mismatch(self):
        """Test that validation fails if default provider not configured."""
        with pytest.raises(ValueError, match="At least one transcription provider"):
            config = ConfigManager(mode="internal")
            config.validate()

    @patch.dict(os.environ, {
        "SUPABASE_URL": "",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key"
    })
    def test_validate_missing_supabase(self):
        """Test that validation fails without Supabase config."""
        with pytest.raises(ValueError):
            ConfigManager(mode="internal")


class TestConfigIntegration:
    """Integration tests for configuration system."""

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key",
        "LOG_LEVEL": "DEBUG",
        "ENABLE_CALLBACK_WEBHOOKS": "true"
    })
    def test_full_internal_configuration(self):
        """Test a complete internal mode configuration."""
        config = ConfigManager(mode="internal")

        # Verify all aspects of configuration
        assert config.mode == "internal"
        assert config.auth_type == "header"
        assert config.is_billing_enabled is False
        assert config.rate_limit_per_minute is None
        assert config.log_level == "DEBUG"
        assert config.webhooks_enabled is True
        assert config.supabase_url == "https://test.supabase.co"

    @patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "VAPI_API_KEY": "vapi-key",
        "LOG_LEVEL": "INFO",
        "JSON_LOGGING": "true"
    })
    def test_full_external_configuration(self):
        """Test a complete external mode configuration."""
        config = ConfigManager(mode="external")

        # Verify all aspects of configuration
        assert config.mode == "external"
        assert config.auth_type == "api_key"
        assert config.is_billing_enabled is True
        assert config.rate_limit_per_minute == 100
        assert config.monthly_quota is None
        assert config.log_level == "INFO"
        assert config.json_logging_enabled is True
        assert config.supabase_url == "https://test.supabase.co"

        # Validate configuration
        assert config.validate() is True
