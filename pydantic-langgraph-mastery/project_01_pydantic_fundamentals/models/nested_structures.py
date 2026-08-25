"""
Project 1: Pydantic Fundamentals - Nested Structures
===================================================

Learning objectives:
- Master complex nested data structures
- Understand model composition patterns
- Learn recursive models and self-references
- Practice advanced typing with Union, Optional, etc.
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Union, Any, ForwardRef
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator, root_validator


# Enums for structured data
class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    CRYPTO = "cryptocurrency"


# Base models for composition
class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        extra = "forbid"


class ContactInfo(BaseModel):
    """Contact information structure"""
    phone: Optional[str] = Field(None, regex=r'^\+?1?\d{9,15}$')
    email: Optional[str] = Field(None, regex=r'^[^@]+@[^@]+\.[^@]+$')
    website: Optional[str] = Field(None)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v and len(v.replace('+', '').replace('-', '').replace(' ', '')) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        return v


# Complex nested structures
class Address(BaseModel):
    """Detailed address structure"""
    street_address: str = Field(..., min_length=1)
    apartment: Optional[str] = None
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=50)
    postal_code: str = Field(..., regex=r'^\d{5}(-\d{4})?$|^[A-Z]\d[A-Z] \d[A-Z]\d$')
    country: str = Field(default="USA")
    coordinates: Optional[Dict[str, float]] = None
    
    @validator('coordinates')
    def validate_coordinates(cls, v):
        if v:
            required_keys = {'latitude', 'longitude'}
            if not required_keys.issubset(v.keys()):
                raise ValueError('Coordinates must include latitude and longitude')
            
            lat, lng = v['latitude'], v['longitude']
            if not (-90 <= lat <= 90):
                raise ValueError('Latitude must be between -90 and 90')
            if not (-180 <= lng <= 180):
                raise ValueError('Longitude must be between -180 and 180')
        return v
    
    @property
    def formatted_address(self) -> str:
        """Return formatted address string"""
        parts = [self.street_address]
        if self.apartment:
            parts[0] += f", {self.apartment}"
        parts.extend([self.city, f"{self.state} {self.postal_code}"])
        if self.country != "USA":
            parts.append(self.country)
        return ", ".join(parts)


class Person(TimestampMixin):
    """Person with contact and address information"""
    id: UUID = Field(default_factory=uuid4)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: Optional[date] = None
    addresses: List[Address] = Field(default_factory=list)
    contact_info: Optional[ContactInfo] = None
    emergency_contact: Optional['Person'] = None  # Forward reference
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self) -> Optional[int]:
        if self.date_of_birth:
            today = date.today()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None
    
    @property
    def primary_address(self) -> Optional[Address]:
        return self.addresses[0] if self.addresses else None


# Update forward references
Person.model_rebuild()


class Product(TimestampMixin):
    """Product with detailed specifications"""
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    sku: str = Field(..., min_length=1, max_length=50)
    price: float = Field(..., gt=0)
    weight: Optional[float] = Field(None, gt=0, description="Weight in pounds")
    dimensions: Optional[Dict[str, float]] = None
    categories: List[str] = Field(default_factory=list)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    inventory_count: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)
    
    @validator('dimensions')
    def validate_dimensions(cls, v):
        if v:
            required = {'length', 'width', 'height'}
            if not required.issubset(v.keys()):
                raise ValueError('Dimensions must include length, width, and height')
            
            for dim, value in v.items():
                if dim in required and value <= 0:
                    raise ValueError(f'{dim.capitalize()} must be positive')
        return v
    
    @validator('price')
    def validate_price_precision(cls, v):
        if round(v, 2) != v:
            raise ValueError('Price cannot have more than 2 decimal places')
        return v
    
    @property
    def volume(self) -> Optional[float]:
        """Calculate volume if dimensions are available"""
        if self.dimensions:
            return (self.dimensions.get('length', 0) * 
                   self.dimensions.get('width', 0) * 
                   self.dimensions.get('height', 0))
        return None


class OrderItem(BaseModel):
    """Individual item in an order"""
    product: Product
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    discount_percent: float = Field(default=0, ge=0, le=100)
    
    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price
    
    @property
    def discount_amount(self) -> float:
        return self.subtotal * (self.discount_percent / 100)
    
    @property
    def total(self) -> float:
        return self.subtotal - self.discount_amount
    
    @validator('unit_price')
    def validate_unit_price(cls, v, values):
        # Ensure unit price matches product price (with some tolerance for discounts)
        if 'product' in values:
            product_price = values['product'].price
            if v > product_price * 1.1:  # Allow 10% markup
                raise ValueError('Unit price cannot exceed product price by more than 10%')
        return v


class Payment(BaseModel):
    """Payment information"""
    id: UUID = Field(default_factory=uuid4)
    method: PaymentMethod
    amount: float = Field(..., gt=0)
    transaction_id: Optional[str] = None
    status: str = Field(default="pending")
    processed_at: Optional[datetime] = None
    
    @validator('amount')
    def validate_amount_precision(cls, v):
        if round(v, 2) != v:
            raise ValueError('Payment amount cannot have more than 2 decimal places')
        return v


class Order(TimestampMixin):
    """Complete order structure with all nested components"""
    id: UUID = Field(default_factory=uuid4)
    order_number: str = Field(..., min_length=1)
    customer: Person
    items: List[OrderItem] = Field(..., min_items=1)
    shipping_address: Address
    billing_address: Optional[Address] = None
    payment: Payment
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    notes: Optional[str] = None
    
    # Calculated fields
    @property
    def subtotal(self) -> float:
        return sum(item.subtotal for item in self.items)
    
    @property
    def total_discount(self) -> float:
        return sum(item.discount_amount for item in self.items)
    
    @property
    def total_before_tax(self) -> float:
        return sum(item.total for item in self.items)
    
    @property
    def tax_amount(self) -> float:
        # Simple tax calculation (8.5% - would be more complex in real app)
        return round(self.total_before_tax * 0.085, 2)
    
    @property
    def total_amount(self) -> float:
        return self.total_before_tax + self.tax_amount
    
    @root_validator
    def validate_order_consistency(cls, values):
        """Validate business rules across the entire order"""
        # Ensure payment amount matches order total
        if 'payment' in values and 'items' in values:
            items = values['items']
            payment = values['payment']
            
            if items:
                total_before_tax = sum(item.total for item in items)
                tax = round(total_before_tax * 0.085, 2)
                expected_total = total_before_tax + tax
                
                if abs(payment.amount - expected_total) > 0.01:  # Allow 1 cent difference for rounding
                    raise ValueError(f'Payment amount ({payment.amount}) does not match order total ({expected_total})')
        
        # Use billing address as shipping address if not provided
        if 'billing_address' not in values or values['billing_address'] is None:
            values['billing_address'] = values.get('shipping_address')
        
        return values


# Recursive/Tree structures
class Category(BaseModel):
    """Hierarchical category structure"""
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent: Optional['Category'] = None
    children: List['Category'] = Field(default_factory=list)
    products: List[Product] = Field(default_factory=list)
    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
    
    @property
    def full_path(self) -> str:
        """Get full category path"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    @property
    def depth(self) -> int:
        """Get category depth in hierarchy"""
        if self.parent:
            return self.parent.depth + 1
        return 0
    
    def add_child(self, child: 'Category') -> None:
        """Add a child category"""
        child.parent = self
        self.children.append(child)
    
    def get_all_products(self) -> List[Product]:
        """Get all products including from child categories"""
        all_products = self.products.copy()
        for child in self.children:
            all_products.extend(child.get_all_products())
        return all_products


