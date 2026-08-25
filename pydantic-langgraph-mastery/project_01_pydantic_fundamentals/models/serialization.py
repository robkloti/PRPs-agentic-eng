"""
Project 1: Pydantic Fundamentals - Serialization & Deserialization
=================================================================

Learning objectives:
- Master JSON serialization/deserialization patterns
- Understand field aliases and custom serialization
- Learn model configuration options
- Practice data transformation and validation
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from decimal import Decimal
from uuid import UUID, uuid4
import json
from pydantic import BaseModel, Field, validator, root_validator, AliasChoices


class SerializationMode(str, Enum):
    """Different serialization modes for APIs"""
    FULL = "full"
    MINIMAL = "minimal" 
    PUBLIC = "public"
    INTERNAL = "internal"


class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = Field(default=True)
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v),
            UUID: lambda v: str(v)
        }


class UserProfile(BaseModel):
    """User profile with various serialization options"""
    
    # Internal fields
    id: UUID = Field(default_factory=uuid4)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    password_hash: str = Field(..., alias="password")
    
    # Profile fields
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")  
    display_name: Optional[str] = Field(None, alias="displayName")
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, alias="avatarUrl")
    
    # Metadata
    is_verified: bool = Field(default=False, alias="isVerified")
    is_active: bool = Field(default=True, alias="isActive")
    registration_date: datetime = Field(default_factory=datetime.utcnow, alias="registrationDate")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    login_count: int = Field(default=0, alias="loginCount")
    
    # Preferences
    email_notifications: bool = Field(default=True, alias="emailNotifications")
    privacy_setting: str = Field(default="public", alias="privacySetting")
    timezone: str = Field(default="UTC")
    language: str = Field(default="en")
    
    class Config:
        # Allow field names and aliases
        allow_population_by_field_name = True
        # Custom JSON encoders
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            UUID: lambda v: str(v)
        }
        # Schema customization
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com", 
                "firstName": "John",
                "lastName": "Doe",
                "displayName": "John D.",
                "bio": "Software developer passionate about Python",
                "isVerified": True,
                "privacySetting": "public"
            }
        }
    
    @validator('display_name', always=True)
    def set_display_name(cls, v, values):
        """Auto-generate display name if not provided"""
        if not v and 'first_name' in values and 'last_name' in values:
            first = values['first_name']
            last = values['last_name']
            return f"{first} {last[0]}."
        return v
    
    @validator('privacy_setting')
    def validate_privacy(cls, v):
        allowed = ['public', 'private', 'friends']
        if v not in allowed:
            raise ValueError(f'Privacy setting must be one of: {allowed}')
        return v
    
    def to_dict(self, mode: SerializationMode = SerializationMode.FULL) -> Dict[str, Any]:
        """Custom serialization based on mode"""
        
        if mode == SerializationMode.MINIMAL:
            return self.dict(
                include={
                    'id', 'username', 'display_name', 'avatar_url', 'is_verified'
                },
                by_alias=True
            )
        
        elif mode == SerializationMode.PUBLIC:
            return self.dict(
                exclude={
                    'password_hash', 'email', 'login_count', 'last_login', 
                    'email_notifications', 'registration_date'
                },
                by_alias=True
            )
        
        elif mode == SerializationMode.INTERNAL:
            return self.dict(by_alias=False)  # Use field names, not aliases
            
        else:  # FULL
            return self.dict(
                exclude={'password_hash'}, 
                by_alias=True
            )


class ProductData(BaseModel):
    """Product with complex serialization requirements"""
    
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD")
    
    # Inventory
    stock_quantity: int = Field(default=0, ge=0, alias="stock")
    low_stock_threshold: int = Field(default=10, ge=0, alias="lowStockThreshold")
    
    # Categorization
    category_path: List[str] = Field(default_factory=list, alias="categoryPath")
    tags: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    is_active: bool = Field(default=True, alias="isActive")
    is_featured: bool = Field(default=False, alias="isFeatured")
    
    # Computed properties
    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.low_stock_threshold
    
    @property
    def is_out_of_stock(self) -> bool:
        return self.stock_quantity == 0
    
    @property
    def category_name(self) -> str:
        return self.category_path[-1] if self.category_path else "Uncategorized"
    
    @property
    def price_display(self) -> str:
        return f"{self.currency} {self.price:.2f}"
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
    
    def to_catalog_format(self) -> Dict[str, Any]:
        """Serialize for product catalog display"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "currency": self.currency,
            "category": self.category_name,
            "inStock": not self.is_out_of_stock,
            "lowStock": self.is_low_stock,
            "featured": self.is_featured
        }
    
    def to_admin_format(self) -> Dict[str, Any]:
        """Serialize for admin interface"""
        return self.dict(by_alias=True, exclude_none=True)
    
    def to_api_format(self, include_inventory: bool = False) -> Dict[str, Any]:
        """Serialize for API responses"""
        base_data = {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "currency": self.currency,
            "categoryPath": self.category_path,
            "tags": self.tags,
            "isActive": self.is_active,
            "isFeatured": self.is_featured,
            "createdAt": self.created_at.isoformat()
        }
        
        if include_inventory:
            base_data.update({
                "stock": self.stock_quantity,
                "lowStockThreshold": self.low_stock_threshold,
                "isLowStock": self.is_low_stock,
                "isOutOfStock": self.is_out_of_stock
            })
        
        return base_data


