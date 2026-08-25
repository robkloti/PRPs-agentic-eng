"""
Project 3: AI Agent with Tools - Calculator Tool
===============================================

Learning objectives:
- Implement safe expression evaluation
- Handle mathematical operations with validation
- Practice error handling and result formatting
- Learn tool safety and security patterns
"""

import ast
import math
import operator
from typing import Dict, Any, List, Optional, Union
from decimal import Decimal, InvalidOperation
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator
import re


class OperationType(str, Enum):
    """Types of mathematical operations"""
    BASIC = "basic"  # +, -, *, /
    ADVANCED = "advanced"  # pow, sqrt, log, etc.
    TRIGONOMETRIC = "trigonometric"  # sin, cos, tan, etc.
    STATISTICAL = "statistical"  # mean, median, std, etc.
    FINANCIAL = "financial"  # compound interest, present value, etc.


class NumberFormat(str, Enum):
    """Number formatting options"""
    DECIMAL = "decimal"
    SCIENTIFIC = "scientific"
    PERCENTAGE = "percentage"
    CURRENCY = "currency"
    FRACTION = "fraction"


class CalculationResult(BaseModel):
    """Result of a calculation"""
    expression: str = Field(..., description="Original expression")
    result: Union[float, int, str] = Field(..., description="Calculated result")
    result_type: str = Field(..., description="Type of result")
    formatted_result: str = Field(..., description="Human-readable result")
    operation_type: OperationType = Field(...)
    precision: int = Field(default=10, ge=0, le=50)
    execution_time: float = Field(..., ge=0.0)
    warnings: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list, description="Calculation steps")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def is_integer(self) -> bool:
        """Check if result is an integer"""
        return isinstance(self.result, int) or (isinstance(self.result, float) and self.result.is_integer())
    
    @property
    def is_exact(self) -> bool:
        """Check if result is exact (no warnings about precision)"""
        return not any("precision" in warning.lower() for warning in self.warnings)


