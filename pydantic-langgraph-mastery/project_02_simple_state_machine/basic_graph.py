"""
Project 2: Simple State Machine - Basic LangGraph
================================================

Learning objectives:
- Understand LangGraph StateGraph fundamentals
- Learn state schema design and management
- Master node functions and edge routing
- Practice graph compilation and execution
"""

from typing import Dict, Any, List, Optional, Literal
from typing_extensions import TypedDict
from datetime import datetime
import json
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage


class BasicState(TypedDict):
    """Basic state schema for simple workflows"""
    messages: List[BaseMessage]
    current_step: str
    step_count: int
    user_input: Optional[str]
    result: Optional[str]
    metadata: Dict[str, Any]


class CounterState(TypedDict):
    """State for a simple counter workflow"""
    count: int
    target: int
    operation: Literal["increment", "decrement", "reset"]
    history: List[Dict[str, Any]]
    is_complete: bool


class ValidationState(TypedDict):
    """State for input validation workflow"""
    user_input: str
    validation_results: Dict[str, Any]
    is_valid: bool
    error_messages: List[str]
    processed_data: Optional[Dict[str, Any]]


def create_basic_workflow():
    """Create a basic workflow demonstrating core LangGraph concepts"""
    
    def start_node(state: BasicState) -> BasicState:
        """Initialize the workflow"""
        print(f"🚀 Starting workflow at {datetime.now().strftime('%H:%M:%S')}")
        
        return {
            **state,
            "current_step": "started",
            "step_count": 1,
            "messages": [SystemMessage(content="Workflow initialized")],
            "metadata": {"started_at": datetime.now().isoformat()}
        }
    
    def process_input_node(state: BasicState) -> BasicState:
        """Process user input"""
        print(f"🔄 Processing input: {state.get('user_input', 'None')}")
        
        user_input = state.get("user_input", "")
        
        # Simple processing logic
        if not user_input:
            result = "No input provided"
        elif user_input.lower() in ["hello", "hi", "hey"]:
            result = "Hello! Nice to meet you."
        elif user_input.lower() in ["bye", "goodbye", "exit"]:
            result = "Goodbye! Have a great day."
        elif user_input.isdigit():
            number = int(user_input)
            result = f"You entered the number {number}. Its square is {number ** 2}."
        else:
            result = f"You said: '{user_input}'. That's interesting!"
        
        # Add messages to conversation
        new_messages = [
            HumanMessage(content=user_input) if user_input else SystemMessage(content="No input"),
            AIMessage(content=result)
        ]
        
        return {
            **state,
            "current_step": "processed",
            "step_count": state["step_count"] + 1,
            "messages": state["messages"] + new_messages,
            "result": result,
            "metadata": {
                **state["metadata"],
                "processed_at": datetime.now().isoformat()
            }
        }
    
    def finalize_node(state: BasicState) -> BasicState:
        """Finalize the workflow"""
        print(f"✅ Finalizing workflow after {state['step_count']} steps")
        
        return {
            **state,
            "current_step": "completed",
            "step_count": state["step_count"] + 1,
            "metadata": {
                **state["metadata"],
                "completed_at": datetime.now().isoformat(),
                "total_messages": len(state["messages"])
            }
        }
    
    def should_continue(state: BasicState) -> str:
        """Decide whether to continue processing or end"""
        user_input = state.get("user_input", "").lower()
        
        if user_input in ["bye", "goodbye", "exit", "quit"]:
            return "finalize"
        else:
            return "continue"
    
    # Create the graph
    workflow = StateGraph(BasicState)
    
    # Add nodes
    workflow.add_node("start", start_node)
    workflow.add_node("process", process_input_node)
    workflow.add_node("finalize", finalize_node)
    
    # Add edges
    workflow.add_edge(START, "start")
    workflow.add_edge("start", "process")
    
    # Add conditional edge
    workflow.add_conditional_edges(
        "process",
        should_continue,
        {
            "continue": END,  # End but allow re-entry
            "finalize": "finalize"
        }
    )
    workflow.add_edge("finalize", END)
    
    return workflow.compile()


