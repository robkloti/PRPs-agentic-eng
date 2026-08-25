"""
Project 5: Production System - Logging Configuration
===================================================

Learning objectives:
- Implement structured logging for production systems
- Create contextual loggers with correlation IDs
- Handle log aggregation and filtering patterns
- Practice performance monitoring and alerting
"""

import logging
import logging.config
import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from enum import Enum
from uuid import uuid4
from pydantic import BaseModel, Field
from pathlib import Path
import traceback


class LogLevel(str, Enum):
    """Standard logging levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"  
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(str, Enum):
    """Log categories for filtering and routing"""
    SYSTEM = "system"
    AGENT = "agent"
    TOOL = "tool"
    WORKFLOW = "workflow"
    USER = "user"
    SECURITY = "security"
    PERFORMANCE = "performance"
    ERROR = "error"


class StructuredLogRecord(BaseModel):
    """Structured log record with consistent format"""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    level: LogLevel = Field(...)
    category: LogCategory = Field(...)
    message: str = Field(...)
    
    # Context
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    workflow_id: Optional[str] = None
    task_id: Optional[str] = None
    
    # Technical details
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    
    # Additional data
    extra_data: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    # Error details (if applicable)
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # Performance metrics
    duration_ms: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    
    def to_json(self) -> str:
        """Convert to JSON string for output"""
        return self.model_dump_json(exclude_none=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return self.model_dump(exclude_none=True)


class ContextualLogger:
    """Logger with contextual information"""
    
    def __init__(self, name: str, base_logger: Optional[logging.Logger] = None):
        self.name = name
        self.logger = base_logger or logging.getLogger(name)
        self.context: Dict[str, Any] = {}
    
    def set_context(self, **kwargs) -> 'ContextualLogger':
        """Set context variables"""
        new_context = self.context.copy()
        new_context.update(kwargs)
        
        # Create new logger with updated context
        new_logger = ContextualLogger(self.name, self.logger)
        new_logger.context = new_context
        return new_logger
    
    def _create_record(self, level: LogLevel, category: LogCategory, 
                      message: str, **kwargs) -> StructuredLogRecord:
        """Create structured log record"""
        # Get caller information
        frame = sys._getframe(2)  # Go up 2 frames to get actual caller
        
        record_data = {
            'level': level,
            'category': category,
            'message': message,
            'module': frame.f_code.co_filename,
            'function': frame.f_code.co_name,
            'line_number': frame.f_lineno,
            **self.context,
            **kwargs
        }
        
        return StructuredLogRecord(**record_data)
    
    def debug(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log debug message"""
        record = self._create_record(LogLevel.DEBUG, category, message, **kwargs)
        self.logger.debug(record.to_json())
    
    def info(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log info message"""
        record = self._create_record(LogLevel.INFO, category, message, **kwargs)
        self.logger.info(record.to_json())
    
    def warning(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log warning message"""
        record = self._create_record(LogLevel.WARNING, category, message, **kwargs)
        self.logger.warning(record.to_json())
    
    def error(self, message: str, category: LogCategory = LogCategory.ERROR, 
              error: Optional[Exception] = None, **kwargs):
        """Log error message"""
        if error:
            kwargs.update({
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stack_trace': traceback.format_exc()
            })
        
        record = self._create_record(LogLevel.ERROR, category, message, **kwargs)
        self.logger.error(record.to_json())
    
    def critical(self, message: str, category: LogCategory = LogCategory.ERROR, 
                error: Optional[Exception] = None, **kwargs):
        """Log critical message"""
        if error:
            kwargs.update({
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stack_trace': traceback.format_exc()
            })
        
        record = self._create_record(LogLevel.CRITICAL, category, message, **kwargs)
        self.logger.critical(record.to_json())
    
    def log_performance(self, operation: str, duration_ms: float, **kwargs):
        """Log performance metrics"""
        self.info(
            f"Performance: {operation} completed in {duration_ms:.2f}ms",
            category=LogCategory.PERFORMANCE,
            duration_ms=duration_ms,
            operation=operation,
            **kwargs
        )
    
    def log_user_action(self, action: str, user_id: str, **kwargs):
        """Log user actions"""
        self.info(
            f"User action: {action}",
            category=LogCategory.USER,
            user_id=user_id,
            action=action,
            **kwargs
        )
    
    def log_security_event(self, event: str, severity: str = "medium", **kwargs):
        """Log security events"""
        level = LogLevel.WARNING if severity == "low" else LogLevel.ERROR
        record = self._create_record(
            level, LogCategory.SECURITY, f"Security event: {event}",
            event_type=event, severity=severity, **kwargs
        )
        
        if level == LogLevel.WARNING:
            self.logger.warning(record.to_json())
        else:
            self.logger.error(record.to_json())


class LoggingConfig(BaseModel):
    """Configuration for logging system"""
    log_level: LogLevel = Field(default=LogLevel.INFO)
    log_format: str = Field(default="json")  # json or text
    log_directory: str = Field(default="logs")
    max_file_size_mb: int = Field(default=100, gt=0)
    backup_count: int = Field(default=5, ge=0)
    
    # Console logging
    console_enabled: bool = Field(default=True)
    console_level: LogLevel = Field(default=LogLevel.INFO)
    
    # File logging
    file_enabled: bool = Field(default=True)
    file_level: LogLevel = Field(default=LogLevel.DEBUG)
    
    # Remote logging (e.g., ELK stack)
    remote_enabled: bool = Field(default=False)
    remote_endpoint: Optional[str] = None
    remote_api_key: Optional[str] = None
    
    # Filtering
    excluded_modules: List[str] = Field(default_factory=list)
    included_categories: List[LogCategory] = Field(default_factory=list)
    
    # Performance
    async_logging: bool = Field(default=True)
    buffer_size: int = Field(default=1000, gt=0)


class ProductionLogger:
    """Production-ready logging system"""
    
    def __init__(self, config: LoggingConfig):
        self.config = config
        self.correlation_id = str(uuid4())
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup logging configuration"""
        
        # Create log directory
        log_dir = Path(self.config.log_directory)
        log_dir.mkdir(exist_ok=True)
        
        # Base logging configuration
        logging_config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'json': {
                    'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                    'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
                },
                'text': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                }
            },
            'handlers': {},
            'loggers': {
                '': {  # Root logger
                    'handlers': [],
                    'level': self.config.log_level.value,
                    'propagate': False
                }
            }
        }
        
        handlers = []
        
        # Console handler
        if self.config.console_enabled:
            logging_config['handlers']['console'] = {
                'class': 'logging.StreamHandler',
                'level': self.config.console_level.value,
                'formatter': self.config.log_format,
                'stream': 'ext://sys.stdout'
            }
            handlers.append('console')
        
        # File handler
        if self.config.file_enabled:
            logging_config['handlers']['file'] = {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': self.config.file_level.value,
                'formatter': self.config.log_format,
                'filename': str(log_dir / 'application.log'),
                'maxBytes': self.config.max_file_size_mb * 1024 * 1024,
                'backupCount': self.config.backup_count
            }
            handlers.append('file')
        
        # Error file handler (separate file for errors)
        if self.config.file_enabled:
            logging_config['handlers']['error_file'] = {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': self.config.log_format,
                'filename': str(log_dir / 'errors.log'),
                'maxBytes': self.config.max_file_size_mb * 1024 * 1024,
                'backupCount': self.config.backup_count
            }
            handlers.append('error_file')
        
        # Security log handler
        if self.config.file_enabled:
            logging_config['handlers']['security_file'] = {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'WARNING',
                'formatter': self.config.log_format,
                'filename': str(log_dir / 'security.log'),
                'maxBytes': self.config.max_file_size_mb * 1024 * 1024,
                'backupCount': self.config.backup_count,
                'filters': ['security_filter']
            }
            handlers.append('security_file')
        
        # Add filters
        logging_config['filters'] = {
            'security_filter': {
                '()': SecurityLogFilter
            }
        }
        
        logging_config['loggers']['']['handlers'] = handlers
        
        # Apply configuration
        logging.config.dictConfig(logging_config)
    
    def get_logger(self, name: str) -> ContextualLogger:
        """Get a contextual logger"""
        base_logger = logging.getLogger(name)
        contextual_logger = ContextualLogger(name, base_logger)
        
        # Set default context
        contextual_logger = contextual_logger.set_context(
            correlation_id=self.correlation_id,
            service_name="pydantic-langgraph-system"
        )
        
        return contextual_logger


class SecurityLogFilter(logging.Filter):
    """Filter to capture security-related logs"""
    
    def filter(self, record: logging.LogRecord) -> bool:
        # Check if this is a security-related log
        message = getattr(record, 'getMessage', lambda: str(record.msg))()
        
        security_keywords = [
            'security', 'authentication', 'authorization', 'login',
            'failed', 'blocked', 'suspicious', 'attack', 'breach'
        ]
        
        return any(keyword in message.lower() for keyword in security_keywords)


class PerformanceMonitor:
    """Performance monitoring with logging"""
    
    def __init__(self, logger: ContextualLogger):
        self.logger = logger
    
    def __call__(self, operation_name: str):
        """Decorator for monitoring function performance"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                import time
                import psutil
                import os
                
                # Get initial metrics
                process = psutil.Process(os.getpid())
                start_time = time.time()
                start_memory = process.memory_info().rss / 1024 / 1024  # MB
                
                try:
                    result = func(*args, **kwargs)
                    
                    # Log success
                    end_time = time.time()
                    end_memory = process.memory_info().rss / 1024 / 1024  # MB
                    
                    duration_ms = (end_time - start_time) * 1000
                    memory_delta = end_memory - start_memory
                    
                    self.logger.log_performance(
                        operation_name,
                        duration_ms=duration_ms,
                        memory_usage_mb=end_memory,
                        memory_delta_mb=memory_delta,
                        success=True
                    )
                    
                    return result
                    
                except Exception as e:
                    # Log failure
                    end_time = time.time()
                    duration_ms = (end_time - start_time) * 1000
                    
                    self.logger.error(
                        f"Operation {operation_name} failed",
                        category=LogCategory.PERFORMANCE,
                        duration_ms=duration_ms,
                        operation=operation_name,
                        success=False,
                        error=e
                    )
                    
                    raise
            
            return wrapper
        return decorator


def logging_examples():
    """Demonstrate production logging system"""
    print("=== Production Logging Examples ===\n")
    
    # Setup logging configuration
    config = LoggingConfig(
        log_level=LogLevel.DEBUG,
        log_format="json",
        console_enabled=True,
        file_enabled=True,
        log_directory="logs"
    )
    
    # Initialize production logger
    prod_logger = ProductionLogger(config)
    
    # Get contextual loggers
    app_logger = prod_logger.get_logger("application")
    agent_logger = prod_logger.get_logger("agent.supervisor")
    
    print("--- Basic Logging ---")
    
    # Basic logging
    app_logger.info("Application started successfully", 
                   category=LogCategory.SYSTEM,
                   version="1.0.0")
    
    app_logger.debug("Debug information for troubleshooting",
                    category=LogCategory.SYSTEM,
                    extra_data={"debug_mode": True})
    
    # Contextual logging
    print("\n--- Contextual Logging ---")
    
    # Create context-specific logger
    user_logger = agent_logger.set_context(
        user_id="user_123",
        session_id="session_456",
        workflow_id="workflow_789"
    )
    
    user_logger.log_user_action("login", user_id="user_123", ip_address="192.168.1.1")
    user_logger.info("User started new workflow", category=LogCategory.WORKFLOW)
    
    # Performance monitoring
    print("\n--- Performance Monitoring ---")
    
    monitor = PerformanceMonitor(app_logger)
    
    @monitor("expensive_calculation")
    def expensive_operation():
        import time
        time.sleep(0.1)  # Simulate work
        return "calculation_result"
    
    result = expensive_operation()
    
    # Error logging
    print("\n--- Error Logging ---")
    
    try:
        # Simulate an error
        raise ValueError("Sample error for demonstration")
    except Exception as e:
        app_logger.error("An error occurred during processing",
                        category=LogCategory.ERROR,
                        error=e,
                        extra_data={"operation": "sample_operation"})
    
    # Security logging
    print("\n--- Security Logging ---")
    
    app_logger.log_security_event(
        "failed_login_attempt",
        severity="high",
        user_id="attacker_123",
        ip_address="10.0.0.1",
        attempts=5
    )
    
    # Agent-specific logging
    print("\n--- Agent Logging ---")
    
    task_logger = agent_logger.set_context(
        task_id="task_001",
        agent_type="researcher"
    )
    
    task_logger.info("Agent started task execution",
                    category=LogCategory.AGENT,
                    task_type="research",
                    estimated_duration=300)
    
    task_logger.info("Tool execution completed",
                    category=LogCategory.TOOL,
                    tool_name="web_search",
                    duration_ms=1250,
                    success=True)
    
    print("\n✅ Logging examples completed. Check 'logs/' directory for output files.")


if __name__ == "__main__":
    logging_examples()