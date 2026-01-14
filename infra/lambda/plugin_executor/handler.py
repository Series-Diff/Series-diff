"""
Lambda function for sandboxed plugin execution.
Executes user-defined Python code on time series pairs in an isolated environment.
"""

import json
import traceback
import pandas as pd
import numpy as np
import scipy
import scipy.stats
import scipy.signal
import sklearn.metrics
import statsmodels.api
import statsmodels.tsa.api


def get_aligned_data(series1, series2, tolerance=None):
    """Align two time series by their timestamps."""
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


def handler(event, context):
    """
    Execute plugin code on time series pairs.

    Event format:
    {
        "code": "def calculate(s1, s2): return ...",
        "pairs": [
            {"series1": {...}, "series2": {...}, "key": "file1|file2"},
            ...
        ]
    }

    Returns:
    {
        "results": [
            {"result": 42.0, "key": "file1|file2"},
            ...
        ]
    }
    or
    {
        "error": "Error message"
    }
    """
    try:
        pairs = event["pairs"]
        plugin_code = event["code"]

        # Create namespace with allowed libraries
        namespace = {
            "pd": pd,
            "np": np,
            "numpy": np,
            "pandas": pd,
            "scipy": scipy,
            "stats": scipy.stats,
            "signal": scipy.signal,
            "metrics": sklearn.metrics,
            "statsmodels": statsmodels,
            "sm": statsmodels.api,
            "tsa": statsmodels.tsa.api,
            "get_aligned_data": get_aligned_data,
        }

        # Execute the plugin code to define the calculate function
        exec(plugin_code, namespace)

        if "calculate" not in namespace:
            return {"error": "Plugin must define 'calculate' function"}

        calculate = namespace["calculate"]
        results = []

        for pair in pairs:
            try:
                s1 = pd.Series(pair["series1"])
                s2 = pd.Series(pair["series2"])
                result = calculate(s1, s2)
                # Convert numpy types to Python native types
                if isinstance(result, (np.integer, np.floating)):
                    result = float(result)
                results.append({"result": result, "key": pair.get("key")})
            except Exception as e:
                results.append({"error": str(e), "key": pair.get("key")})

        return {"results": results}

    except Exception:
        return {"error": traceback.format_exc()}
