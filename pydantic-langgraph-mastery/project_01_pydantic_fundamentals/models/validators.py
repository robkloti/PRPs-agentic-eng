"""
Project 1: Pydantic Fundamentals - Custom Validators
==================================================

Learning objectives:
- Master @field_validator and @model_validator decorators
- Understand validation context and info parameter
- Learn validation modes (before, after, wrap)
- Practice complex validation logic and error handling
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal
import re
from pydantic import (
    BaseModel, 
    Field, 
    field_validator, 
    model_validator,
    ValidationInfo,
    computed_field
)


class CreditCard(BaseModel):
    """Credit card model with comprehensive validation"""
    
    number: str = Field(..., description="Credit card number")
    expiry_month: int = Field(..., ge=1, le=12, description="Expiry month (1-12)")
    expiry_year: int = Field(..., ge=2024, description="Expiry year")
    cvv: str = Field(..., description="CVV code")
    holder_name: str = Field(..., description="Cardholder name")
    
    @field_validator('number')
    @classmethod
    def validate_card_number(cls, v: str) -> str:
        """Validate credit card number using Luhn algorithm"""
        # Remove spaces and hyphens
        cleaned = re.sub(r'[\s\-]', '', v)
        
        # Check if all digits
        if not cleaned.isdigit():
            raise ValueError('Credit card number must contain only digits')
        
        # Check length (most cards are 13-19 digits)
        if len(cleaned) < 13 or len(cleaned) > 19:
            raise ValueError('Credit card number must be 13-19 digits')
        
        # Luhn algorithm validation
        def luhn_check(card_num: str) -> bool:
            digits = [int(d) for d in card_num]
            checksum = 0
            is_even = False
            
            for digit in reversed(digits):
                if is_even:
                    digit *= 2
                    if digit > 9:
                        digit -= 9
                checksum += digit
                is_even = not is_even
            
            return checksum % 10 == 0
        
        if not luhn_check(cleaned):
            raise ValueError('Invalid credit card number (Luhn check failed)')
        
        return cleaned
    
    @field_validator('cvv')
    @classmethod
    def validate_cvv(cls, v: str, info: ValidationInfo) -> str:
        """Validate CVV based on card type"""
        if not v.isdigit():
            raise ValueError('CVV must contain only digits')
        
        # Most cards use 3-digit CVV, American Express uses 4
        if len(v) not in [3, 4]:
            raise ValueError('CVV must be 3 or 4 digits')
        
        return v
    
    @field_validator('holder_name')
    @classmethod
    def validate_holder_name(cls, v: str) -> str:
        """Validate cardholder name"""
        v = v.strip()
        
        if len(v) < 2:
            raise ValueError('Cardholder name too short')
        
        if len(v) > 50:
            raise ValueError('Cardholder name too long')
        
        # Only letters, spaces, hyphens, apostrophes
        if not re.match(r"^[A-Za-z\s\-']+$", v):
            raise ValueError('Invalid characters in cardholder name')
        
        return v.upper()
    
    @model_validator(mode='after')
    def validate_expiry_date(self) -> 'CreditCard':
        """Validate that card is not expired"""
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        
        if (self.expiry_year < current_year or 
            (self.expiry_year == current_year and self.expiry_month < current_month)):
            raise ValueError('Credit card has expired')
        
        return self
    
    @computed_field
    @property
    def masked_number(self) -> str:
        """Return masked card number for display"""
        if len(self.number) >= 4:
            return f"****-****-****-{self.number[-4:]}"
        return "****-****-****-****"
    
    @computed_field
    @property
    def card_type(self) -> str:
        """Determine card type based on number"""
        first_digit = self.number[0]
        first_two = self.number[:2]
        first_four = self.number[:4]
        
        if first_digit == '4':
            return 'Visa'
        elif first_two in ['51', '52', '53', '54', '55'] or 2221 <= int(first_four) <= 2720:
            return 'Mastercard'
        elif first_two in ['34', '37']:
            return 'American Express'
        elif first_four == '6011' or first_two == '65':
            return 'Discover'
        else:
            return 'Unknown'


class Password(BaseModel):
    """Password model with strength validation"""
    
    value: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('value')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength"""
        errors = []
        
        if len(v) < 8:
            errors.append("at least 8 characters")
        
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            errors.append("at least one special character")
        
        if errors:
            raise ValueError(f"Password must have {', '.join(errors)}")
        
        # Check for common weak patterns
        common_patterns = [
            r'(.)\1{3,}',  # 4+ repeated characters
            r'(012|123|234|345|456|567|678|789|890)',  # sequential digits
            r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # sequential letters
        ]
        
        for pattern in common_patterns:
            if re.search(pattern, v.lower()):
                raise ValueError("Password contains common weak patterns")
        
        return v
    
    @computed_field
    @property
    def strength_score(self) -> int:
        """Calculate password strength score (0-100)"""
        score = 0
        
        # Length bonus
        score += min(25, len(self.value) * 2)
        
        # Character variety bonus
        if re.search(r'[a-z]', self.value):
            score += 15
        if re.search(r'[A-Z]', self.value):
            score += 15
        if re.search(r'\d', self.value):
            score += 15
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', self.value):
            score += 20
        
        # Uniqueness bonus
        unique_chars = len(set(self.value))
        score += min(10, unique_chars)
        
        return min(100, score)