class SafeCalculator:
    """Safe mathematical expression evaluator"""
    
    # Allowed operations
    SAFE_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.Mod: operator.mod,
        ast.FloorDiv: operator.floordiv,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    
    # Allowed mathematical functions
    SAFE_FUNCTIONS = {
        'abs': abs,
        'round': round,
        'min': min,
        'max': max,
        'sum': sum,
        'pow': pow,
        'sqrt': math.sqrt,
        'exp': math.exp,
        'log': math.log,
        'log10': math.log10,
        'log2': math.log2,
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'asin': math.asin,
        'acos': math.acos,
        'atan': math.atan,
        'sinh': math.sinh,
        'cosh': math.cosh,
        'tanh': math.tanh,
        'degrees': math.degrees,
        'radians': math.radians,
        'ceil': math.ceil,
        'floor': math.floor,
        'factorial': math.factorial,
        'gcd': math.gcd,
    }
    
    # Mathematical constants
    SAFE_CONSTANTS = {
        'pi': math.pi,
        'e': math.e,
        'tau': math.tau,
        'inf': math.inf,
        'nan': math.nan,
    }
    
    def __init__(self, max_result_size: float = 1e15, precision: int = 10):
        self.max_result_size = max_result_size
        self.precision = precision
    
    def evaluate(self, expression: str) -> CalculationResult:
        """Safely evaluate a mathematical expression"""
        import time
        start_time = time.time()
        
        try:
            # Clean and validate the expression
            cleaned_expr = self._clean_expression(expression)
            
            # Parse the expression into an AST
            tree = ast.parse(cleaned_expr, mode='eval')
            
            # Evaluate the AST safely
            result = self._eval_ast(tree.body)
            
            # Validate result size
            if isinstance(result, (int, float)) and abs(result) > self.max_result_size:
                raise ValueError(f"Result too large: {result}")
            
            # Determine operation type
            op_type = self._determine_operation_type(cleaned_expr)
            
            # Format result
            formatted = self._format_result(result, NumberFormat.DECIMAL)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Build result object
            calc_result = CalculationResult(
                expression=expression,
                result=result,
                result_type=type(result).__name__,
                formatted_result=formatted,
                operation_type=op_type,
                precision=self.precision,
                execution_time=execution_time,
                steps=[f"Evaluated: {cleaned_expr}"]
            )
            
            # Add warnings if needed
            if isinstance(result, float):
                if math.isinf(result):
                    calc_result.warnings.append("Result is infinite")
                elif math.isnan(result):
                    calc_result.warnings.append("Result is not a number (NaN)")
                elif abs(result) < 1e-15:
                    calc_result.warnings.append("Result is very close to zero")
                elif abs(result) > 1e12:
                    calc_result.warnings.append("Result is very large")
            
            return calc_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            return CalculationResult(
                expression=expression,
                result=str(e),
                result_type="error",
                formatted_result=f"Error: {str(e)}",
                operation_type=OperationType.BASIC,
                execution_time=execution_time,
                warnings=[f"Calculation failed: {str(e)}"]
            )
    
    def _clean_expression(self, expr: str) -> str:
        """Clean and validate the expression"""
        # Remove whitespace
        expr = expr.strip()
        
        if not expr:
            raise ValueError("Empty expression")
        
        # Replace common symbols
        replacements = {
            '×': '*',
            '÷': '/',
            '√': 'sqrt',
            '²': '**2',
            '³': '**3',
        }
        
        for old, new in replacements.items():
            expr = expr.replace(old, new)
        
        # Add implicit multiplication (e.g., "2pi" -> "2*pi")
        expr = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', expr)
        expr = re.sub(r'([a-zA-Z])(\d)', r'\1*\2', expr)
        
        # Validate characters (only allow safe characters including spaces)
        allowed_chars = set('0123456789+-*/().,abcdefghijklmnopqrstuvwxyz_ ')
        if not set(expr.lower()).issubset(allowed_chars):
            invalid_chars = set(expr.lower()) - allowed_chars
            raise ValueError(f"Invalid characters in expression: {invalid_chars}")
        
        return expr
    
    def _eval_ast(self, node: ast.AST) -> Union[int, float]:
        """Recursively evaluate AST nodes"""
        
        if isinstance(node, ast.Constant):
            return node.value
        
        elif isinstance(node, ast.Num):  # For older Python versions
            return node.n
        
        elif isinstance(node, ast.Name):
            if node.id in self.SAFE_CONSTANTS:
                return self.SAFE_CONSTANTS[node.id]
            else:
                raise ValueError(f"Unknown variable: {node.id}")
        
        elif isinstance(node, ast.BinOp):
            left = self._eval_ast(node.left)
            right = self._eval_ast(node.right)
            op = type(node.op)
            
            if op not in self.SAFE_OPERATORS:
                raise ValueError(f"Unsafe operation: {op.__name__}")
            
            # Special handling for division by zero
            if op == ast.Div and right == 0:
                raise ValueError("Division by zero")
            
            return self.SAFE_OPERATORS[op](left, right)
        
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_ast(node.operand)
            op = type(node.op)
            
            if op not in self.SAFE_OPERATORS:
                raise ValueError(f"Unsafe unary operation: {op.__name__}")
            
            return self.SAFE_OPERATORS[op](operand)
        
        elif isinstance(node, ast.Call):
            if node.func.id not in self.SAFE_FUNCTIONS:
                raise ValueError(f"Unknown function: {node.func.id}")
            
            func = self.SAFE_FUNCTIONS[node.func.id]
            args = [self._eval_ast(arg) for arg in node.args]
            
            # Special validation for some functions
            if node.func.id == 'factorial' and (not isinstance(args[0], int) or args[0] < 0 or args[0] > 20):
                raise ValueError("Factorial only supports non-negative integers <= 20")
            
            if node.func.id in ['log', 'log10', 'log2'] and args[0] <= 0:
                raise ValueError("Logarithm requires positive argument")
            
            if node.func.id == 'sqrt' and args[0] < 0:
                raise ValueError("Square root requires non-negative argument")
            
            return func(*args)
        
        elif isinstance(node, ast.List):
            return [self._eval_ast(elem) for elem in node.elts]
        
        else:
            raise ValueError(f"Unsupported AST node: {type(node).__name__}")
    
    def _determine_operation_type(self, expr: str) -> OperationType:
        """Determine the type of operation being performed"""
        expr_lower = expr.lower()
        
        trig_functions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh']
        if any(func in expr_lower for func in trig_functions):
            return OperationType.TRIGONOMETRIC
        
        advanced_functions = ['sqrt', 'exp', 'log', 'pow', 'factorial']
        if any(func in expr_lower for func in advanced_functions):
            return OperationType.ADVANCED
        
        return OperationType.BASIC
    
    def _format_result(self, result: Union[int, float], format_type: NumberFormat) -> str:
        """Format the result for display"""
        if isinstance(result, str):  # Error case
            return result
        
        if format_type == NumberFormat.DECIMAL:
            if isinstance(result, int) or (isinstance(result, float) and result.is_integer()):
                return str(int(result))
            else:
                return f"{result:.{self.precision}g}"
        
        elif format_type == NumberFormat.SCIENTIFIC:
            return f"{result:.{self.precision}e}"
        
        elif format_type == NumberFormat.PERCENTAGE:
            return f"{result * 100:.{self.precision}g}%"
        
        elif format_type == NumberFormat.CURRENCY:
            return f"${result:,.{min(2, self.precision)}f}"
        
        else:
            return str(result)


