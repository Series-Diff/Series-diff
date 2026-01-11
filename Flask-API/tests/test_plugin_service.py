"""
Unit tests for plugin_service.py

Tests the plugin validation and execution service.
"""

import unittest
import textwrap
from unittest.mock import patch, MagicMock

from services.plugin_service import validate_plugin_code, execute_plugin_code


class TestValidatePluginCode(unittest.TestCase):
    """Tests for the validate_plugin_code function."""

    def test_valid_plugin_code(self):
        """Test validation of a simple valid plugin."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   return sum(series1.values()) - sum(series2.values())
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertTrue(result["valid"])
        self.assertNotIn("error", result)

    def test_valid_plugin_with_imports(self):
        """Test validation of plugin with allowed imports."""
        # Arrange
        code = """
               import numpy as np

               def calculate(series1, series2):
                   return np.mean(list(series1.values())) - np.mean(list(series2.values()))
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertTrue(result["valid"])

    def test_missing_calculate_function(self):
        """Test rejection of plugin without calculate function."""
        # Arrange
        code = """
               def compute(series1, series2):
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("must define", result["error"])

    def test_syntax_error(self):
        """Test rejection of plugin with syntax error."""
        # Arrange
        code = """
               def calculate(series1, series2)
                   return 0  # Missing colon
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Syntax error", result["error"])

    # Tests for dangerous patterns
    def test_forbidden_open_file(self):
        """Test rejection of code attempting to open files."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   with open('secret.txt', 'r') as f:
                       return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_import_os(self):
        """Test rejection of code importing os module."""
        # Arrange
        code = """
               import os

               def calculate(series1, series2):
                   os.system('rm -rf /')
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_import_subprocess(self):
        """Test rejection of code importing subprocess module."""
        # Arrange
        code = """
               import subprocess

               def calculate(series1, series2):
                   subprocess.run(['ls'])
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_exec(self):
        """Test rejection of code using exec."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   exec("import os")
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_eval(self):
        """Test rejection of code using eval."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   return eval("1+1")
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_builtins_access(self):
        """Test rejection of code accessing __builtins__."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   return __builtins__['open']('file.txt')
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_import_requests(self):
        """Test rejection of code importing requests library."""
        # Arrange
        code = """
               import requests

               def calculate(series1, series2):
                   requests.get('http://evil.com')
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_import_socket(self):
        """Test rejection of code importing socket module."""
        # Arrange
        code = """
               import socket

               def calculate(series1, series2):
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_dunder_import(self):
        """Test rejection of code using __import__."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   os = __import__('os')
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_class_introspection(self):
        """Test rejection of code using __class__ introspection."""
        # Arrange
        code = """
               def calculate(series1, series2):
                   return "".__class__.__bases__[0].__subclasses__()
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])

    def test_forbidden_from_os_import(self):
        """Test rejection of 'from os import' pattern."""
        # Arrange
        code = """
               from os import system

               def calculate(series1, series2):
                   system('whoami')
                   return 0
               """
        # Act
        result = validate_plugin_code(code)

        # Assert
        self.assertFalse(result["valid"])
        self.assertIn("Forbidden pattern", result["error"])


class TestExecutePluginCode(unittest.TestCase):
    """Tests for the execute_plugin_code function."""

    def test_execute_invalid_code_returns_error(self):
        """Test that invalid code returns validation error."""
        # Arrange
        invalid_code = """
                       import os

                       def calculate(series1, series2):
                           return 0
                       """
        series1 = {"2023-01-01": 1.0}
        series2 = {"2023-01-01": 2.0}

        # Act
        result = execute_plugin_code(invalid_code, series1, series2)

        # Assert
        self.assertIn("error", result)
        self.assertIn("Forbidden pattern", result["error"])

    @patch("services.sandboxed_executor.get_executor")
    def test_execute_valid_code_calls_executor(self, mock_get_executor):
        """Test that valid code is passed to sandboxed executor."""
        # Arrange
        valid_code = """
                     def calculate(series1, series2):
                         return 42.0
                     """
        series1 = {"2023-01-01": 1.0, "2023-01-02": 2.0}
        series2 = {"2023-01-01": 3.0, "2023-01-02": 4.0}

        mock_executor = MagicMock()
        mock_executor.execute.return_value = {"result": 42.0}
        mock_get_executor.return_value = mock_executor

        # Act
        result = execute_plugin_code(valid_code, series1, series2)

        # Assert
        mock_get_executor.assert_called_once()
        mock_executor.execute.assert_called_once()
        self.assertEqual(result, {"result": 42.0})

    @patch("services.sandboxed_executor.get_executor")
    def test_execute_with_pandas_series_converts_to_dict(self, mock_get_executor):
        """Test that pandas Series inputs are converted to dicts."""
        # Arrange
        valid_code = """
                     def calculate(series1, series2):
                         return len(series1)
                     """
        # Create mock Series-like objects with to_dict method
        mock_series1 = MagicMock()
        mock_series1.to_dict.return_value = {"2023-01-01": 1.0}

        mock_series2 = MagicMock()
        mock_series2.to_dict.return_value = {"2023-01-01": 2.0}

        mock_executor = MagicMock()
        mock_executor.execute.return_value = {"result": 1}
        mock_get_executor.return_value = mock_executor

        # Act
        result = execute_plugin_code(valid_code, mock_series1, mock_series2)

        # Assert
        mock_series1.to_dict.assert_called_once()
        mock_series2.to_dict.assert_called_once()
        # Verify the executor receives dict versions
        call_args = mock_executor.execute.call_args
        pairs = call_args[0][1]
        self.assertEqual(pairs[0]["series1"], {"2023-01-01": 1.0})
        self.assertEqual(pairs[0]["series2"], {"2023-01-01": 2.0})
        self.assertEqual(result, {"result": 1})

    @patch("services.sandboxed_executor.get_executor")
    def test_execute_passes_correct_pairs_format(self, mock_get_executor):
        """Test that pairs are passed in correct format to executor."""
        # Arrange
        valid_code = """
                     def calculate(series1, series2):
                         return 0
                     """
        series1 = {"a": 1}
        series2 = {"b": 2}

        mock_executor = MagicMock()
        mock_executor.execute.return_value = {"result": 0}
        mock_get_executor.return_value = mock_executor

        # Act
        execute_plugin_code(valid_code, series1, series2)

        # Assert
        call_args = mock_executor.execute.call_args
        code_arg, pairs_arg = call_args[0]
        # Code is normalized (dedented) before execution
        self.assertEqual(code_arg, textwrap.dedent(valid_code).strip())
        self.assertEqual(len(pairs_arg), 1)
        self.assertEqual(pairs_arg[0]["key"], "single_run")
        self.assertEqual(pairs_arg[0]["series1"], {"a": 1})
        self.assertEqual(pairs_arg[0]["series2"], {"b": 2})


if __name__ == "__main__":
    unittest.main()
