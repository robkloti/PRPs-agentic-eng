"""Tests for lead models."""

import pytest
from pydantic import ValidationError
from gyst_models.leads import LeadInput, LeadQualificationResult


class TestLeadInput:
    """Tests for LeadInput model."""

    def test_lead_input_valid(self):
        """Test creating a valid LeadInput."""
        lead = LeadInput(
            lead_id="lead-123",
            phone="2025551234",
            email="john@example.com",
            source="web"
        )
        assert lead.lead_id == "lead-123"
        assert lead.phone == "2025551234"
        assert lead.email == "john@example.com"
        assert lead.source == "web"
        assert lead.first_name is None
        assert lead.last_name is None

    def test_lead_input_with_all_fields(self):
        """Test LeadInput with all fields."""
        lead = LeadInput(
            lead_id="lead-456",
            phone="2025551234",
            email="jane@example.com",
            first_name="Jane",
            last_name="Doe",
            source="phone"
        )
        assert lead.first_name == "Jane"
        assert lead.last_name == "Doe"
        assert lead.source == "phone"

    def test_lead_input_phone_formatting_hyphenated(self):
        """Test phone number formatting with hyphens."""
        lead = LeadInput(
            lead_id="test",
            phone="+1-202-555-1234",
            email="test@example.com",
            source="web"
        )
        assert lead.phone == "12025551234"

    def test_lead_input_phone_formatting_parentheses(self):
        """Test phone number formatting with parentheses."""
        lead = LeadInput(
            lead_id="test",
            phone="(202) 555-1234",
            email="test@example.com",
            source="web"
        )
        assert lead.phone == "2025551234"

    def test_lead_input_phone_formatting_dots(self):
        """Test phone number formatting with dots."""
        lead = LeadInput(
            lead_id="test",
            phone="202.555.1234",
            email="test@example.com",
            source="web"
        )
        assert lead.phone == "2025551234"

    def test_lead_input_phone_formatting_plain(self):
        """Test phone number with no formatting."""
        lead = LeadInput(
            lead_id="test",
            phone="2025551234",
            email="test@example.com",
            source="web"
        )
        assert lead.phone == "2025551234"

    def test_lead_input_phone_validation_too_short(self):
        """Test phone validation rejects too few digits."""
        with pytest.raises(ValidationError):
            LeadInput(
                lead_id="test",
                phone="123",  # Too short
                email="test@example.com",
                source="web"
            )

    def test_lead_input_phone_validation_too_long(self):
        """Test phone validation rejects too many digits."""
        with pytest.raises(ValidationError):
            LeadInput(
                lead_id="test",
                phone="123456789012345678901",  # Too long
                email="test@example.com",
                source="web"
            )

    def test_lead_input_invalid_email(self):
        """Test email validation."""
        with pytest.raises(ValidationError):
            LeadInput(
                lead_id="test",
                phone="2025551234",
                email="not-an-email",
                source="web"
            )

    def test_lead_input_missing_required_fields(self):
        """Test that required fields are enforced."""
        with pytest.raises(ValidationError):
            LeadInput(lead_id="test")

    def test_lead_input_serialization(self):
        """Test serialization to dict and JSON."""
        lead = LeadInput(
            lead_id="lead-789",
            phone="2025551234",
            email="test@example.com",
            source="referral"
        )
        data = lead.model_dump()
        assert isinstance(data, dict)
        assert data["lead_id"] == "lead-789"
        assert data["phone"] == "2025551234"

        json_str = lead.model_dump_json()
        assert isinstance(json_str, str)
        assert "lead-789" in json_str


class TestLeadQualificationResult:
    """Tests for LeadQualificationResult model."""

    def test_qualification_result_valid(self):
        """Test creating a valid LeadQualificationResult."""
        result = LeadQualificationResult(
            lead_id="lead-123",
            qualification_score=85.5,
            tier="hot",
            recommended_action="Call immediately"
        )
        assert result.lead_id == "lead-123"
        assert result.qualification_score == 85.5
        assert result.tier == "hot"
        assert result.recommended_action == "Call immediately"
        assert result.reasons == []
        assert result.qualified_at is not None

    def test_qualification_result_with_reasons(self):
        """Test result with reasons list."""
        result = LeadQualificationResult(
            lead_id="lead-456",
            qualification_score=75.0,
            tier="warm",
            reasons=["High budget", "Decision maker"],
            recommended_action="Follow up next week"
        )
        assert len(result.reasons) == 2
        assert "High budget" in result.reasons

    def test_qualification_score_boundary_0(self):
        """Test score validation at boundary (0)."""
        result = LeadQualificationResult(
            lead_id="test",
            qualification_score=0.0,
            tier="unqualified",
            recommended_action="No action"
        )
        assert result.qualification_score == 0.0

    def test_qualification_score_boundary_100(self):
        """Test score validation at boundary (100)."""
        result = LeadQualificationResult(
            lead_id="test",
            qualification_score=100.0,
            tier="hot",
            recommended_action="Call immediately"
        )
        assert result.qualification_score == 100.0

    def test_qualification_score_too_high(self):
        """Test score validation rejects > 100."""
        with pytest.raises(ValidationError):
            LeadQualificationResult(
                lead_id="test",
                qualification_score=100.1,
                tier="hot",
                recommended_action="Call"
            )

    def test_qualification_score_negative(self):
        """Test score validation rejects < 0."""
        with pytest.raises(ValidationError):
            LeadQualificationResult(
                lead_id="test",
                qualification_score=-0.1,
                tier="hot",
                recommended_action="Call"
            )

    def test_qualification_tier_valid_values(self):
        """Test all valid tier values."""
        for tier in ["hot", "warm", "cold", "unqualified"]:
            result = LeadQualificationResult(
                lead_id="test",
                qualification_score=50.0,
                tier=tier,
                recommended_action="Test"
            )
            assert result.tier == tier

    def test_qualification_tier_invalid(self):
        """Test invalid tier value."""
        with pytest.raises(ValidationError):
            LeadQualificationResult(
                lead_id="test",
                qualification_score=50.0,
                tier="invalid_tier",
                recommended_action="Test"
            )

    def test_qualification_timestamp_present(self):
        """Test that qualified_at is set."""
        result = LeadQualificationResult(
            lead_id="test",
            qualification_score=50.0,
            tier="warm",
            recommended_action="Follow up"
        )
        assert result.qualified_at is not None
        assert result.qualified_at.tzinfo is not None

    def test_qualification_serialization(self):
        """Test serialization."""
        result = LeadQualificationResult(
            lead_id="lead-999",
            qualification_score=88.0,
            tier="hot",
            reasons=["Reason 1", "Reason 2"],
            recommended_action="Call today"
        )
        data = result.model_dump()
        assert data["lead_id"] == "lead-999"
        assert data["qualification_score"] == 88.0
        assert data["tier"] == "hot"

        json_str = result.model_dump_json()
        assert "lead-999" in json_str
        assert "hot" in json_str