class StatisticalCalculator:
    """Calculator for statistical operations"""
    
    @staticmethod
    def calculate_mean(numbers: List[Union[int, float]]) -> float:
        """Calculate arithmetic mean"""
        if not numbers:
            raise ValueError("Cannot calculate mean of empty list")
        return sum(numbers) / len(numbers)
    
    @staticmethod
    def calculate_median(numbers: List[Union[int, float]]) -> float:
        """Calculate median"""
        if not numbers:
            raise ValueError("Cannot calculate median of empty list")
        
        sorted_numbers = sorted(numbers)
        n = len(sorted_numbers)
        
        if n % 2 == 0:
            return (sorted_numbers[n//2 - 1] + sorted_numbers[n//2]) / 2
        else:
            return sorted_numbers[n//2]
    
    @staticmethod
    def calculate_std_dev(numbers: List[Union[int, float]], population: bool = False) -> float:
        """Calculate standard deviation"""
        if len(numbers) < 2:
            raise ValueError("Standard deviation requires at least 2 numbers")
        
        mean = StatisticalCalculator.calculate_mean(numbers)
        variance = sum((x - mean) ** 2 for x in numbers)
        
        if population:
            variance /= len(numbers)
        else:
            variance /= (len(numbers) - 1)
        
        return math.sqrt(variance)
    
    @staticmethod
    def calculate_stats(numbers: List[Union[int, float]]) -> Dict[str, float]:
        """Calculate comprehensive statistics"""
        if not numbers:
            raise ValueError("Cannot calculate statistics for empty list")
        
        return {
            'count': len(numbers),
            'sum': sum(numbers),
            'mean': StatisticalCalculator.calculate_mean(numbers),
            'median': StatisticalCalculator.calculate_median(numbers),
            'min': min(numbers),
            'max': max(numbers),
            'range': max(numbers) - min(numbers),
            'std_dev': StatisticalCalculator.calculate_std_dev(numbers),
            'variance': StatisticalCalculator.calculate_std_dev(numbers) ** 2
        }


class FinancialCalculator:
    """Calculator for financial operations"""
    
    @staticmethod
    def compound_interest(principal: float, rate: float, time: float, 
                        compounds_per_year: int = 1) -> Dict[str, float]:
        """Calculate compound interest"""
        if principal <= 0 or rate < 0 or time < 0:
            raise ValueError("Invalid parameters for compound interest")
        
        amount = principal * (1 + rate / compounds_per_year) ** (compounds_per_year * time)
        interest = amount - principal
        
        return {
            'principal': principal,
            'rate': rate,
            'time': time,
            'compounds_per_year': compounds_per_year,
            'final_amount': amount,
            'interest_earned': interest,
            'effective_rate': (amount / principal) ** (1/time) - 1 if time > 0 else 0
        }
    
    @staticmethod
    def present_value(future_value: float, rate: float, time: float) -> float:
        """Calculate present value"""
        if rate < 0 or time < 0:
            raise ValueError("Rate and time must be non-negative")
        
        return future_value / (1 + rate) ** time
    
    @staticmethod
    def loan_payment(principal: float, rate: float, periods: int) -> Dict[str, float]:
        """Calculate loan payment (monthly)"""
        if principal <= 0 or rate < 0 or periods <= 0:
            raise ValueError("Invalid loan parameters")
        
        if rate == 0:
            payment = principal / periods
            total_paid = principal
            total_interest = 0
        else:
            payment = principal * (rate * (1 + rate) ** periods) / ((1 + rate) ** periods - 1)
            total_paid = payment * periods
            total_interest = total_paid - principal
        
        return {
            'principal': principal,
            'monthly_payment': payment,
            'total_paid': total_paid,
            'total_interest': total_interest,
            'periods': periods
        }


# Tool interface functions
def calculate(expression: str, precision: int = 10) -> Dict[str, Any]:
    """Main calculation function for tool calling"""
    calculator = SafeCalculator(precision=precision)
    result = calculator.evaluate(expression)
    
    return {
        "expression": result.expression,
        "result": result.result,
        "formatted_result": result.formatted_result,
        "operation_type": result.operation_type.value,
        "execution_time": result.execution_time,
        "warnings": result.warnings,
        "is_exact": result.is_exact,
        "timestamp": result.timestamp.isoformat()
    }


def calculate_statistics(numbers: List[float]) -> Dict[str, Any]:
    """Statistical calculation function for tool calling"""
    try:
        stats = StatisticalCalculator.calculate_stats(numbers)
        return {
            "numbers_count": len(numbers),
            "statistics": stats,
            "success": True
        }
    except Exception as e:
        return {
            "error": str(e),
            "success": False
        }


def calculate_compound_interest(principal: float, rate: float, time: float, 
                              compounds_per_year: int = 12) -> Dict[str, Any]:
    """Financial calculation function for tool calling"""
    try:
        result = FinancialCalculator.compound_interest(principal, rate, time, compounds_per_year)
        return {
            "calculation_type": "compound_interest",
            "result": result,
            "success": True
        }
    except Exception as e:
        return {
            "error": str(e),
            "success": False
        }


def calculator_examples():
    """Demonstrate calculator functionality"""
    print("=== Calculator Tool Examples ===")
    
    calculator = SafeCalculator(precision=6)
    
    # Basic calculations
    print("\n--- Basic Calculations ---")
    basic_tests = [
        "2 + 3 * 4",
        "(10 - 2) / 4",
        "2**3 + sqrt(16)",
        "sin(pi/2) + cos(0)",
        "log(e) + log10(100)",
        "factorial(5)"
    ]
    
    for expr in basic_tests:
        result = calculator.evaluate(expr)
        print(f"  {expr} = {result.formatted_result}")
        if result.warnings:
            for warning in result.warnings:
                print(f"    ⚠️  {warning}")
    
    # Error handling
    print("\n--- Error Handling ---")
    error_tests = [
        "1/0",  # Division by zero
        "sqrt(-1)",  # Invalid sqrt
        "unknown_function(5)",  # Unknown function
        "factorial(-1)",  # Invalid factorial
        "log(0)"  # Invalid log
    ]
    
    for expr in error_tests:
        result = calculator.evaluate(expr)
        print(f"  {expr} → {result.formatted_result}")
    
    # Statistical calculations
    print("\n--- Statistical Calculations ---")
    numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    stats = StatisticalCalculator.calculate_stats(numbers)
    
    print(f"  Numbers: {numbers}")
    print(f"  Mean: {stats['mean']:.2f}")
    print(f"  Median: {stats['median']:.2f}")
    print(f"  Std Dev: {stats['std_dev']:.2f}")
    print(f"  Range: {stats['range']}")
    
    # Financial calculations
    print("\n--- Financial Calculations ---")
    compound_result = FinancialCalculator.compound_interest(
        principal=1000, 
        rate=0.05, 
        time=10, 
        compounds_per_year=12
    )
    
    print(f"  Investment: ${compound_result['principal']:,.2f}")
    print(f"  Rate: {compound_result['rate']:.1%} annual")
    print(f"  Time: {compound_result['time']} years")
    print(f"  Final Amount: ${compound_result['final_amount']:,.2f}")
    print(f"  Interest Earned: ${compound_result['interest_earned']:,.2f}")
    
    # Tool interface demonstration
    print("\n--- Tool Interface ---")
    tool_result = calculate("sqrt(2) * pi", precision=8)
    print(f"  Tool result: {tool_result}")
    
    stats_result = calculate_statistics([1, 4, 9, 16, 25])
    print(f"  Stats result: {stats_result['statistics']['mean']:.2f}")
    
    finance_result = calculate_compound_interest(5000, 0.07, 5)
    print(f"  Finance result: ${finance_result['result']['final_amount']:,.2f}")


if __name__ == "__main__":
    calculator_examples()