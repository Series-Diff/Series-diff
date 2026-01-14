"""
Plugin service for validating and executing custom user-defined metrics.
Plugins are Python code snippets that can compute metrics on time series data.

NOTE: Plugins are stored on the frontend (localStorage) for privacy.
This service only handles validation and sandboxed execution.
"""

import textwrap


def validate_plugin_code(code: str) -> dict:
    """
    Validate plugin code for security and correctness.

    Args:
        code: Python code to validate

    Returns:
        dict with 'valid' (bool) and optionally 'error' (str)
    """
    # Normalize code: remove common leading indentation and leading/trailing newlines
    normalized_code = textwrap.dedent(code).strip()

    # Enhanced dangerous pattern check
    dangerous_patterns = [
        # File operations
        "open(",
        "open (",
        "file(",
        "with open",
        # System access
        "import os",
        "from os",
        "import sys",
        "from sys",
        "import subprocess",
        "from subprocess",
        "import shutil",
        "from shutil",
        "import socket",
        "from socket",
        "import requests",
        "from requests",
        "import urllib",
        "from urllib",
        "import builtins",
        "from builtins",
        # Code execution
        "exec(",
        "exec (",
        "eval(",
        "eval (",
        "__import__",
        "importlib",
        # Introspection attacks
        "__class__",
        "__bases__",
        "__subclasses__",
        "__globals__",
        "__code__",
        "__builtins__",
        # Shell access
        "os.system",
        "os.popen",
        "subprocess.",
        "commands.",
        "popen",
    ]

    code_lower = normalized_code.lower()
    for pattern in dangerous_patterns:
        if pattern.lower() in code_lower:
            return {
                "valid": False,
                "error": f"Forbidden pattern detected: '{pattern}'. "
                f"Plugins cannot access system resources.",
            }

    # Check that 'def calculate' exists
    if "def calculate(" not in normalized_code:
        return {
            "valid": False,
            "error": "Plugin must define a 'calculate(series1, series2)' function",
        }

    # Try to compile the code
    try:
        compile(normalized_code, "<plugin>", "exec")
    except SyntaxError as e:
        return {"valid": False, "error": f"Syntax error in plugin code: {e}"}

    return {"valid": True}


def execute_plugin_code(code: str, series1, series2) -> dict:
    """
    Execute plugin code on two time series using sandboxed execution.

    Args:
        code: Python code implementing the calculate function
        series1: First time series (dict or pd.Series)
        series2: Second time series (dict or pd.Series)

    Returns:
        dict with 'result' (float) or 'error' (str)
    """
    # Normalize and validate code before execution
    normalized_code = textwrap.dedent(code).strip()
    validation_result = validate_plugin_code(normalized_code)
    if not validation_result["valid"]:
        return {"error": validation_result["error"]}

    # Convert to dict if needed (for sandboxed execution)
    if hasattr(series1, "to_dict"):
        series1_dict = series1.to_dict()
    else:
        series1_dict = dict(series1) if not isinstance(series1, dict) else series1

    if hasattr(series2, "to_dict"):
        series2_dict = series2.to_dict()
    else:
        series2_dict = dict(series2) if not isinstance(series2, dict) else series2

    # Use sandboxed executor
    from services.sandboxed_executor import get_executor

    executor = get_executor()

    pairs = [{"series1": series1_dict, "series2": series2_dict, "key": "single_run"}]
    return executor.execute(normalized_code, pairs)