def create_counter_workflow():
    """Create a counter workflow demonstrating state management"""
    
    def increment_node(state: CounterState) -> CounterState:
        """Increment the counter"""
        new_count = state["count"] + 1
        
        print(f"➕ Incrementing: {state['count']} → {new_count}")
        
        history_entry = {
            "operation": "increment",
            "from": state["count"],
            "to": new_count,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            **state,
            "count": new_count,
            "history": state["history"] + [history_entry],
            "is_complete": new_count >= state["target"]
        }
    
    def decrement_node(state: CounterState) -> CounterState:
        """Decrement the counter"""
        new_count = state["count"] - 1
        
        print(f"➖ Decrementing: {state['count']} → {new_count}")
        
        history_entry = {
            "operation": "decrement", 
            "from": state["count"],
            "to": new_count,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            **state,
            "count": new_count,
            "history": state["history"] + [history_entry],
            "is_complete": new_count <= 0
        }
    
    def reset_node(state: CounterState) -> CounterState:
        """Reset the counter"""
        print(f"🔄 Resetting: {state['count']} → 0")
        
        history_entry = {
            "operation": "reset",
            "from": state["count"],
            "to": 0,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            **state,
            "count": 0,
            "history": state["history"] + [history_entry],
            "is_complete": False
        }
    
    def check_completion_node(state: CounterState) -> CounterState:
        """Check if counter operation is complete"""
        if state["is_complete"]:
            print(f"🎯 Target reached! Final count: {state['count']}")
        else:
            print(f"🔄 Continuing... Current count: {state['count']}, Target: {state['target']}")
        
        return state
    
    def route_operation(state: CounterState) -> str:
        """Route based on the operation type"""
        operation = state["operation"]
        
        if operation == "increment":
            return "increment"
        elif operation == "decrement":
            return "decrement" 
        elif operation == "reset":
            return "reset"
        else:
            return "check"
    
    def check_if_done(state: CounterState) -> str:
        """Check if we should continue or end"""
        if state["is_complete"]:
            return END
        else:
            return "check"
    
    # Create the graph
    workflow = StateGraph(CounterState)
    
    # Add nodes
    workflow.add_node("increment", increment_node)
    workflow.add_node("decrement", decrement_node)
    workflow.add_node("reset", reset_node)
    workflow.add_node("check", check_completion_node)
    
    # Add conditional edges
    workflow.add_conditional_edges(
        START,
        route_operation,
        {
            "increment": "increment",
            "decrement": "decrement",
            "reset": "reset",
            "check": "check"
        }
    )
    
    workflow.add_conditional_edges(
        "increment",
        check_if_done,
        {
            "check": "check",
            END: END
        }
    )
    
    workflow.add_conditional_edges(
        "decrement",
        check_if_done,
        {
            "check": "check", 
            END: END
        }
    )
    
    workflow.add_edge("reset", "check")
    workflow.add_edge("check", END)
    
    return workflow.compile()


def create_validation_workflow():
    """Create an input validation workflow"""
    
    def validate_email_node(state: ValidationState) -> ValidationState:
        """Validate email format"""
        import re
        
        user_input = state["user_input"]
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        is_valid_email = bool(re.match(email_pattern, user_input))
        
        print(f"📧 Validating email: {user_input}")
        print(f"   Valid: {'✅' if is_valid_email else '❌'}")
        
        validation_results = state["validation_results"].copy()
        validation_results["email_format"] = is_valid_email
        
        error_messages = state["error_messages"].copy()
        if not is_valid_email:
            error_messages.append("Invalid email format")
        
        return {
            **state,
            "validation_results": validation_results,
            "error_messages": error_messages,
            "is_valid": is_valid_email and state["is_valid"]
        }
    
    def validate_length_node(state: ValidationState) -> ValidationState:
        """Validate input length"""
        user_input = state["user_input"]
        min_length = 5
        max_length = 100
        
        is_valid_length = min_length <= len(user_input) <= max_length
        
        print(f"📏 Validating length: {len(user_input)} characters")
        print(f"   Valid range: {min_length}-{max_length}")
        print(f"   Valid: {'✅' if is_valid_length else '❌'}")
        
        validation_results = state["validation_results"].copy()
        validation_results["length"] = {
            "value": len(user_input),
            "min": min_length,
            "max": max_length,
            "valid": is_valid_length
        }
        
        error_messages = state["error_messages"].copy()
        if not is_valid_length:
            if len(user_input) < min_length:
                error_messages.append(f"Input too short (minimum {min_length} characters)")
            else:
                error_messages.append(f"Input too long (maximum {max_length} characters)")
        
        return {
            **state,
            "validation_results": validation_results,
            "error_messages": error_messages,
            "is_valid": is_valid_length and state["is_valid"]
        }
    
    def process_valid_input_node(state: ValidationState) -> ValidationState:
        """Process valid input"""
        user_input = state["user_input"]
        
        print(f"✅ Processing valid input: {user_input}")
        
        # Extract useful data from the email
        username, domain = user_input.split("@")
        domain_parts = domain.split(".")
        
        processed_data = {
            "email": user_input,
            "username": username,
            "domain": domain,
            "domain_extension": domain_parts[-1] if domain_parts else "",
            "provider": domain_parts[0] if domain_parts else "",
            "processed_at": datetime.now().isoformat()
        }
        
        return {
            **state,
            "processed_data": processed_data
        }
    
    def handle_invalid_input_node(state: ValidationState) -> ValidationState:
        """Handle invalid input"""
        print(f"❌ Input validation failed:")
        for error in state["error_messages"]:
            print(f"   - {error}")
        
        return state
    
    def determine_validation_result(state: ValidationState) -> str:
        """Determine next step based on validation result"""
        if state["is_valid"]:
            return "process_valid"
        else:
            return "handle_invalid"
    
    # Create the graph
    workflow = StateGraph(ValidationState)
    
    # Add nodes
    workflow.add_node("validate_email", validate_email_node)
    workflow.add_node("validate_length", validate_length_node)
    workflow.add_node("process_valid", process_valid_input_node)
    workflow.add_node("handle_invalid", handle_invalid_input_node)
    
    # Add edges
    workflow.add_edge(START, "validate_email")
    workflow.add_edge("validate_email", "validate_length")
    
    # Add conditional edge based on validation results
    workflow.add_conditional_edges(
        "validate_length",
        determine_validation_result,
        {
            "process_valid": "process_valid",
            "handle_invalid": "handle_invalid"
        }
    )
    
    workflow.add_edge("process_valid", END)
    workflow.add_edge("handle_invalid", END)
    
    return workflow.compile()


