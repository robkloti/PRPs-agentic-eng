"""
Project 2: Simple State Machine - Pydantic State Models
======================================================

Learning objectives:
- Design robust state schemas using Pydantic
- Understand state validation and type safety
- Learn state reducers and update patterns
- Practice complex state transformations
"""

from typing import Dict, Any, List, Optional, Union, Literal
from typing_extensions import TypedDict, Annotated
from datetime import datetime, timedelta
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator, root_validator
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage


class WorkflowStatus(str, Enum):
    """Status options for workflows"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class Priority(str, Enum):
    """Priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskType(str, Enum):
    """Types of tasks in the system"""
    ANALYSIS = "analysis"
    PROCESSING = "processing"
    VALIDATION = "validation"
    NOTIFICATION = "notification"
    CLEANUP = "cleanup"


class TaskStatus(str, Enum):
    """Status of individual tasks"""
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class TaskResult(BaseModel):
    """Result of a task execution"""
    task_id: UUID
    status: TaskStatus
    output: Optional[Any] = None
    error_message: Optional[str] = None
    execution_time: float = Field(..., ge=0, description="Execution time in seconds")
    started_at: datetime
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('completed_at')
    def validate_completion_time(cls, v, values):
        """Ensure completion time is after start time"""
        if v and 'started_at' in values:
            if v < values['started_at']:
                raise ValueError('Completion time must be after start time')
        return v
    
    @root_validator
    def validate_result_consistency(cls, values):
        """Ensure result data is consistent"""
        status = values.get('status')
        error_message = values.get('error_message')
        completed_at = values.get('completed_at')
        
        # Failed tasks should have error messages
        if status == TaskStatus.FAILED and not error_message:
            raise ValueError('Failed tasks must have an error message')
        
        # Completed/failed tasks should have completion time
        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and not completed_at:
            values['completed_at'] = datetime.utcnow()
        
        return values
    
    @property
    def duration(self) -> Optional[timedelta]:
        """Calculate task duration"""
        if self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    def is_successful(self) -> bool:
        """Check if task completed successfully"""
        return self.status == TaskStatus.COMPLETED and self.error_message is None


class Task(BaseModel):
    """Individual task in a workflow"""
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    task_type: TaskType
    priority: Priority = Field(default=Priority.MEDIUM)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[UUID] = Field(default_factory=list)
    max_retries: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=300, gt=0, le=3600)
    
    # State fields
    status: TaskStatus = Field(default=TaskStatus.QUEUED)
    retry_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    result: Optional[TaskResult] = None
    
    @validator('dependencies')
    def validate_no_self_dependency(cls, v, values):
        """Ensure task doesn't depend on itself"""
        task_id = values.get('id')
        if task_id and task_id in v:
            raise ValueError('Task cannot depend on itself')
        return v
    
    @property
    def is_ready_to_run(self) -> bool:
        """Check if task is ready to execute"""
        return (self.status == TaskStatus.QUEUED and 
                self.retry_count <= self.max_retries)
    
    @property
    def is_terminal(self) -> bool:
        """Check if task is in terminal state"""
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.SKIPPED]
    
    def can_retry(self) -> bool:
        """Check if task can be retried"""
        return (self.status == TaskStatus.FAILED and 
                self.retry_count < self.max_retries)
    
    def start_execution(self) -> None:
        """Mark task as started"""
        self.status = TaskStatus.RUNNING
    
    def complete_with_result(self, result: TaskResult) -> None:
        """Complete task with result"""
        self.result = result
        self.status = result.status
    
    def retry(self) -> None:
        """Retry failed task"""
        if self.can_retry():
            self.retry_count += 1
            self.status = TaskStatus.QUEUED
            self.result = None


# TypedDict versions for LangGraph compatibility
class SimpleTaskState(TypedDict):
    """Simple task state for basic workflows"""
    task_id: UUID
    task_name: str
    status: str
    progress: float  # 0.0 to 1.0
    current_step: str
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]


