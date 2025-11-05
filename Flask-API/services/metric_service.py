import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from statsmodels.tsa.stattools import acf


def extract_series_from_dict(data:dict, category:str, filename:str) -> dict:
    """Extracts a time series from a nested dictionary structure.

    Args:
        data (dict): The input data dictionary.
        category (str): The category under which the time series is stored.
        filename (str): The specific filename (or key) for the time series.

    Returns:
        dict: A dictionary containing the extracted time series.
    """
    if not isinstance(data, dict) or not isinstance(category, str) or not isinstance(filename, str):
        raise ValueError("Invalid data structure")

    series = {}
    for key in data.keys():
        #Error handling 
        if not isinstance(data[key], dict):
            raise ValueError(f"Invalid data structure at key \'{key}\': expected a dictionary")

        if category not in data[key] or not isinstance(data[key][category], dict):
            raise ValueError(f"Category \'{category}\' not found in data at key \'{key}\' or bad structure")

        if filename not in data[key][category] or not isinstance(data[key][category][filename], (int, float)):
            raise ValueError(f"Filename \'{filename}\' not found in category \'{category}\' at key \'{key}\' or bad structure")

        if not isinstance(data[key][category][filename], (int, float)):
            raise ValueError(f"Unsupported data type for key \'{key}\': {type(data[key][category][filename])}")

        # extracting the value and converting it to float
        try:
            series[key] = float(data[key][category][filename])
        except (ValueError, TypeError) as exc:
            raise ValueError(f"Invalid value for key '{key}': {data[key][category][filename]}") from exc

    return series


# --- Metrics for single time series ---
def calculate_basic_statistics(series: dict) -> dict:
    """ 
    Calculates basic descriptive statistics for a time series.
    Args:
        series (dict): Timeseries
    Returns:
        dict: Dictionary with four statistics: mean, median, variance, std_dev.
    """
    if not series or not isinstance(series, dict):
        return {"mean": np.nan, "median": np.nan, "variance": np.nan, "std_dev": np.nan, "error": "series must be a non-empty dictionary"}
    if not all(isinstance(v, (int, float)) for v in series.values()):
        return {"mean": np.nan, "median": np.nan, "variance": np.nan, "std_dev": np.nan, "error": "series values must be numeric"}
    try:
        # Convert the dictionary to a pandas Series
        series: pd.Series = pd.Series(series)
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    return {
        "mean": series.mean(),
        "median": series.median(),
        "variance": series.var(ddof=0),  # ddof=0 for population variance
        "std_dev": series.std(ddof=0)   # ddof=0 for population standard deviation
    }

def calculate_autocorrelation(series: dict) -> float:
    """
    Calculates the autocorrelation function (ACF) for a time series.
    Args:
        series (dict): Timeseries.
    Returns:
        float: Autocorrelation value;
    """
    if not series or not isinstance(series, dict):
        return np.nan
    if any(not isinstance(v, (int, float)) or np.isnan(v)  for v in series.values() ):
        return np.nan
    try:
        series: pd.Series = pd.Series(series)
        data = pd.to_numeric(series, errors='coerce').dropna().values
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    # acf from statsmodels returns the autocorrelation values for lags 0 to nlags
    # we use nlags=1 to get the first lag autocorrelation
    acf_values = acf(data, nlags=1, fft=True)
    return float(acf_values[1])


def calculate_coefficient_of_variation(series: dict) -> float:
    """
    Calculates the coefficient of variation (CV).
    Args:
        series (dict): Timeseries.
    Returns:
        float: Coefficient of variation.
    """
    if not series or not isinstance(series, dict):
        return np.nan
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series.values()):
        return np.nan
    try:
        series: pd.Series = pd.Series(series)
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    if series.mean() == 0:
        return np.nan  # Avoid division by zero
    return series.std()*100 / series.mean()

def calculate_iqr(series: dict) -> float:
    """
    Calculates the interquartile range (IQR).
    Args:
        series (dict): Timeseries.
    Returns:
        float: IQR value.
    """
    if not series or not isinstance(series, dict):
        return np.nan
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series.values()):
        return np.nan
    try:
        series: pd.Series = pd.Series(series)
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    return series.quantile(0.75) - series.quantile(0.25)



