import subprocess
import json
import os
import logging
import textwrap
from typing import Optional

logger = logging.getLogger(__name__)

class SandboxedExecutor:

    EXECUTOR_IMAGE = "sandboxed-plugin-executor:latest"
    CPU_LIMIT = "0.5"
    PLUGIN_TIMEOUT_SECONDS = 120
    PLUGIN_MEMORY_LIMIT = "256m"


    def __init__(self):
        self._check_docker_available()

    def _check_docker_available(self):
        try:
            subprocess.run(["docker", "version"], capture_output=True, check=True)
            self.docker_available = True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.critical("DOCKER IS NOT AVAILABLE. Plugin execution disabled.")
            self.docker_available = False

    # Execution template - processes multiple pairs in one container
    EXECUTOR_TEMPLATE = textwrap.dedent("""
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
        """)

    def execute(self, code: str, pairs: list) -> dict:
        """
        Execute plugin code on multiple pairs in a single Docker container.
        
        Args:
            code: Python plugin code
            pairs: List of dicts with 'series1', 'series2', and optional 'key'
        
        Returns:
            dict with 'results' list or 'error'
        """
        if not self.docker_available:
            return {"error": "Secure execution environment unavailable"}

        if not pairs:
            return {"results": []}

        input_data = json.dumps({"pairs": pairs, "code": code})

        try:
            docker_cmd = [
                "docker", "run", "--rm",
                "--network=none",
                "--read-only",
                f"--memory={self.PLUGIN_MEMORY_LIMIT}",
                f"--cpus={self.CPU_LIMIT}",
                "--pids-limit=100",
                "--security-opt=no-new-privileges",
                "--cap-drop=ALL",
                "--user=65534:65534",
                "-i",
                self.EXECUTOR_IMAGE,
                "python", "-c", self.EXECUTOR_TEMPLATE
            ]

            result = subprocess.run(
                docker_cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.PLUGIN_TIMEOUT_SECONDS
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
            return {"error": "Execution timed out"}
        except Exception as e:
            logger.exception("Unexpected error in docker execution")
            return {"error": "Internal execution error"}


# Singleton setup
_executor = None
def get_executor():
    global _executor
    if _executor is None:
        _executor = SandboxedExecutor()
    return _executor