class ConversationState(TypedDict):
    """State for conversational workflows"""
    messages: Annotated[List[BaseMessage], add_messages]
    user_id: UUID
    session_id: UUID
    current_topic: Optional[str]
    context: Dict[str, Any]
    last_activity: datetime
    message_count: int
    preferences: Dict[str, Any]


class WorkflowState(TypedDict):
    """Complete workflow state"""
    workflow_id: UUID
    name: str
    status: str
    priority: str
    tasks: List[Dict[str, Any]]  # Serialized Task objects
    current_task_id: Optional[UUID]
    progress: float
    started_at: datetime
    estimated_completion: Optional[datetime]
    actual_completion: Optional[datetime]
    error_count: int
    success_count: int
    metadata: Dict[str, Any]


class ValidationState(TypedDict):
    """State for validation workflows"""
    input_data: Dict[str, Any]
    validation_rules: List[Dict[str, Any]]
    validation_results: Dict[str, Any]
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    corrected_data: Optional[Dict[str, Any]]
    validation_summary: Optional[Dict[str, Any]]


class ProcessingState(TypedDict):
    """State for data processing workflows"""
    input_data: List[Dict[str, Any]]
    processed_items: List[Dict[str, Any]]
    failed_items: List[Dict[str, Any]]
    current_item_index: int
    total_items: int
    batch_size: int
    processing_stats: Dict[str, Any]
    intermediate_results: Dict[str, Any]