def calculate_pearson_correlation(series1: dict, series2: dict, tolerance: str | None = None) -> float:
    """
    Calculates the Pearson correlation coefficient between two series,
    matching them using the "asof" (nearest timestamp) method with tolerance.
    Args:
        series1 (dict): First time series.
        series2 (dict): Second time series.
        tolerance (str): Maximum time difference for matching points (e.g., '1T', '5s'). 
        If None, it will be automatically calculated based on the 
        median intervals in both series.
    Returns:
        float: Pearson correlation coefficient.
    """
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        return np.nan
    if not series1 or not series2:
        return np.nan

    try:
        df1 = pd.DataFrame({
            "time": pd.to_datetime(list(series1.keys())),
            "value1": list(series1.values())
        }).set_index("time").sort_index() # Sort is needed for merge_asof

        df2 = pd.DataFrame({
            "time": pd.to_datetime(list(series2.keys())),
            "value2": list(series2.values())
        }).set_index("time").sort_index()

        df1 = df1[~df1.index.duplicated(keep='first')]
        df2 = df2[~df2.index.duplicated(keep='first')]

    except (ValueError, TypeError) as e:
        return np.nan

    if tolerance is None:
        deltas = []
        if len(df1.index) > 1:
            deltas.append((df1.index[1:] - df1.index[:-1]).median())
        if len(df2.index) > 1:
            deltas.append((df2.index[1:] - df2.index[:-1]).median())

        if not deltas:
            return np.nan
        tolerance_td = max(deltas)
    else:
        tolerance_td = pd.Timedelta(tolerance)


    df_merged = pd.merge_asof(
        df1,
        df2,
        left_index=True,
        right_index=True,
        direction="nearest",  # Finds nearest point
        tolerance=tolerance_td
    ).dropna()


    # pearsonr needs at least 2 data points
    if len(df_merged) < 2:
        return np.nan  # Too few overlapping points

    # Check for zero variance
    if df_merged["value1"].var() == 0 or df_merged["value2"].var() == 0:
        return np.nan  # One of the series has zero variance

    # Calculate Pearson correlation
    corr, _ = pearsonr(df_merged["value1"], df_merged["value2"])

    return corr


def calculate_difference(series1: dict, series2: dict, tolerance: str | None = None) -> dict:
    """
    Calculates the difference between two time series by nearest timestamp matching.

    Args:
        series1 (dict): first time series
        series2 (dict): second time series
        tolerance (str): max time difference for matching points (pandas Timedelta, e.g. '1T')

    Returns:
        dict: timestamp-to-difference series
    """
    if not series1 or not series2:
        raise ValueError("Both series must be non-empty dictionaries")


    df1 = pd.DataFrame({
        "time": pd.to_datetime(list(series1.keys())),
        "value1": list(series1.values())
    }).set_index("time")

    df2 = pd.DataFrame({
        "time": pd.to_datetime(list(series2.keys())),
        "value2": list(series2.values())
    }).set_index("time")

    if tolerance is None:
        delta1 = (df1.index[1:] - df1.index[:-1]).median()
        delta2 = (df2.index[1:] - df2.index[:-1]).median()
        tolerance = max(delta1, delta2)

    else:
        tolerance = pd.Timedelta(tolerance)


    df1 = df1.sort_index()
    df2 = df2.sort_index()



    df_merged = pd.merge_asof(
        df1, df2,
        left_index=True,
        right_index=True,
        direction="nearest",
        tolerance=pd.Timedelta(tolerance)
    ).dropna()

    if df_merged.empty:
        raise ValueError("No overlapping timestamps within tolerance")

    df_merged["diff"] = df_merged["value1"] - df_merged["value2"]
    return {idx.isoformat(): float(val) for idx, val in df_merged["diff"].items()}


def calculate_rolling_mean(series: dict, window_size: str = "1d") -> dict:
    """
    Calculates the rolling mean (moving average) of a time series with a window size of 3.

    Args:
        series (dict): Timeseries.

    Returns:
        dict: Timeseries of rolling mean values.

    """
    if not series or not isinstance(series, dict):
        return {}
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series.values()):
        return {}
    try:
        s = pd.Series(series)
        s.index = pd.to_datetime(s.index)
        s = s.sort_index()

    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    rolling_mean = s.rolling(pd.Timedelta(window_size)).mean()
    return {idx.isoformat(): float(val) for idx, val in rolling_mean.items()}
