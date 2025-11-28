"""Pytest configuration and fixtures for transcript-processor tests."""

import pytest
from pathlib import Path
import yaml


@pytest.fixture
def project_root():
    """Return the project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture
def config_dir(project_root):
    """Return the config directory."""
    return project_root / "config"


@pytest.fixture
def internal_config(config_dir):
    """Load internal.yaml configuration."""
    config_path = config_dir / "internal.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


@pytest.fixture
def external_config(config_dir):
    """Load external.yaml configuration."""
    config_path = config_dir / "external.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


@pytest.fixture
def env_example(project_root):
    """Load .env.example file as text."""
    env_path = project_root / ".env.example"
    with open(env_path) as f:
        return f.read()