class OrderSummary(BaseModel):
    """Order summary with flexible serialization"""
    
    id: UUID = Field(default_factory=uuid4)
    order_number: str = Field(..., alias="orderNumber")
    customer_id: UUID = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    
    # Financial details
    subtotal: Decimal = Field(..., decimal_places=2)
    tax_amount: Decimal = Field(..., decimal_places=2, alias="taxAmount")
    shipping_cost: Decimal = Field(default=Decimal('0.00'), decimal_places=2, alias="shippingCost")
    discount_amount: Decimal = Field(default=Decimal('0.00'), decimal_places=2, alias="discountAmount")
    total_amount: Decimal = Field(..., decimal_places=2, alias="totalAmount")
    currency: str = Field(default="USD")
    
    # Status and dates
    status: str = Field(..., regex=r'^(pending|confirmed|shipped|delivered|cancelled)$')
    order_date: datetime = Field(default_factory=datetime.utcnow, alias="orderDate")
    shipped_date: Optional[datetime] = Field(None, alias="shippedDate")
    delivered_date: Optional[datetime] = Field(None, alias="deliveredDate")
    
    # Items summary
    item_count: int = Field(..., gt=0, alias="itemCount")
    total_quantity: int = Field(..., gt=0, alias="totalQuantity")
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
    
    @root_validator
    def validate_financial_consistency(cls, values):
        """Ensure financial calculations are consistent"""
        subtotal = values.get('subtotal', Decimal('0'))
        tax = values.get('tax_amount', Decimal('0'))
        shipping = values.get('shipping_cost', Decimal('0'))
        discount = values.get('discount_amount', Decimal('0'))
        total = values.get('total_amount', Decimal('0'))
        
        expected_total = subtotal + tax + shipping - discount
        
        if abs(total - expected_total) > Decimal('0.01'):
            raise ValueError(
                f'Total amount ({total}) does not match calculated total ({expected_total})'
            )
        
        return values
    
    def to_receipt_format(self) -> Dict[str, Any]:
        """Format for customer receipt"""
        return {
            "orderNumber": self.order_number,
            "orderDate": self.order_date.strftime("%Y-%m-%d %H:%M:%S"),
            "customerName": self.customer_name,
            "itemCount": self.item_count,
            "totalQuantity": self.total_quantity,
            "subtotal": f"{self.currency} {self.subtotal:.2f}",
            "tax": f"{self.currency} {self.tax_amount:.2f}",
            "shipping": f"{self.currency} {self.shipping_cost:.2f}",
            "discount": f"-{self.currency} {self.discount_amount:.2f}" if self.discount_amount > 0 else None,
            "total": f"{self.currency} {self.total_amount:.2f}",
            "status": self.status.title()
        }
    
    def to_analytics_format(self) -> Dict[str, Any]:
        """Format for analytics/reporting"""
        return {
            "orderId": str(self.id),
            "customerId": str(self.customer_id),
            "orderDate": self.order_date.date().isoformat(),
            "revenue": float(self.total_amount),
            "itemCount": self.item_count,
            "totalQuantity": self.total_quantity,
            "status": self.status,
            "shippingRevenue": float(self.shipping_cost),
            "taxCollected": float(self.tax_amount),
            "discountGiven": float(self.discount_amount)
        }