# Pydantic models for complex state management
class WorkflowExecution(BaseModel):
    """Complete workflow execution model"""
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: WorkflowStatus = Field(default=WorkflowStatus.PENDING)
    priority: Priority = Field(default=Priority.MEDIUM)
    
    # Tasks
    tasks: List[Task] = Field(default_factory=list)
    task_execution_order: List[UUID] = Field(default_factory=list)
    current_task_index: int = Field(default=0, ge=0)
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[timedelta] = None
    
    # Results
    results: Dict[UUID, TaskResult] = Field(default_factory=dict)
    final_output: Optional[Any] = None
    error_summary: List[str] = Field(default_factory=list)
    
    # Metadata
    created_by: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('tasks')
    def validate_task_dependencies(cls, v):
        """Ensure task dependencies are valid"""
        task_ids = {task.id for task in v}
        
        for task in v:
            for dep_id in task.dependencies:
                if dep_id not in task_ids:
                    raise ValueError(f'Task {task.name} depends on non-existent task {dep_id}')
        
        return v
    
    @property
    def progress(self) -> float:
        """Calculate overall progress (0.0 to 1.0)"""
        if not self.tasks:
            return 0.0
        
        completed_tasks = sum(1 for task in self.tasks if task.is_terminal)
        return completed_tasks / len(self.tasks)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate of completed tasks"""
        terminal_tasks = [task for task in self.tasks if task.is_terminal]
        if not terminal_tasks:
            return 0.0
        
        successful_tasks = sum(1 for task in terminal_tasks 
                             if task.status == TaskStatus.COMPLETED)
        return successful_tasks / len(terminal_tasks)
    
    @property
    def current_task(self) -> Optional[Task]:
        """Get currently executing task"""
        running_tasks = [task for task in self.tasks if task.status == TaskStatus.RUNNING]
        return running_tasks[0] if running_tasks else None
    
    @property
    def next_ready_tasks(self) -> List[Task]:
        """Get tasks ready to be executed"""
        completed_task_ids = {task.id for task in self.tasks if task.is_terminal}
        
        ready_tasks = []
        for task in self.tasks:
            if (task.status == TaskStatus.QUEUED and
                all(dep_id in completed_task_ids for dep_id in task.dependencies)):
                ready_tasks.append(task)
        
        # Sort by priority
        priority_order = {
            Priority.URGENT: 0,
            Priority.HIGH: 1,
            Priority.MEDIUM: 2,
            Priority.LOW: 3
        }
        
        return sorted(ready_tasks, key=lambda t: priority_order[t.priority])
    
    @property
    def is_complete(self) -> bool:
        """Check if workflow is complete"""
        return all(task.is_terminal for task in self.tasks)
    
    @property
    def has_failed(self) -> bool:
        """Check if workflow has failed"""
        return any(task.status == TaskStatus.FAILED and not task.can_retry() 
                  for task in self.tasks)
    
    def add_task(self, task: Task) -> None:
        """Add a task to the workflow"""
        if task.id in [t.id for t in self.tasks]:
            raise ValueError(f'Task with ID {task.id} already exists')
        
        self.tasks.append(task)
        
        # Update execution order if needed
        if task.id not in self.task_execution_order:
            # Insert based on dependencies
            insert_index = len(self.task_execution_order)
            for i, existing_task_id in enumerate(self.task_execution_order):
                existing_task = next(t for t in self.tasks if t.id == existing_task_id)
                if task.id in existing_task.dependencies:
                    insert_index = i
                    break
            
            self.task_execution_order.insert(insert_index, task.id)
    
    def start(self) -> None:
        """Start workflow execution"""
        if self.status != WorkflowStatus.PENDING:
            raise ValueError('Workflow must be pending to start')
        
        self.status = WorkflowStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete(self) -> None:
        """Mark workflow as completed"""
        if not self.is_complete:
            raise ValueError('Not all tasks are complete')
        
        self.status = WorkflowStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        
        # Calculate final output from task results
        successful_results = [
            result.output for result in self.results.values()
            if result.status == TaskStatus.COMPLETED and result.output is not None
        ]
        
        self.final_output = {
            'task_results': successful_results,
            'success_rate': self.success_rate,
            'total_tasks': len(self.tasks),
            'execution_time': (self.completed_at - self.started_at).total_seconds()
        }
    
    def fail(self, reason: str) -> None:
        """Mark workflow as failed"""
        self.status = WorkflowStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_summary.append(reason)
    
    def to_state_dict(self) -> WorkflowState:
        """Convert to TypedDict for LangGraph compatibility"""
        return WorkflowState(
            workflow_id=self.id,
            name=self.name,
            status=self.status.value,
            priority=self.priority.value,
            tasks=[task.dict() for task in self.tasks],
            current_task_id=self.current_task.id if self.current_task else None,
            progress=self.progress,
            started_at=self.started_at or self.created_at,
            estimated_completion=None,  # Could calculate based on task estimates
            actual_completion=self.completed_at,
            error_count=len(self.error_summary),
            success_count=len([r for r in self.results.values() 
                             if r.status == TaskStatus.COMPLETED]),
            metadata=self.metadata
        )


def state_model_examples():
    """Demonstrate Pydantic state models"""
    print("=== Pydantic State Model Examples ===\n")
    
    # Task Creation and Validation
    print("--- Task Creation ---")
    try:
        # Create tasks with dependencies
        task1 = Task(
            name="Data Extraction",
            task_type=TaskType.ANALYSIS,
            priority=Priority.HIGH,
            parameters={"source": "database", "table": "users"},
            timeout_seconds=600
        )
        
        task2 = Task(
            name="Data Validation",
            task_type=TaskType.VALIDATION,
            priority=Priority.MEDIUM,
            parameters={"rules": ["not_null", "email_format"]},
            dependencies=[task1.id]  # Depends on task1
        )
        
        task3 = Task(
            name="Data Processing",
            task_type=TaskType.PROCESSING,
            priority=Priority.MEDIUM,
            parameters={"algorithm": "transform_v2"},
            dependencies=[task2.id]  # Depends on task2
        )
        
        print(f"✅ Created {task1.name} (ID: {str(task1.id)[:8]}...)")
        print(f"✅ Created {task2.name} (ID: {str(task2.id)[:8]}...)")
        print(f"✅ Created {task3.name} (ID: {str(task3.id)[:8]}...)")
        
        # Show task properties
        print(f"   Task1 ready to run: {task1.is_ready_to_run}")
        print(f"   Task2 ready to run: {task2.is_ready_to_run}")
        print(f"   Task3 ready to run: {task3.is_ready_to_run}")
        
    except Exception as e:
        print(f"❌ Task creation failed: {e}")
    
    # Workflow Creation
    print("\n--- Workflow Creation ---")
    try:
        workflow = WorkflowExecution(
            name="Data Processing Pipeline",
            description="Extract, validate, and process user data",
            priority=Priority.HIGH,
            created_by="alice@example.com",
            tags=["data", "etl", "users"]
        )
        
        # Add tasks to workflow
        workflow.add_task(task1)
        workflow.add_task(task2)
        workflow.add_task(task3)
        
        print(f"✅ Created workflow: {workflow.name}")
        print(f"   Total tasks: {len(workflow.tasks)}")
        print(f"   Progress: {workflow.progress:.1%}")
        print(f"   Ready tasks: {len(workflow.next_ready_tasks)}")
        
        # Show ready tasks
        for task in workflow.next_ready_tasks:
            print(f"   - {task.name} (Priority: {task.priority.value})")
        
    except Exception as e:
        print(f"❌ Workflow creation failed: {e}")
    
    # Task Execution Simulation
    print("\n--- Task Execution Simulation ---")
    workflow.start()
    
    # Simulate task1 execution
    task1.start_execution()
    print(f"🔄 Started: {task1.name}")
    
    # Simulate successful completion
    result1 = TaskResult(
        task_id=task1.id,
        status=TaskStatus.COMPLETED,
        output={"records_extracted": 1000, "status": "success"},
        execution_time=45.2,
        started_at=datetime.utcnow() - timedelta(seconds=45),
        completed_at=datetime.utcnow(),
        metadata={"source_rows": 1000}
    )
    
    task1.complete_with_result(result1)
    workflow.results[task1.id] = result1
    
    print(f"✅ Completed: {task1.name}")
    print(f"   Duration: {result1.duration}")
    print(f"   Output: {result1.output}")
    
    # Now task2 should be ready
    print(f"\n   Updated ready tasks: {len(workflow.next_ready_tasks)}")
    for task in workflow.next_ready_tasks:
        print(f"   - {task.name}")
    
    # TypedDict conversion
    print("\n--- State Conversion ---")
    state_dict = workflow.to_state_dict()
    
    print("Workflow state for LangGraph:")
    print(f"   ID: {str(state_dict['workflow_id'])[:8]}...")
    print(f"   Status: {state_dict['status']}")
    print(f"   Progress: {state_dict['progress']:.1%}")
    print(f"   Tasks: {len(state_dict['tasks'])}")
    print(f"   Current task: {state_dict['current_task_id']}")


def validation_examples():
    """Demonstrate state validation"""
    print("\n=== State Validation Examples ===\n")
    
    # Invalid task creation
    print("--- Validation Errors ---")
    try:
        invalid_task = Task(
            name="",  # Invalid: empty name
            task_type=TaskType.ANALYSIS,
            max_retries=15,  # Invalid: too many retries
            timeout_seconds=-1  # Invalid: negative timeout
        )
    except Exception as e:
        print(f"❌ Expected validation error: {str(e)[:100]}...")
    
    # Self-dependency error
    try:
        task_id = uuid4()
        self_dependent_task = Task(
            name="Self Dependent",
            task_type=TaskType.PROCESSING,
            dependencies=[task_id]  # Will be set to self
        )
        self_dependent_task.id = task_id  # Create circular dependency
    except Exception as e:
        print(f"❌ Expected self-dependency error: {str(e)[:100]}...")
    
    # TaskResult validation
    print("\n--- TaskResult Validation ---")
    try:
        # Invalid: completion before start
        invalid_result = TaskResult(
            task_id=uuid4(),
            status=TaskStatus.COMPLETED,
            execution_time=10.0,
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow() - timedelta(hours=1)  # Before start!
        )
    except Exception as e:
        print(f"❌ Expected time validation error: {str(e)[:100]}...")
    
    try:
        # Invalid: failed status without error message
        failed_result = TaskResult(
            task_id=uuid4(),
            status=TaskStatus.FAILED,  # Failed but no error message
            execution_time=5.0,
            started_at=datetime.utcnow() - timedelta(seconds=5)
        )
    except Exception as e:
        print(f"❌ Expected error message validation: {str(e)[:100]}...")


if __name__ == "__main__":
    state_model_examples()
    validation_examples()