def basic_graph_examples():
    """Demonstrate basic graph workflows"""
    print("=== Basic LangGraph Examples ===\n")
    
    # Basic Workflow Example
    print("--- Basic Workflow ---")
    basic_graph = create_basic_workflow()
    
    test_inputs = ["Hello", "42", "What's the weather like?", "goodbye"]
    
    for user_input in test_inputs:
        print(f"\n🔹 Testing input: '{user_input}'")
        
        initial_state: BasicState = {
            "messages": [],
            "current_step": "",
            "step_count": 0,
            "user_input": user_input,
            "result": None,
            "metadata": {}
        }
        
        result = basic_graph.invoke(initial_state)
        print(f"   Result: {result['result']}")
        print(f"   Steps: {result['step_count']}")
        print(f"   Status: {result['current_step']}")
    
    # Counter Workflow Example
    print("\n--- Counter Workflow ---")
    counter_graph = create_counter_workflow()
    
    counter_tests = [
        {"count": 0, "target": 3, "operation": "increment"},
        {"count": 5, "target": 0, "operation": "decrement"},
        {"count": 10, "target": 5, "operation": "reset"}
    ]
    
    for test in counter_tests:
        print(f"\n🔹 Testing counter: {test}")
        
        initial_state: CounterState = {
            "count": test["count"],
            "target": test["target"], 
            "operation": test["operation"],
            "history": [],
            "is_complete": False
        }
        
        result = counter_graph.invoke(initial_state)
        print(f"   Final count: {result['count']}")
        print(f"   Operations: {len(result['history'])}")
        print(f"   Complete: {result['is_complete']}")
        
        # Show history
        for entry in result['history']:
            print(f"   History: {entry['operation']} {entry['from']} → {entry['to']}")
    
    # Validation Workflow Example
    print("\n--- Validation Workflow ---")
    validation_graph = create_validation_workflow()
    
    validation_tests = [
        "alice@example.com",
        "invalid-email",
        "toolong@" + "x" * 100 + ".com",
        "bob@company.org"
    ]
    
    for test_input in validation_tests:
        print(f"\n🔹 Testing validation: '{test_input}'")
        
        initial_state: ValidationState = {
            "user_input": test_input,
            "validation_results": {},
            "is_valid": True,  # Start optimistic
            "error_messages": [],
            "processed_data": None
        }
        
        result = validation_graph.invoke(initial_state)
        print(f"   Valid: {'✅' if result['is_valid'] else '❌'}")
        
        if result["error_messages"]:
            for error in result["error_messages"]:
                print(f"   Error: {error}")
        
        if result["processed_data"]:
            print(f"   Processed: {result['processed_data']['username']}@{result['processed_data']['domain']}")


def graph_debugging_examples():
    """Demonstrate debugging techniques for LangGraph"""
    print("\n=== Graph Debugging Examples ===\n")
    
    # Create a simple graph for debugging
    def debug_state(state: BasicState) -> BasicState:
        """Node that shows current state"""
        print(f"🔍 DEBUG STATE:")
        print(f"   Current step: {state.get('current_step', 'Unknown')}")
        print(f"   Step count: {state.get('step_count', 0)}")
        print(f"   Messages: {len(state.get('messages', []))}")
        print(f"   User input: {state.get('user_input', 'None')}")
        print(f"   Metadata keys: {list(state.get('metadata', {}).keys())}")
        
        return state
    
    # Create debug graph
    debug_graph = StateGraph(BasicState)
    debug_graph.add_node("debug", debug_state)
    debug_graph.add_edge(START, "debug")
    debug_graph.add_edge("debug", END)
    
    compiled_debug = debug_graph.compile()
    
    # Test with sample state
    test_state: BasicState = {
        "messages": [HumanMessage(content="test")],
        "current_step": "debugging",
        "step_count": 1,
        "user_input": "debug test",
        "result": "debugging...",
        "metadata": {"debug": True, "timestamp": datetime.now().isoformat()}
    }
    
    print("Running debug graph:")
    compiled_debug.invoke(test_state)
    
    # Show graph structure information
    print(f"\n📊 Graph Structure Information:")
    basic_graph = create_basic_workflow()
    
    # Note: In a real scenario, you might want to access graph internals
    # For now, we'll just demonstrate the concept
    print(f"   Graph type: {type(basic_graph).__name__}")
    print(f"   Available for execution: ✅")


if __name__ == "__main__":
    basic_graph_examples()
    graph_debugging_examples()