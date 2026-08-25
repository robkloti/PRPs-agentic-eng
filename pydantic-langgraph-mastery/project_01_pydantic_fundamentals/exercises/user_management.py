"""
Project 1: Pydantic Fundamentals - User Management Exercise
=========================================================

Exercise: Build a complete user management system with validation
- Create user registration with comprehensive validation
- Implement user profiles with privacy controls
- Add role-based permissions and access control
- Practice error handling and data transformation
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Set
from enum import Enum
from uuid import UUID, uuid4
import hashlib
import re
from pydantic import (
    BaseModel, 
    Field, 
    EmailStr, 
    SecretStr,
    validator, 
    root_validator,
    computed_field
)


class UserRole(str, Enum):
    """User roles with increasing privileges"""
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPERUSER = "superuser"


class AccountStatus(str, Enum):
    """Account status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING_VERIFICATION = "pending_verification"


class PrivacyLevel(str, Enum):
    """Privacy levels for profile visibility"""
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"


class PasswordStrength(str, Enum):
    """Password strength levels"""
    WEAK = "weak"
    FAIR = "fair"
    GOOD = "good"
    STRONG = "strong"
    EXCELLENT = "excellent"


class UserRegistration(BaseModel):
    """User registration form with comprehensive validation"""
    
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr = Field(...)
    password: SecretStr = Field(..., min_length=8)
    confirm_password: SecretStr = Field(...)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: date = Field(...)
    phone: Optional[str] = Field(None, regex=r'^\+?1?\d{9,15}$')
    terms_accepted: bool = Field(...)
    newsletter_opt_in: bool = Field(default=False)
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format and restrictions"""
        if not re.match(r'^[a-zA-Z0-9_.-]+$', v):
            raise ValueError('Username can only contain letters, numbers, dots, hyphens, and underscores')
        
        if v.lower() in ['admin', 'root', 'system', 'support', 'help']:
            raise ValueError('Username is reserved')
        
        if v.startswith('.') or v.endswith('.'):
            raise ValueError('Username cannot start or end with a dot')
        
        if '..' in v:
            raise ValueError('Username cannot contain consecutive dots')
        
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        password = v.get_secret_value()
        
        errors = []
        
        if len(password) < 8:
            errors.append("at least 8 characters")
        
        if not re.search(r'[A-Z]', password):
            errors.append("at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("at least one special character")
        
        # Check for common weak patterns
        weak_patterns = [
            (r'(.)\1{3,}', "repeating characters"),
            (r'(012|123|234|345|456|567|678|789|890)', "sequential numbers"),
            (r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', "sequential letters")
        ]
        
        for pattern, description in weak_patterns:
            if re.search(pattern, password.lower()):
                errors.append(f"no {description}")
        
        # Check against common passwords (simplified check)
        common_passwords = [
            'password', 'password123', '123456789', 'qwerty123', 
            'letmein', 'welcome123', 'admin123', 'iloveyou'
        ]
        if password.lower() in common_passwords:
            errors.append("not a common password")
        
        if errors:
            raise ValueError(f"Password must have {', '.join(errors)}")
        
        return v
    
    @validator('date_of_birth')
    def validate_age(cls, v):
        """Ensure user meets minimum age requirement"""
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        
        if age < 13:
            raise ValueError('Users must be at least 13 years old')
        
        if age > 120:
            raise ValueError('Please enter a valid birth date')
        
        if v > today:
            raise ValueError('Birth date cannot be in the future')
        
        return v
    
    @validator('terms_accepted')
    def validate_terms(cls, v):
        """Ensure terms are accepted"""
        if not v:
            raise ValueError('You must accept the terms and conditions')
        return v
    
    @root_validator
    def validate_passwords_match(cls, values):
        """Ensure password and confirmation match"""
        password = values.get('password')
        confirm_password = values.get('confirm_password')
        
        if password and confirm_password:
            if password.get_secret_value() != confirm_password.get_secret_value():
                raise ValueError('Passwords do not match')
        
        return values
    
    def get_password_strength(self) -> PasswordStrength:
        """Calculate password strength score"""
        password = self.password.get_secret_value()
        score = 0
        
        # Length bonus
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        # Character variety
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        
        # Uniqueness
        unique_chars = len(set(password))
        if unique_chars >= len(password) * 0.7:
            score += 1
        
        # Map score to strength
        if score <= 2:
            return PasswordStrength.WEAK
        elif score <= 4:
            return PasswordStrength.FAIR
        elif score <= 6:
            return PasswordStrength.GOOD
        elif score <= 7:
            return PasswordStrength.STRONG
        else:
            return PasswordStrength.EXCELLENT


class UserProfile(BaseModel):
    """User profile with privacy controls"""
    
    id: UUID = Field(default_factory=uuid4)
    username: str = Field(...)
    email: EmailStr = Field(...)
    first_name: str = Field(...)
    last_name: str = Field(...)
    display_name: Optional[str] = None
    
    # Profile information
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = None
    date_of_birth: date = Field(...)
    
    # Account details
    role: UserRole = Field(default=UserRole.USER)
    status: AccountStatus = Field(default=AccountStatus.PENDING_VERIFICATION)
    is_verified: bool = Field(default=False)
    
    # Privacy settings
    profile_privacy: PrivacyLevel = Field(default=PrivacyLevel.PUBLIC)
    email_privacy: PrivacyLevel = Field(default=PrivacyLevel.PRIVATE)
    birthday_privacy: PrivacyLevel = Field(default=PrivacyLevel.FRIENDS)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    
    # Activity tracking
    login_count: int = Field(default=0)
    profile_views: int = Field(default=0)
    
    # Preferences
    email_notifications: bool = Field(default=True)
    push_notifications: bool = Field(default=True)
    marketing_emails: bool = Field(default=False)
    timezone: str = Field(default="UTC")
    language: str = Field(default="en")
    
    @validator('website')
    def validate_website(cls, v):
        """Validate website URL format"""
        if v and not re.match(r'^https?://.+\..+', v):
            raise ValueError('Website must be a valid URL starting with http:// or https://')
        return v
    
    @validator('display_name', always=True)
    def set_display_name(cls, v, values):
        """Auto-generate display name if not provided"""
        if not v and 'first_name' in values and 'last_name' in values:
            return f"{values['first_name']} {values['last_name']}"
        return v
    
    @computed_field
    @property
    def age(self) -> int:
        """Calculate current age"""
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
    
    @computed_field
    @property
    def full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}"
    
    @computed_field
    @property
    def account_age_days(self) -> int:
        """Calculate account age in days"""
        return (datetime.utcnow() - self.created_at).days
    
    def can_view_field(self, field: str, viewer_role: UserRole = UserRole.USER, 
                      is_friend: bool = False, is_self: bool = False) -> bool:
        """Check if a field can be viewed based on privacy settings"""
        if is_self:
            return True
        
        if viewer_role in [UserRole.ADMIN, UserRole.SUPERUSER]:
            return True
        
        privacy_map = {
            'email': self.email_privacy,
            'date_of_birth': self.birthday_privacy,
            'location': self.profile_privacy,
            'bio': self.profile_privacy,
            'website': self.profile_privacy
        }
        
        privacy_level = privacy_map.get(field, PrivacyLevel.PUBLIC)
        
        if privacy_level == PrivacyLevel.PUBLIC:
            return True
        elif privacy_level == PrivacyLevel.FRIENDS:
            return is_friend
        else:  # PRIVATE
            return False
    
    def to_public_dict(self, viewer_role: UserRole = UserRole.USER, 
                      is_friend: bool = False, is_self: bool = False) -> Dict:
        """Return public-safe representation of profile"""
        data = {
            'id': str(self.id),
            'username': self.username,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'profile_views': self.profile_views
        }
        
        # Add fields based on privacy settings
        if self.can_view_field('email', viewer_role, is_friend, is_self):
            data['email'] = self.email
        
        if self.can_view_field('date_of_birth', viewer_role, is_friend, is_self):
            data['date_of_birth'] = self.date_of_birth.isoformat()
            data['age'] = self.age
        
        if self.can_view_field('location', viewer_role, is_friend, is_self):
            data['location'] = self.location
        
        if self.can_view_field('bio', viewer_role, is_friend, is_self):
            data['bio'] = self.bio
        
        if self.can_view_field('website', viewer_role, is_friend, is_self):
            data['website'] = self.website
        
        # Admin-only fields
        if viewer_role in [UserRole.ADMIN, UserRole.SUPERUSER] or is_self:
            data.update({
                'role': self.role.value,
                'status': self.status.value,
                'last_login': self.last_login.isoformat() if self.last_login else None,
                'login_count': self.login_count
            })
        
        return data


class UserPermissions(BaseModel):
    """User permissions based on role and status"""
    
    user_id: UUID
    role: UserRole
    status: AccountStatus
    custom_permissions: Set[str] = Field(default_factory=set)
    
    # Base permissions by role
    ROLE_PERMISSIONS = {
        UserRole.USER: {
            'read_own_profile', 'edit_own_profile', 'create_content', 
            'comment', 'like', 'follow_users'
        },
        UserRole.MODERATOR: {
            'read_own_profile', 'edit_own_profile', 'create_content',
            'comment', 'like', 'follow_users', 'moderate_content',
            'ban_users', 'delete_comments'
        },
        UserRole.ADMIN: {
            'read_own_profile', 'edit_own_profile', 'create_content',
            'comment', 'like', 'follow_users', 'moderate_content',
            'ban_users', 'delete_comments', 'manage_users',
            'view_analytics', 'system_settings'
        },
        UserRole.SUPERUSER: {
            'read_own_profile', 'edit_own_profile', 'create_content',
            'comment', 'like', 'follow_users', 'moderate_content',
            'ban_users', 'delete_comments', 'manage_users',
            'view_analytics', 'system_settings', 'manage_admins',
            'system_maintenance'
        }
    }
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission"""
        if self.status in [AccountStatus.SUSPENDED, AccountStatus.BANNED]:
            return False
        
        if self.status == AccountStatus.INACTIVE:
            return permission in ['read_own_profile', 'edit_own_profile']
        
        base_permissions = self.ROLE_PERMISSIONS.get(self.role, set())
        return permission in base_permissions or permission in self.custom_permissions
    
    def get_all_permissions(self) -> Set[str]:
        """Get all permissions for this user"""
        if self.status in [AccountStatus.SUSPENDED, AccountStatus.BANNED]:
            return set()
        
        base_permissions = self.ROLE_PERMISSIONS.get(self.role, set())
        return base_permissions.union(self.custom_permissions)


