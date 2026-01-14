"""
Unit tests for sandboxed_executor.py

Tests the SandboxedExecutor class for Docker and Lambda execution modes.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import subprocess

import services.sandboxed_executor as se
from services.sandboxed_executor import SandboxedExecutor, get_executor


class TestSandboxedExecutorInit(unittest.TestCase):
    """Tests for SandboxedExecutor initialization."""

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_init_docker_mode_available(self, mock_run):
        """Test initialization with Docker available."""
        # Arrange
        mock_run.return_value = MagicMock(returncode=0)

        # Act
        executor = SandboxedExecutor()

        # Assert
        self.assertTrue(executor.docker_available)
        self.assertFalse(executor.use_lambda)
        mock_run.assert_called()

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_init_docker_not_available(self, mock_run):
        """Test initialization when Docker is not available."""
        # Arrange
        mock_run.side_effect = FileNotFoundError("docker not found")

        # Act
        executor = SandboxedExecutor()

        # Assert
        self.assertFalse(executor.docker_available)
        self.assertFalse(executor.use_lambda)

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_init_docker_command_fails(self, mock_run):
        """Test initialization when Docker command fails."""
        # Arrange
        mock_run.side_effect = subprocess.CalledProcessError(1, "docker")

        # Act
        executor = SandboxedExecutor()

        # Assert
        self.assertFalse(executor.docker_available)

    @patch("services.sandboxed_executor.subprocess.run")
    @patch("boto3.client")
    @patch.dict("os.environ", {"PLUGIN_EXECUTOR_LAMBDA": "my-lambda-function"})
    def test_init_lambda_mode(self, mock_boto_client, mock_run):
        """Test initialization with Lambda executor configured."""
        # Arrange
        mock_lambda = MagicMock()
        mock_boto_client.return_value = mock_lambda

        # Act
        executor = SandboxedExecutor()

        # Assert
        self.assertTrue(executor.use_lambda)
        self.assertFalse(executor.docker_available)
        self.assertEqual(executor.lambda_function_name, "my-lambda-function")
        mock_boto_client.assert_called_with("lambda")

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {"PLUGIN_EXECUTOR_LAMBDA": "my-lambda-function"})
    def test_init_lambda_boto3_not_installed(self, mock_run):
        """Test fallback to Docker when boto3 is not installed."""
        # Arrange
        mock_run.return_value = MagicMock(returncode=0)

        with patch.dict("sys.modules", {"boto3": None}):
            # When boto3 is missing, executor should fall back to Docker mode
            executor = SandboxedExecutor()
            self.assertFalse(executor.use_lambda)
            self.assertTrue(executor.docker_available)


class TestSandboxedExecutorCleanup(unittest.TestCase):
    """Tests for container cleanup functionality."""

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_cleanup_stale_containers_none_found(self, mock_run):
        """Test cleanup when no stale containers exist."""
        # Arrange
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version check
            MagicMock(returncode=0, stdout=""),  # docker ps -q
        ]

        # Act
        executor = SandboxedExecutor()
        executor._cleanup_stale_containers()

        # Assert - should have called docker version and docker ps
        self.assertEqual(mock_run.call_count, 3)  # version + cleanup + cleanup again

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_cleanup_stale_containers_found(self, mock_run):
        """Test cleanup when stale containers exist."""
        # Arrange
        container_ids = "abc123\ndef456"
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version check
            MagicMock(returncode=0, stdout=container_ids),  # docker ps -q
            MagicMock(returncode=0),  # docker rm -f
        ]

        # Act
        executor = SandboxedExecutor()

        # Assert - cleanup should have been called in __init__
        rm_calls = [c for c in mock_run.call_args_list if "rm" in str(c)]
        self.assertTrue(rm_calls)
        self.assertIsNotNone(executor)

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_cleanup_when_docker_unavailable(self, mock_run):
        """Test cleanup does nothing when Docker is unavailable."""
        # Arrange
        mock_run.side_effect = FileNotFoundError("docker not found")

        # Act
        executor = SandboxedExecutor()
        initial_call_count = mock_run.call_count
        executor._cleanup_stale_containers()

        # Assert - no additional calls should be made
        self.assertEqual(mock_run.call_count, initial_call_count)


class TestSandboxedExecutorDockerExecution(unittest.TestCase):
    """Tests for Docker-based plugin execution."""

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_empty_pairs(self, mock_run):
        """Test execute with empty pairs list."""
        # Arrange
        mock_run.return_value = MagicMock(returncode=0)
        executor = SandboxedExecutor()

        # Act
        result = executor.execute("def calculate(s1, s2): return 0", [])

        # Assert
        self.assertEqual(result, {"results": []})

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_success(self, mock_run):
        """Test successful Docker execution."""
        # Arrange
        expected_output = {"results": [{"result": 42, "key": "test"}]}
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            MagicMock(
                returncode=0, stdout=json.dumps(expected_output), stderr=""
            ),  # docker run
        ]
        executor = SandboxedExecutor()

        code = "def calculate(s1, s2): return 42"
        pairs = [{"series1": {"t1": 1}, "series2": {"t1": 2}, "key": "test"}]

        # Act
        result = executor.execute(code, pairs)

        # Assert
        self.assertEqual(result, expected_output)

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_nonzero_exit(self, mock_run):
        """Test Docker execution with non-zero exit code."""
        # Arrange
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            MagicMock(returncode=1, stdout="", stderr="Error"),  # docker run fails
        ]
        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("Execution failed", result["error"])

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_timeout(self, mock_run):
        """Test Docker execution timeout."""
        # Arrange
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            subprocess.TimeoutExpired(cmd="docker", timeout=120),  # timeout
        ]
        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("timed out", result["error"])

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_invalid_json_output(self, mock_run):
        """Test Docker execution with invalid JSON output."""
        # Arrange
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            MagicMock(
                returncode=0, stdout="not valid json", stderr=""
            ),  # invalid output
        ]
        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("Invalid output", result["error"])

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_unavailable(self, mock_run):
        """Test execution when Docker is unavailable."""
        # Arrange
        mock_run.side_effect = FileNotFoundError("docker not found")
        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("unavailable", result["error"])

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_unexpected_exception(self, mock_run):
        """Test Docker execution with unexpected exception."""
        # Arrange
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            RuntimeError("Unexpected error"),  # unexpected error
        ]
        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("Internal execution error", result["error"])

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_execute_docker_stderr_logged(self, mock_run):
        """Test that Docker stderr is logged as warning."""
        # Arrange
        expected_output = {"results": []}
        mock_run.side_effect = [
            MagicMock(returncode=0),  # docker version
            MagicMock(returncode=0, stdout=""),  # cleanup
            MagicMock(
                returncode=0,
                stdout=json.dumps(expected_output),
                stderr="Warning message",
            ),
        ]
        executor = SandboxedExecutor()

        # Act
        with patch("services.sandboxed_executor.logger") as mock_logger:
            result = executor.execute(
                "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
            )

        # Assert
        self.assertEqual(result, expected_output)
        mock_logger.warning.assert_called()


class TestSandboxedExecutorLambdaExecution(unittest.TestCase):
    """Tests for Lambda-based plugin execution."""

    @patch("boto3.client")
    @patch.dict("os.environ", {"PLUGIN_EXECUTOR_LAMBDA": "test-lambda"})
    def test_execute_lambda_success(self, mock_boto_client):
        """Test successful Lambda execution."""
        # Arrange
        expected_result = {"results": [{"result": 100, "key": "test"}]}
        mock_lambda = MagicMock()
        mock_lambda.invoke.return_value = {
            "Payload": MagicMock(
                read=lambda: json.dumps(expected_result).encode("utf-8")
            )
        }
        mock_boto_client.return_value = mock_lambda

        executor = SandboxedExecutor()

        code = "def calculate(s1, s2): return 100"
        pairs = [{"series1": {"t1": 1}, "series2": {"t1": 2}, "key": "test"}]

        # Act
        result = executor.execute(code, pairs)

        # Assert
        self.assertEqual(result, expected_result)
        mock_lambda.invoke.assert_called_once()

    @patch("boto3.client")
    @patch.dict("os.environ", {"PLUGIN_EXECUTOR_LAMBDA": "test-lambda"})
    def test_execute_lambda_function_error(self, mock_boto_client):
        """Test Lambda execution with FunctionError."""
        # Arrange
        mock_lambda = MagicMock()
        mock_lambda.invoke.return_value = {
            "Payload": MagicMock(read=lambda: b'{"errorMessage": "Lambda error"}'),
            "FunctionError": "Unhandled",
        }
        mock_boto_client.return_value = mock_lambda

        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("Lambda execution failed", result["error"])

    @patch("boto3.client")
    @patch.dict("os.environ", {"PLUGIN_EXECUTOR_LAMBDA": "test-lambda"})
    def test_execute_lambda_invocation_error(self, mock_boto_client):
        """Test Lambda execution with invocation exception."""
        # Arrange
        mock_lambda = MagicMock()
        mock_lambda.invoke.side_effect = Exception("Network error")
        mock_boto_client.return_value = mock_lambda

        executor = SandboxedExecutor()

        # Act
        result = executor.execute(
            "def calculate(s1, s2): return 0", [{"series1": {}, "series2": {}}]
        )

        # Assert
        self.assertIn("error", result)
        self.assertIn("Lambda invocation error", result["error"])


class TestGetExecutor(unittest.TestCase):
    """Tests for the get_executor singleton function."""

    @patch("services.sandboxed_executor.subprocess.run")
    @patch.dict("os.environ", {}, clear=True)
    def test_get_executor_returns_same_instance(self, mock_run):
        """Test that get_executor returns singleton instance."""
        # Arrange
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        # Reset the global _executor
        se._executor = None

        # Act
        executor1 = get_executor()
        executor2 = get_executor()

        # Assert
        self.assertIs(executor1, executor2)


class TestExecutorTemplate(unittest.TestCase):
    """Tests for the executor template code structure."""

    def test_executor_template_contains_required_functions(self):
        """Test that executor template contains required helper functions."""
        # Arrange
        executor = SandboxedExecutor.__new__(SandboxedExecutor)

        # Assert
        self.assertIn("get_aligned_data", executor.EXECUTOR_TEMPLATE)
        self.assertIn("import pandas as pd", executor.EXECUTOR_TEMPLATE)
        self.assertIn("import numpy as np", executor.EXECUTOR_TEMPLATE)
        self.assertIn("exec(plugin_code, namespace)", executor.EXECUTOR_TEMPLATE)

    def test_executor_template_handles_nan_infinity(self):
        """Test that executor template handles NaN and infinity values."""
        # Arrange
        executor = SandboxedExecutor.__new__(SandboxedExecutor)

        # Assert
        self.assertIn("np.isnan", executor.EXECUTOR_TEMPLATE)
        self.assertIn("np.isinf", executor.EXECUTOR_TEMPLATE)

    def test_executor_constants(self):
        """Test executor class constants."""
        # Assert
        self.assertEqual(SandboxedExecutor.CPU_LIMIT, "0.5")
        self.assertEqual(SandboxedExecutor.PLUGIN_TIMEOUT_SECONDS, 120)
        self.assertEqual(SandboxedExecutor.PLUGIN_MEMORY_LIMIT, "256m")
        self.assertEqual(
            SandboxedExecutor.EXECUTOR_IMAGE, "sandboxed-plugin-executor:latest"
        )


if __name__ == "__main__":
    unittest.main()