def serialization_examples():
    """Demonstrate various serialization patterns"""
    print("=== Serialization Examples ===\n")
    
    # User Profile Serialization
    print("--- User Profile Serialization ---")
    user_data = {
        "username": "alice_dev",
        "email": "alice@techcorp.com",
        "password": "hashed_password_here",
        "firstName": "Alice",
        "lastName": "Johnson",
        "bio": "Senior Python developer with 8 years experience",
        "isVerified": True,
        "privacySetting": "public",
        "emailNotifications": True,
        "timezone": "America/New_York"
    }
    
    user = UserProfile(**user_data)
    
    print("Full serialization:")
    print(json.dumps(user.to_dict(SerializationMode.FULL), indent=2, default=str)[:300] + "...")
    
    print("\nMinimal serialization:")
    print(json.dumps(user.to_dict(SerializationMode.MINIMAL), indent=2, default=str))
    
    print("\nPublic serialization:")
    print(json.dumps(user.to_dict(SerializationMode.PUBLIC), indent=2, default=str)[:300] + "...")
    
    # Product Serialization
    print("\n--- Product Serialization ---")
    product = ProductData(
        name="Wireless Headphones Pro",
        description="Premium wireless headphones with noise cancellation",
        price=Decimal("299.99"),
        stock=45,
        lowStockThreshold=20,
        categoryPath=["Electronics", "Audio", "Headphones"],
        tags=["wireless", "noise-canceling", "premium"],
        isFeatured=True
    )
    
    print("Catalog format:")
    print(json.dumps(product.to_catalog_format(), indent=2))
    
    print("\nAPI format (with inventory):")
    print(json.dumps(product.to_api_format(include_inventory=True), indent=2)[:400] + "...")
    
    # Order Summary Serialization
    print("\n--- Order Summary Serialization ---")
    order = OrderSummary(
        orderNumber="ORD-2024-001",
        customerId=uuid4(),
        customerName="Alice Johnson",
        subtotal=Decimal("299.99"),
        taxAmount=Decimal("25.50"),
        shippingCost=Decimal("9.99"),
        discountAmount=Decimal("30.00"),
        totalAmount=Decimal("305.48"),
        status="shipped",
        itemCount=2,
        totalQuantity=3,
        shippedDate=datetime.now()
    )
    
    print("Receipt format:")
    receipt = order.to_receipt_format()
    for key, value in receipt.items():
        if value is not None:
            print(f"  {key}: {value}")
    
    print("\nAnalytics format:")
    print(json.dumps(order.to_analytics_format(), indent=2))


def deserialization_examples():
    """Demonstrate deserialization patterns"""
    print("\n=== Deserialization Examples ===\n")
    
    # JSON data from external API
    api_data = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "user_name": "bob_smith",
        "email_address": "bob@example.com",
        "first": "Bob",
        "last": "Smith",
        "verified": True,
        "created": "2024-01-15T10:30:00Z"
    }
    
    # Create model that can handle different field names
    class FlexibleUser(BaseModel):
        id: UUID = Field(alias=AliasChoices('user_id', 'id', 'userId'))
        username: str = Field(alias=AliasChoices('user_name', 'username', 'userName'))
        email: str = Field(alias=AliasChoices('email_address', 'email'))
        first_name: str = Field(alias=AliasChoices('first', 'first_name', 'firstName'))
        last_name: str = Field(alias=AliasChoices('last', 'last_name', 'lastName'))
        is_verified: bool = Field(alias=AliasChoices('verified', 'is_verified', 'isVerified'))
        created_at: datetime = Field(alias=AliasChoices('created', 'created_at', 'createdAt'))
        
        class Config:
            allow_population_by_field_name = True
    
    try:
        user = FlexibleUser(**api_data)
        print(f"✅ Successfully parsed external API data:")
        print(f"   User: {user.first_name} {user.last_name} ({user.username})")
        print(f"   Verified: {user.is_verified}")
        print(f"   Created: {user.created_at}")
    except Exception as e:
        print(f"❌ Failed to parse API data: {e}")
    
    # Validation during deserialization
    print("\n--- Validation During Deserialization ---")
    invalid_data = {
        "orderNumber": "ORD-INVALID",
        "customerId": "not-a-uuid",
        "customerName": "",
        "subtotal": -100.00,  # Invalid: negative
        "taxAmount": 10.00,
        "totalAmount": 50.00,  # Won't match calculation
        "itemCount": 0,  # Invalid: must be > 0
        "totalQuantity": 1,
        "status": "invalid_status"  # Invalid status
    }
    
    try:
        invalid_order = OrderSummary(**invalid_data)
    except Exception as e:
        print(f"❌ Expected validation errors: {str(e)[:200]}...")
    
    # Successful parsing with proper data
    valid_data = {
        "orderNumber": "ORD-2024-002",
        "customerId": str(uuid4()),
        "customerName": "Jane Doe",
        "subtotal": 100.00,
        "taxAmount": 8.50,
        "totalAmount": 108.50,
        "itemCount": 1,
        "totalQuantity": 1,
        "status": "pending"
    }
    
    try:
        valid_order = OrderSummary(**valid_data)
        print(f"✅ Valid order created: {valid_order.order_number}")
        print(f"   Total: {valid_order.currency} {valid_order.total_amount}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


if __name__ == "__main__":
    serialization_examples()
    deserialization_examples()