class BankAccount(BaseModel):
    """Bank account with complex validation rules"""
    
    account_number: str = Field(..., description="Account number")
    routing_number: str = Field(..., description="9-digit routing number")
    account_type: str = Field(..., description="checking or savings")
    balance: Decimal = Field(..., description="Account balance")
    owner_ssn: str = Field(..., description="Owner's SSN (XXX-XX-XXXX)")
    
    @field_validator('account_number')
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        """Validate account number format"""
        cleaned = re.sub(r'[\s\-]', '', v)
        
        if not cleaned.isdigit():
            raise ValueError('Account number must contain only digits')
        
        if len(cleaned) < 8 or len(cleaned) > 17:
            raise ValueError('Account number must be 8-17 digits')
        
        return cleaned
    
    @field_validator('routing_number')
    @classmethod
    def validate_routing_number(cls, v: str) -> str:
        """Validate routing number with checksum"""
        cleaned = re.sub(r'[\s\-]', '', v)
        
        if not cleaned.isdigit() or len(cleaned) != 9:
            raise ValueError('Routing number must be exactly 9 digits')
        
        # ABA routing number checksum validation
        digits = [int(d) for d in cleaned]
        checksum = (
            3 * (digits[0] + digits[3] + digits[6]) +
            7 * (digits[1] + digits[4] + digits[7]) +
            1 * (digits[2] + digits[5] + digits[8])
        )
        
        if checksum % 10 != 0:
            raise ValueError('Invalid routing number (checksum failed)')
        
        return cleaned
    
    @field_validator('account_type')
    @classmethod
    def validate_account_type(cls, v: str) -> str:
        """Validate account type"""
        v = v.lower().strip()
        if v not in ['checking', 'savings']:
            raise ValueError('Account type must be either "checking" or "savings"')
        return v
    
    @field_validator('balance')
    @classmethod
    def validate_balance(cls, v: Union[Decimal, float, int]) -> Decimal:
        """Ensure balance precision and reasonable limits"""
        balance = Decimal(str(v))
        
        # Check for reasonable precision (2 decimal places max)
        if balance.as_tuple().exponent < -2:
            raise ValueError('Balance cannot have more than 2 decimal places')
        
        # Reasonable limits
        if balance < Decimal('-1000000'):
            raise ValueError('Balance cannot be less than -$1,000,000')
        
        if balance > Decimal('100000000'):
            raise ValueError('Balance cannot exceed $100,000,000')
        
        return balance
    
    @field_validator('owner_ssn')
    @classmethod
    def validate_ssn(cls, v: str) -> str:
        """Validate SSN format and basic rules"""
        # Remove any existing formatting
        cleaned = re.sub(r'[\s\-]', '', v)
        
        if not cleaned.isdigit() or len(cleaned) != 9:
            raise ValueError('SSN must be exactly 9 digits')
        
        # Apply SSN format
        formatted = f"{cleaned[:3]}-{cleaned[3:5]}-{cleaned[5:]}"
        
        # Basic SSN validation rules
        area = cleaned[:3]
        group = cleaned[3:5]
        serial = cleaned[5:]
        
        # Invalid area numbers
        if area in ['000', '666'] or area.startswith('9'):
            raise ValueError('Invalid SSN area number')
        
        # Invalid group/serial
        if group == '00' or serial == '0000':
            raise ValueError('Invalid SSN format')
        
        return formatted
    
    @model_validator(mode='after')
    def validate_account_consistency(self) -> 'BankAccount':
        """Validate business rules across fields"""
        # Savings accounts typically have higher minimum balance
        if self.account_type == 'savings' and self.balance < Decimal('100'):
            raise ValueError('Savings accounts require minimum balance of $100')
        
        # Checking accounts can have negative balance (overdraft) but with limits
        if self.account_type == 'checking' and self.balance < Decimal('-500'):
            raise ValueError('Checking account overdraft limit is $500')
        
        return self


def validator_examples():
    """Demonstrate custom validators in action"""
    
    print("=== Custom Validator Examples ===\n")
    
    # Credit Card Validation
    print("--- Credit Card Validation ---")
    try:
        card = CreditCard(
            number="4532-1234-5678-9012",  # Valid Visa test number
            expiry_month=12,
            expiry_year=2025,
            cvv="123",
            holder_name="John Doe"
        )
        print(f"✅ Valid card: {card.masked_number} ({card.card_type})")
    except Exception as e:
        print(f"❌ Card validation failed: {e}")
    
    # Invalid card
    try:
        invalid_card = CreditCard(
            number="1234-5678-9012-3456",  # Invalid number
            expiry_month=1,
            expiry_year=2020,  # Expired
            cvv="12",  # Too short
            holder_name="A"  # Too short
        )
    except Exception as e:
        print(f"❌ Expected validation error: {e}\n")
    
    # Password Validation
    print("--- Password Validation ---")
    try:
        strong_password = Password(value="MyStr0ng!P@ssw0rd")
        print(f"✅ Strong password (score: {strong_password.strength_score}/100)")
    except Exception as e:
        print(f"❌ Password validation failed: {e}")
    
    try:
        weak_password = Password(value="password")
    except Exception as e:
        print(f"❌ Expected weak password error: {e}\n")
    
    # Bank Account Validation
    print("--- Bank Account Validation ---")
    try:
        account = BankAccount(
            account_number="123456789012",
            routing_number="021000021",  # Valid Chase routing number
            account_type="checking",
            balance=Decimal("1500.75"),
            owner_ssn="123-45-6789"
        )
        print(f"✅ Valid account: {account.account_type} with balance ${account.balance}")
    except Exception as e:
        print(f"❌ Account validation failed: {e}")


if __name__ == "__main__":
    validator_examples()