# Update forward references
Category.model_rebuild()


def nested_structure_examples():
    """Demonstrate complex nested structures"""
    print("=== Nested Structure Examples ===\n")
    
    # Create a person with full details
    contact = ContactInfo(
        phone="+1-555-123-4567",
        email="alice@example.com",
        website="https://alice.dev"
    )
    
    home_address = Address(
        street_address="123 Main Street",
        apartment="Apt 4B",
        city="San Francisco",
        state="CA",
        postal_code="94105",
        coordinates={"latitude": 37.7749, "longitude": -122.4194}
    )
    
    customer = Person(
        first_name="Alice",
        last_name="Johnson",
        date_of_birth=date(1990, 5, 15),
        addresses=[home_address],
        contact_info=contact
    )
    
    print(f"✅ Created customer: {customer.full_name}")
    print(f"   Age: {customer.age}")
    print(f"   Address: {customer.primary_address.formatted_address}\n")
    
    # Create products
    laptop = Product(
        name="Gaming Laptop Pro",
        description="High-performance gaming laptop with RTX graphics",
        sku="LAPTOP-001",
        price=1299.99,
        weight=5.5,
        dimensions={"length": 15.6, "width": 10.2, "height": 1.0},
        categories=["Electronics", "Computers", "Laptops"],
        attributes={
            "brand": "TechCorp",
            "color": "Black",
            "ram": "16GB",
            "storage": "512GB SSD"
        },
        inventory_count=25
    )
    
    mouse = Product(
        name="Wireless Gaming Mouse",
        sku="MOUSE-001",
        price=79.99,
        inventory_count=100
    )
    
    # Create order items
    laptop_item = OrderItem(
        product=laptop,
        quantity=1,
        unit_price=laptop.price,
        discount_percent=10
    )
    
    mouse_item = OrderItem(
        product=mouse,
        quantity=2,
        unit_price=mouse.price
    )
    
    # Create payment
    payment = Payment(
        method=PaymentMethod.CREDIT_CARD,
        amount=1399.57,  # This will be validated against order total
        transaction_id="TXN_123456789",
        status="completed"
    )
    
    # Create complete order
    try:
        order = Order(
            order_number="ORD-2024-001",
            customer=customer,
            items=[laptop_item, mouse_item],
            shipping_address=home_address,
            payment=payment,
            status=OrderStatus.CONFIRMED,
            notes="Rush delivery requested"
        )
        
        print(f"✅ Created order: {order.order_number}")
        print(f"   Customer: {order.customer.full_name}")
        print(f"   Items: {len(order.items)}")
        print(f"   Subtotal: ${order.subtotal:.2f}")
        print(f"   Discount: ${order.total_discount:.2f}")
        print(f"   Tax: ${order.tax_amount:.2f}")
        print(f"   Total: ${order.total_amount:.2f}")
        print(f"   Payment: ${order.payment.amount:.2f} via {order.payment.method.value}\n")
        
    except Exception as e:
        print(f"❌ Order creation failed: {e}\n")
    
    # Demonstrate category hierarchy
    print("--- Category Hierarchy ---")
    electronics = Category(name="Electronics", slug="electronics")
    computers = Category(name="Computers", slug="computers")
    laptops = Category(name="Laptops", slug="laptops")
    
    electronics.add_child(computers)
    computers.add_child(laptops)
    laptops.products.append(laptop)
    
    print(f"✅ Category hierarchy created:")
    print(f"   {laptops.full_path}")
    print(f"   Depth: {laptops.depth}")
    print(f"   Products in laptops: {len(laptops.products)}")
    print(f"   All products in electronics: {len(electronics.get_all_products())}")


