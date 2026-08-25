"""
Project 1: Pydantic Fundamentals - Basic Models
==============================================

Learning objectives:
- Understand BaseModel and Field patterns
- Learn type hints and constraints
- Master validation and error handling
- Practice model composition and inheritance
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, field_validator


# Basic Enum for user roles
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"


# Simple BaseModel example
class User(BaseModel):
    """Basic user model demonstrating core Pydantic concepts"""
    
    id: int = Field(..., description="Unique user identifier", gt=0)
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, description="User's full name")
    age: Optional[int] = Field(None, ge=0, le=150, description="User age")
    role: UserRole = Field(default=UserRole.USER, description="User role")
    is_active: bool = Field(default=True, description="Account status")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    tags: List[str] = Field(default_factory=list, description="User tags")

    model_config = {
        # Enable extra fields validation
        "extra": "forbid",
        # Use enum values in JSON
        "use_enum_values": True,
        # Example schema for documentation
        "json_schema_extra": {
            "example": {
                "id": 1,
                "username": "johndoe",
                "email": "john@example.com",
                "full_name": "John Doe",
                "age": 30,
                "role": "user",
                "is_active": True,
                "tags": ["developer", "python"]
            }
        }
    }


# Model with custom validation
class Product(BaseModel):
    """Product model with custom validation rules"""
    
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    price: float = Field(..., gt=0, description="Price in USD")
    category: str = Field(..., min_length=1)
    stock_quantity: int = Field(..., ge=0, description="Available stock")
    is_available: bool = Field(default=True)
    tags: List[str] = Field(default_factory=list, max_items=10)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Ensure product name doesn't contain prohibited words"""
        prohibited = ['spam', 'fake', 'scam']
        if any(word in v.lower() for word in prohibited):
            raise ValueError('Product name contains prohibited words')
        return v.title()  # Capitalize properly
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        """Ensure price has reasonable precision"""
        if round(v, 2) != v:
            raise ValueError('Price cannot have more than 2 decimal places')
        return v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Ensure tags are properly formatted"""
        return [tag.lower().strip() for tag in v if tag.strip()]


# Model inheritance example
class BaseEntity(BaseModel):
    """Base model for all entities with common fields"""
    
    id: Optional[int] = Field(None, description="Entity ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(None)
    
    model_config = {"extra": "forbid"}


class Article(BaseEntity):
    """Article model inheriting from BaseEntity"""
    
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=10)
    author_id: int = Field(..., gt=0)
    is_published: bool = Field(default=False)
    view_count: int = Field(default=0, ge=0)
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Ensure title is properly capitalized"""
        return v.strip().title()


# Complex nested model
class Address(BaseModel):
    """Address model for nested usage"""
    
    street: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: str = Field(..., pattern=r'^\d{5}(-\d{4})?$')
    country: str = Field(default="US")


class Company(BaseModel):
    """Company model with nested address"""
    
    name: str = Field(..., min_length=1, max_length=100)
    address: Address
    employees: List[User] = Field(default_factory=list)
    founded_year: Optional[int] = Field(None, ge=1800, le=datetime.now().year)
    
    @field_validator('employees')
    @classmethod
    def validate_employees(cls, v):
        """Ensure no duplicate employee IDs"""
        if v:
            ids = [emp.id for emp in v]
            if len(ids) != len(set(ids)):
                raise ValueError('Duplicate employee IDs found')
        return v


# Demonstration functions
def basic_model_examples():
    """Demonstrate basic model creation and validation"""
    
    print("=== Basic Model Examples ===\n")
    
    # Valid user creation
    try:
        user = User(
            id=1,
            username="alice",
            email="alice@example.com",
            full_name="Alice Smith",
            age=28,
            role=UserRole.ADMIN,
            tags=["python", "ai"]
        )
        print(f"✅ Created user: {user.username}")
        print(f"   JSON: {user.model_dump_json()}\n")
    except Exception as e:
        print(f"❌ User creation failed: {e}\n")
    
    # Invalid user (demonstrates validation)
    try:
        invalid_user = User(
            id=-1,  # Invalid: must be > 0
            username="ab",  # Invalid: too short
            email="not-an-email",  # Invalid email
            age=200  # Invalid: too old
        )
    except Exception as e:
        print(f"❌ Expected validation error: {e}\n")
    
    # Product with custom validation
    try:
        product = Product(
            name="awesome widget",
            description="A really great widget",
            price=29.99,
            category="widgets",
            stock_quantity=100,
            tags=["  Widget  ", "AWESOME", "new"]
        )
        print(f"✅ Created product: {product.name}")
        print(f"   Tags cleaned: {product.tags}\n")
    except Exception as e:
        print(f"❌ Product creation failed: {e}\n")


def nested_model_examples():
    """Demonstrate nested model patterns"""
    
    print("=== Nested Model Examples ===\n")
    
    try:
        # Create nested models
        address = Address(
            street="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94105"
        )
        
        user1 = User(
            id=1,
            username="employee1",
            email="emp1@company.com"
        )
        
        user2 = User(
            id=2,
            username="employee2", 
            email="emp2@company.com"
        )
        
        company = Company(
            name="Tech Innovations Inc",
            address=address,
            employees=[user1, user2],
            founded_year=2020
        )
        
        print(f"✅ Created company: {company.name}")
        print(f"   Located in: {company.address.city}, {company.address.state}")
        print(f"   Employees: {len(company.employees)}")
        print(f"   Full JSON:\n{company.model_dump_json(indent=2)}\n")
        
    except Exception as e:
        print(f"❌ Company creation failed: {e}\n")


if __name__ == "__main__":
    basic_model_examples()
    nested_model_examples()