def user_management_examples():
    """Demonstrate the user management system"""
    print("=== User Management System Examples ===\n")
    
    # User Registration
    print("--- User Registration ---")
    registration_data = {
        'username': 'alice_dev',
        'email': 'alice@example.com',
        'password': 'MyStr0ng!P@ssw0rd2024',
        'confirm_password': 'MyStr0ng!P@ssw0rd2024',
        'first_name': 'Alice',
        'last_name': 'Johnson',
        'date_of_birth': date(1995, 6, 15),
        'phone': '+1-555-123-4567',
        'terms_accepted': True,
        'newsletter_opt_in': True
    }
    
    try:
        registration = UserRegistration(**registration_data)
        print(f"✅ Registration successful: {registration.username}")
        print(f"   Password strength: {registration.get_password_strength().value}")
        print(f"   Email: {registration.email}")
        print(f"   Age: {(date.today() - registration.date_of_birth).days // 365} years")
    except Exception as e:
        print(f"❌ Registration failed: {e}")
    
    # Invalid registration
    print("\n--- Invalid Registration Example ---")
    invalid_data = registration_data.copy()
    invalid_data.update({
        'username': 'admin',  # Reserved
        'password': 'password123',  # Weak
        'confirm_password': 'different',  # Doesn't match
        'date_of_birth': date(2020, 1, 1),  # Too young
        'terms_accepted': False  # Not accepted
    })
    
    try:
        invalid_registration = UserRegistration(**invalid_data)
    except Exception as e:
        print(f"❌ Expected validation errors: {str(e)[:200]}...")
    
    # User Profile
    print("\n--- User Profile Management ---")
    profile_data = {
        'username': registration.username,
        'email': registration.email,
        'first_name': registration.first_name,
        'last_name': registration.last_name,
        'date_of_birth': registration.date_of_birth,
        'bio': 'Senior Python developer passionate about AI and machine learning',
        'location': 'San Francisco, CA',
        'website': 'https://alice-dev.com',
        'role': UserRole.USER,
        'status': AccountStatus.ACTIVE,
        'is_verified': True,
        'profile_privacy': PrivacyLevel.PUBLIC,
        'email_verified_at': datetime.utcnow(),
        'login_count': 42,
        'profile_views': 156
    }
    
    try:
        profile = UserProfile(**profile_data)
        print(f"✅ Profile created: {profile.display_name}")
        print(f"   Age: {profile.age}")
        print(f"   Account age: {profile.account_age_days} days")
        print(f"   Status: {profile.status.value}")
        
        # Test privacy controls
        print(f"\n   Privacy Examples:")
        print(f"   Public view: {profile.can_view_field('email', UserRole.USER, False, False)}")
        print(f"   Friend view: {profile.can_view_field('date_of_birth', UserRole.USER, True, False)}")
        print(f"   Admin view: {profile.can_view_field('email', UserRole.ADMIN, False, False)}")
        
    except Exception as e:
        print(f"❌ Profile creation failed: {e}")
    
    # Permissions System
    print("\n--- Permissions System ---")
    user_perms = UserPermissions(
        user_id=profile.id,
        role=profile.role,
        status=profile.status
    )
    
    admin_perms = UserPermissions(
        user_id=uuid4(),
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE
    )
    
    test_permissions = [
        'read_own_profile', 'create_content', 'moderate_content', 
        'manage_users', 'system_settings'
    ]
    
    print("User permissions:")
    for perm in test_permissions:
        has_perm = user_perms.has_permission(perm)
        print(f"   {perm}: {'✅' if has_perm else '❌'}")
    
    print("\nAdmin permissions:")
    for perm in test_permissions:
        has_perm = admin_perms.has_permission(perm)
        print(f"   {perm}: {'✅' if has_perm else '❌'}")
    
    # Public profile view
    print("\n--- Public Profile Serialization ---")
    public_data = profile.to_public_dict(viewer_role=UserRole.USER, is_friend=False)
    print("Public view (non-friend):")
    for key, value in public_data.items():
        print(f"   {key}: {value}")


if __name__ == "__main__":
    user_management_examples()