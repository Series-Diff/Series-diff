import os
import subprocess
import json
import logging
import textwrap
import atexit
import signal
import sys

logger = logging.getLogger(__name__)

class SandboxedExecutor:
    """
    Adaptive executor for plugin code with lifecycle management.
    
    - Local (Docker available): Uses Docker containers for isolation
    - AWS (PLUGIN_EXECUTOR_LAMBDA set): Uses Lambda for execution
    """

    EXECUTOR_IMAGE = "sandboxed-plugin-executor:latest"
    CPU_LIMIT = "0.5"
    PLUGIN_TIMEOUT_SECONDS = 120
    PLUGIN_MEMORY_LIMIT = "256m"

    # Label to identify containers managed by this specific system
    CONTAINER_LABEL_KEY = "managed_by"
    CONTAINER_LABEL_VAL = "sandboxed_plugin_executor"

    def __init__(self):
        self.lambda_function_name = os.environ.get("PLUGIN_EXECUTOR_LAMBDA")
        self.use_lambda = bool(self.lambda_function_name)

        if self.use_lambda:
            self._init_lambda()
        else:
            self._check_docker_available()
            if self.docker_available:
                # 1. Clean up any mess left behind by previous crashes
                self._cleanup_stale_containers()
                # 2. Register cleanup on exit for the current session
                atexit.register(self._cleanup_stale_containers)

    def _init_lambda(self):
        """Initialize Lambda client for AWS execution."""
        try:
            import boto3
            self.lambda_client = boto3.client("lambda")
            self.docker_available = False
            logger.info(f"Using Lambda executor: {self.lambda_function_name}")
        except ImportError:
            logger.error("boto3 not installed - Lambda execution unavailable")
            self.use_lambda = False
            self._check_docker_available()

    def _check_docker_available(self):
        """Check if Docker is available for local execution."""
        try:
            subprocess.run(["docker", "version"], capture_output=True, check=True)
            self.docker_available = True
            logger.info("Using Docker executor (local mode)")
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.critical("DOCKER IS NOT AVAILABLE. Plugin execution disabled.")
            self.docker_available = False

    def _cleanup_stale_containers(self):
        """
        Force kill and remove any containers created by this executor 
        that might have been left running (e.g., after a hard crash).
        """
        if not self.docker_available:
            return

        try:
            # Find container IDs with our label
            label_filter = f"label={self.CONTAINER_LABEL_KEY}={self.CONTAINER_LABEL_VAL}"
            cmd = ["docker", "ps", "-q", "--filter", label_filter]

            result = subprocess.run(cmd, capture_output=True, text=True)
            container_ids = result.stdout.strip().split()

            if container_ids:
                logger.warning(f"Found {len(container_ids)} orphaned containers. Cleaning up...")
                # Force remove them
                subprocess.run(
                    ["docker", "rm", "-f"] + container_ids,
                    capture_output=True,
                    check=False
                )
        except Exception as e:
            logger.error(f"Failed to cleanup stale containers: {e}")

    EXECUTOR_TEMPLATE = textwrap.dedent(
        """
        import sys
        import json
        import pandas as pd
        import numpy as np
        import scipy
        import scipy.stats
        import scipy.signal
        import sklearn.metrics
        import statsmodels.api
        import statsmodels.tsa.api
        import traceback

        def get_aligned_data(series1, series2, tolerance=None):
            if isinstance(series1, pd.Series):
                series1 = series1.to_dict()
            if isinstance(series2, pd.Series):
                series2 = series2.to_dict()
            if not isinstance(series1, dict) or not isinstance(series2, dict):
                raise ValueError("Inputs must be dictionaries or pandas Series")

            df1 = pd.DataFrame({
                "time": pd.to_datetime(list(series1.keys())),
                "value1": list(series1.values()),
            }).set_index("time").sort_index()

            df2 = pd.DataFrame({
                "time": pd.to_datetime(list(series2.keys())),
                "value2": list(series2.values()),
            }).set_index("time").sort_index()

            df1 = df1[~df1.index.duplicated(keep="first")]
            df2 = df2[~df2.index.duplicated(keep="first")]

            if tolerance is None:
                deltas = []
                if len(df1.index) > 1:
                    deltas.append((df1.index[1:] - df1.index[:-1]).median())
                if len(df2.index) > 1:
                    deltas.append((df2.index[1:] - df2.index[:-1]).median())
                if not deltas:
                    return pd.DataFrame()
                tolerance_td = max(deltas)
            else:
                tolerance_td = pd.Timedelta(tolerance)

            return pd.merge_asof(df1, df2, left_index=True, right_index=True,
                                 direction="nearest", tolerance=tolerance_td).dropna()

        try:
            input_data = json.loads(sys.stdin.read())
            pairs = input_data["pairs"]
            plugin_code = input_data["code"]

            namespace = {
                "pd": pd, "np": np, "numpy": np, "pandas": pd,
                "scipy": scipy, "stats": scipy.stats, "signal": scipy.signal,
                "metrics": sklearn.metrics, "statsmodels": statsmodels,
                "sm": statsmodels.api, "tsa": statsmodels.tsa.api,
                "get_aligned_data": get_aligned_data,
            }

            exec(plugin_code, namespace)

            if "calculate" not in namespace:
                print(json.dumps({"error": "Plugin must define 'calculate' function"}))
                sys.exit(1)

            calculate = namespace["calculate"]
            results = []

            for pair in pairs:
                try:
                    s1 = pd.Series(pair["series1"])
                    s2 = pd.Series(pair["series2"])
                    result = calculate(s1, s2)
                    if isinstance(result, (np.integer, np.floating)):
                        result = float(result)
                    results.append({"result": result, "key": pair.get("key")})
                except Exception as e:
                    results.append({"error": str(e), "key": pair.get("key")})

            print(json.dumps({"results": results}))

        except Exception:
            print(json.dumps({"error": traceback.format_exc()}))
            sys.exit(1)
        """
    )

    def execute(self, code: str, pairs: list) -> dict:
        """Execute plugin code on multiple pairs."""
        if not pairs:
            return {"results": []}

        if self.use_lambda:
            return self._execute_lambda(code, pairs)
        else:
            return self._execute_docker(code, pairs)

    def _execute_lambda(self, code: str, pairs: list) -> dict:
        """Execute plugin code via AWS Lambda."""
        try:
            payload = json.dumps({"code": code, "pairs": pairs})
            response = self.lambda_client.invoke(
                FunctionName=self.lambda_function_name,
                InvocationType="RequestResponse",
                Payload=payload.encode("utf-8"),
            )
            response_payload = response["Payload"].read().decode("utf-8")
            result = json.loads(response_payload)

            if "FunctionError" in response:
                logger.error(f"Lambda execution error: {result}")
                return {"error": "Lambda execution failed"}
            return result
        except Exception as e:
            logger.exception("Error invoking Lambda")
            return {"error": f"Lambda invocation error: {str(e)}"}

    def _execute_docker(self, code: str, pairs: list) -> dict:
        """Execute plugin code via Docker container."""
        if not self.docker_available:
            return {"error": "Secure execution environment unavailable"}

        input_data = json.dumps({"pairs": pairs, "code": code})

        try:
            docker_cmd = [
                "docker",
                "run",
                "--rm",
                "--network=none",
                "--read-only",
                f"--memory={self.PLUGIN_MEMORY_LIMIT}",
                f"--cpus={self.CPU_LIMIT}",
                "--pids-limit=100",
                "--security-opt=no-new-privileges",
                "--cap-drop=ALL",
                "--user=65534:65534",
                f"--label={self.CONTAINER_LABEL_KEY}={self.CONTAINER_LABEL_VAL}",
                "-i",
                self.EXECUTOR_IMAGE,
                "python",
                "-c",
                self.EXECUTOR_TEMPLATE,
            ]

            result = subprocess.run(
                docker_cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.PLUGIN_TIMEOUT_SECONDS,
            )

            if result.stderr:
                logger.warning(f"Docker stderr: {result.stderr}")

            if result.returncode != 0:
                return {"error": f"Execution failed (code {result.returncode})"}

            try:
                return json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                return {"error": "Invalid output format from plugin"}

        except subprocess.TimeoutExpired:
            logger.error("Plugin execution timed out")
            return {"error": "Execution timed out"}
        except Exception:
            logger.exception("Unexpected error in docker execution")
            return {"error": "Internal execution error"}

_executor = None

def get_executor():
    global _executor
    if _executor is None:
        _executor = SandboxedExecutor()
    return _executor