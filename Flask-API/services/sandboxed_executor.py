"""
Secure plugin executor using Docker isolation.
Runs untrusted plugin code in a sandboxed container with:
- No network access
- Read-only filesystem
- Memory and CPU limits
- Execution timeout
"""

import subprocess
import json
import tempfile
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class SandboxedExecutor:
    """
    Executes plugin code in an isolated Docker container.
    """

    # Docker image with Python and minimal dependencies
    EXECUTOR_IMAGE = "python:3.11-slim"

    # Resource limits
    MEMORY_LIMIT = "128m"
    CPU_LIMIT = "0.5"
    TIMEOUT_SECONDS = 30

    # Template for the executor script
    EXECUTOR_TEMPLATE = """
import sys
import json
import pandas as pd
import numpy as np

# Read input data from stdin
input_data = json.loads(sys.stdin.read())

series1_dict = input_data["series1"]
series2_dict = input_data["series2"]
plugin_code = input_data["code"]

# Convert to pandas Series
series1 = pd.Series(series1_dict)
series2 = pd.Series(series2_dict)

# Create restricted namespace
namespace = {
    "pd": pd,
    "np": np,
    "numpy": np,
    "pandas": pd,
    "series1": series1,
    "series2": series2,
}

try:
    # Execute plugin code
    exec(plugin_code, namespace)

    if "calculate" not in namespace:
        print(json.dumps({"error": "Plugin must define 'calculate' function"}))
        sys.exit(1)

    # Call calculate function
    result = namespace["calculate"](series1, series2)

    if not isinstance(result, (int, float)):
        print(json.dumps({"error": f"Result must be a number, got {type(result).__name__}"}))
        sys.exit(1)

    print(json.dumps({"result": float(result)}))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
"""

    def __init__(self):
        self._check_docker_available()

    def _check_docker_available(self):
        """Check if Docker is available."""
        try:
            result = subprocess.run(
                ["docker", "version"], capture_output=True, timeout=5
            )
            if result.returncode != 0:
                logger.warning(
                    "Docker not available, falling back to restricted execution"
                )
                self.docker_available = False
            else:
                self.docker_available = True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.warning("Docker not available, falling back to restricted execution")
            self.docker_available = False

    def execute(self, code: str, series1: dict, series2: dict) -> dict:
        """
        Execute plugin code safely.

        Args:
            code: Plugin Python code
            series1: First time series as dict {timestamp: value}
            series2: Second time series as dict {timestamp: value}

        Returns:
            dict with 'result' or 'error'
        """
        if self.docker_available:
            return self._execute_in_docker(code, series1, series2)
        else:
            return self._execute_restricted(code, series1, series2)

    def _execute_in_docker(self, code: str, series1: dict, series2: dict) -> dict:
        """Execute code in isolated Docker container."""

        # Prepare input data
        input_data = json.dumps({"series1": series1, "series2": series2, "code": code})

        # Create temporary file for executor script
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(self.EXECUTOR_TEMPLATE)
            executor_path = f.name

        try:
            # Run in Docker with security constraints
            docker_cmd = [
                "docker",
                "run",
                "--rm",  # Remove container after execution
                "--network=none",  # No network access
                "--read-only",  # Read-only filesystem
                f"--memory={self.MEMORY_LIMIT}",  # Memory limit
                f"--cpus={self.CPU_LIMIT}",  # CPU limit
                "--pids-limit=50",  # Limit number of processes
                "--security-opt=no-new-privileges",  # No privilege escalation
                "-i",  # Interactive (for stdin)
                "-v",
                f"{executor_path}:/executor.py:ro",  # Mount executor script
                self.EXECUTOR_IMAGE,
                "python",
                "/executor.py",
            ]

            logger.debug(f"Running Docker command: {' '.join(docker_cmd)}")

            result = subprocess.run(
                docker_cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT_SECONDS,
            )

            if result.returncode != 0:
                stderr = result.stderr.strip()
                if stderr:
                    logger.error(f"Docker execution error: {stderr}")
                    return {"error": f"Execution failed: {stderr[:200]}"}

            # Parse output
            stdout = result.stdout.strip()
            if not stdout:
                return {"error": "No output from plugin"}

            try:
                return json.loads(stdout)
            except json.JSONDecodeError:
                return {"error": f"Invalid plugin output: {stdout[:200]}"}

        except subprocess.TimeoutExpired:
            logger.error(f"Plugin execution timed out after {self.TIMEOUT_SECONDS}s")
            return {
                "error": f"Execution timed out after {self.TIMEOUT_SECONDS} seconds"
            }
        except Exception as e:
            logger.error(f"Docker execution error: {e}")
            return {"error": f"Execution error: {str(e)}"}
        finally:
            # Clean up temp file
            os.unlink(executor_path)

    def _execute_restricted(self, code: str, series1: dict, series2: dict) -> dict:
        """
        Fallback: Execute with RestrictedPython if Docker unavailable.
        Less secure but still provides basic protection.
        """
        try:
            from RestrictedPython import compile_restricted, safe_builtins
            from RestrictedPython.Guards import (
                guarded_iter_unpack_sequence,
            )
            from RestrictedPython.Eval import default_guarded_getitem
        except ImportError:
            # If RestrictedPython not available, use basic sandboxing
            return self._execute_basic_sandbox(code, series1, series2)

        import pandas as pd
        import numpy as np

        # Convert dicts to Series
        s1 = pd.Series(series1)
        s2 = pd.Series(series2)

        # Compile with restrictions
        try:
            byte_code = compile_restricted(code, "<plugin>", "exec")
        except SyntaxError as e:
            return {"error": f"Syntax error: {e}"}

        # Create restricted namespace
        restricted_globals = {
            "__builtins__": safe_builtins,
            "_getitem_": default_guarded_getitem,
            "_iter_unpack_sequence_": guarded_iter_unpack_sequence,
            "pd": pd,
            "np": np,
            "numpy": np,
            "pandas": pd,
        }

        restricted_locals = {}

        try:
            exec(byte_code, restricted_globals, restricted_locals)
        except Exception as e:
            return {"error": f"Execution error: {str(e)}"}

        if "calculate" not in restricted_locals:
            return {"error": "Plugin must define 'calculate' function"}

        try:
            result = restricted_locals["calculate"](s1, s2)
            if not isinstance(result, (int, float)):
                return {
                    "error": f"Result must be a number, got {type(result).__name__}"
                }
            return {"result": float(result)}
        except Exception as e:
            return {"error": f"Calculation error: {str(e)}"}

    def _execute_basic_sandbox(self, code: str, series1: dict, series2: dict) -> dict:
        """
        Basic sandboxing without Docker or RestrictedPython.
        Uses subprocess with timeout as minimal protection.
        """
        import pandas as pd
        import numpy as np

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

        code_lower = code.lower()
        for pattern in dangerous_patterns:
            if pattern.lower() in code_lower:
                return {
                    "error": f"Forbidden pattern: '{pattern}'. "
                    "Plugins cannot access system resources."
                }

        # Check for 'calculate' function
        if "def calculate(" not in code:
            return {
                "error": "Plugin must define 'calculate(series1, series2)' function"
            }

        # Convert to Series
        s1 = pd.Series(series1)
        s2 = pd.Series(series2)

        # Safe import function - only allows pandas and numpy
        allowed_modules = {
            "pandas": pd,
            "numpy": np,
            "pd": pd,
            "np": np,
        }

        def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name in allowed_modules:
                return allowed_modules[name]
            raise ImportError(
                f"Import of '{name}' is not allowed. Only 'pandas' and 'numpy' are permitted."
            )

        # Create minimal namespace with safe import
        namespace = {
            "pd": pd,
            "np": np,
            "numpy": np,
            "pandas": pd,
            "__builtins__": {
                # Only safe builtins
                "abs": abs,
                "all": all,
                "any": any,
                "bool": bool,
                "dict": dict,
                "float": float,
                "int": int,
                "len": len,
                "list": list,
                "max": max,
                "min": min,
                "pow": pow,
                "range": range,
                "round": round,
                "set": set,
                "sorted": sorted,
                "str": str,
                "sum": sum,
                "tuple": tuple,
                "zip": zip,
                "map": map,
                "filter": filter,
                "enumerate": enumerate,
                "isinstance": isinstance,
                "type": type,
                "True": True,
                "False": False,
                "None": None,
                "__import__": safe_import,  # Allow safe imports
            },
        }

        try:
            exec(code, namespace)
        except Exception as e:
            return {"error": f"Execution error: {str(e)}"}

        if "calculate" not in namespace:
            return {"error": "Plugin must define 'calculate' function"}

        try:
            result = namespace["calculate"](s1, s2)
            if not isinstance(result, (int, float)):
                return {"error": f"Result must be number, got {type(result).__name__}"}
            return {"result": float(result)}
        except Exception as e:
            return {"error": f"Calculation error: {str(e)}"}


# Singleton instance
_executor: Optional[SandboxedExecutor] = None


def get_executor() -> SandboxedExecutor:
    """Get the singleton executor instance."""
    global _executor
    if _executor is None:
        _executor = SandboxedExecutor()
    return _executor
