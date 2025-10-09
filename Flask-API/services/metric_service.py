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


# --- Metryki dla porównywania wielu szeregów ---
def calculate_pearson_correlation(series1: dict, series2: dict) -> float:
    """
    Calculates the Pearson correlation coefficient between two series.
    Args:
        series1 (dict): First time series.
        series2 (dict): Second time series.
    Returns:
        float: Pearson correlation coefficient.
    """
    if not series1 or not series2 or len(series1) != len(series2):
        return np.nan
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        return np.nan
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series1.values()) or \
       any(not isinstance(v, (int, float)) or np.isnan(v) for v in series2.values()):
        return np.nan
    try:
        series1: pd.Series = pd.Series(series1)
        series2: pd.Series = pd.Series(series2)
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    corr, _ = pearsonr(series1, series2)
    return corr