def serialization_examples():
    """Demonstrate serialization of complex structures"""
    print("\n=== Serialization Examples ===\n")
    
    # Create a simple nested structure
    address = Address(
        street_address="456 Oak Ave",
        city="Portland",
        state="OR",
        postal_code="97201"
    )
    
    person = Person(
        first_name="Bob",
        last_name="Smith",
        addresses=[address]
    )
    
    # JSON serialization
    json_data = person.json(indent=2)
    print("JSON serialization:")
    print(json_data[:300] + "..." if len(json_data) > 300 else json_data)
    
    # Dictionary serialization
    dict_data = person.dict()
    print(f"\nDict keys: {list(dict_data.keys())}")
    
    # Exclude/include specific fields
    minimal_data = person.dict(include={'first_name', 'last_name', 'full_name'})
    print(f"Minimal data: {minimal_data}")
    
    # Custom serialization with aliases
    class PersonAPI(BaseModel):
        name: str = Field(alias="full_name")
        contact_email: Optional[str] = Field(None, alias="email")
        
        class Config:
            allow_population_by_field_name = True
    
    api_person = PersonAPI(full_name="Bob Smith", email="bob@example.com")
    print(f"API model: {api_person.dict(by_alias=True)}")


if __name__ == "__main__":
    nested_structure_examples()
    serialization_examples()