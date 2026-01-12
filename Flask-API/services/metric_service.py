import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from statsmodels.tsa.stattools import acf
import logging
from fastdtw import fastdtw

logger = logging.getLogger("FlaskAPI")


def extract_series_from_dict(data: dict, category: str, filename: str) -> dict:
    """Extracts a time series from a nested dictionary structure.

    Args:
        data (dict): The input data dictionary.
        category (str): The category under which the time series is stored.
        filename (str): The specific filename (or key) for the time series.

    Returns:
        dict: A dictionary containing the extracted time series.
    """
    if (
            not isinstance(data, dict)
            or not isinstance(category, str)
            or not isinstance(filename, str)
    ):
        raise ValueError(
            "Invalid data structure for: " + str(category) + " " + str(filename)
        )

    series = {}
    extracted_count = 0
    skipped_count = 0

    # Normalize filename and category by trimming whitespace to handle CSV/JSON inconsistencies
    filename_normalized = filename.strip()
    category_normalized = category.strip()

    for key in data.keys():
        # Error handling
        if not isinstance(data[key], dict):
            raise ValueError(
                f"Invalid data structure at key '{key}': expected a dictionary"
            )

        if category_normalized not in data[key] or not isinstance(
                data[key][category_normalized], dict
        ):
            skipped_count += 1
            continue  # Category not found in this timestamp - skip silently

        if filename_normalized not in data[key][category_normalized] or not isinstance(
                data[key][category_normalized][filename_normalized], (int, float)
        ):
            skipped_count += 1
            continue  # not good solution, but gotta find out what to do when there's missing data for some timestamps

        if not isinstance(
                data[key][category_normalized][filename_normalized], (int, float)
        ):
            raise ValueError(
                f"Unsupported data type for key '{key}': {type(data[key][category_normalized][filename_normalized])}"
            )

        # extracting the value and converting it to float
        try:
            series[key] = float(data[key][category_normalized][filename_normalized])
            extracted_count += 1
        except (ValueError, TypeError) as exc:
            raise ValueError(
                f"Invalid value for key '{key}': {data[key][category_normalized][filename_normalized]}"
            ) from exc

    logger.info(
        f"extract_series_from_dict: filename='{filename}', category='{category}' → extracted={extracted_count}, skipped={skipped_count}, series_len={len(series)}"
    )

    return series


def get_aligned_data(
        series1: dict, series2: dict, tolerance: str | None = None
) -> pd.DataFrame:
    """
    Helper function to align two series based on timestamp with tolerance.
    Returns a DataFrame with columns ['value1', 'value2'] indexed by time.

    Args:
        series1 (dict): First time series.
        series2 (dict): Second time series.
        tolerance (str | None): Optional tolerance for aligning timestamps.

    Returns:
        pd.DataFrame: Aligned data with columns ['value1', 'value2'] indexed by time.
    """
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        raise ValueError("Inputs must be dictionaries")

    df1 = (
        pd.DataFrame(
            {
                "time": pd.to_datetime(list(series1.keys())),
                "value1": list(series1.values()),
            }
        )
        .set_index("time")
        .sort_index()
    )

    df2 = (
        pd.DataFrame(
            {
                "time": pd.to_datetime(list(series2.keys())),
                "value2": list(series2.values()),
            }
        )
        .set_index("time")
        .sort_index()
    )

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

    df_merged = pd.merge_asof(
        df1,
        df2,
        left_index=True,
        right_index=True,
        direction="nearest",
        tolerance=tolerance_td,
    ).dropna()

    return df_merged


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
        return {
            "mean": np.nan,
            "median": np.nan,
            "variance": np.nan,
            "std_dev": np.nan,
            "error": "series must be a non-empty dictionary",
        }
    if not all(isinstance(v, (int, float)) for v in series.values()):
        return {
            "mean": np.nan,
            "median": np.nan,
            "variance": np.nan,
            "std_dev": np.nan,
            "error": "series values must be numeric",
        }
    try:
        # Convert the dictionary to a pandas Series
        series: pd.Series = pd.Series(series)
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    return {
        "mean": series.mean(),
        "median": series.median(),
        "variance": series.var(ddof=0),  # ddof=0 for population variance
        "std_dev": series.std(ddof=0),  # ddof=0 for population standard deviation
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
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series.values()):
        return np.nan
    try:
        series: pd.Series = pd.Series(series)
        data = pd.to_numeric(series, errors="coerce").dropna().values
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
    return series.std() * 100 / series.mean()


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


def calculate_pearson_correlation(
        series1: dict, series2: dict, tolerance: str | None = None
) -> float:
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
        logger.warning(
            f"calculate_pearson_correlation: empty series detected (s1={len(series1)}, s2={len(series2)}) → returning NaN"
        )
        return np.nan

    logger.info(
        f"calculate_pearson_correlation: series1_len={len(series1)}, series2_len={len(series2)}, tolerance={tolerance}"
    )

    try:
        df_merged = get_aligned_data(series1, series2, tolerance)

    except (ValueError, TypeError):
        return np.nan

    if len(df_merged) < 2:
        return np.nan  # Too few overlapping points

    # Check for zero variance
    if df_merged["value1"].var() == 0 or df_merged["value2"].var() == 0:
        return np.nan  # One of the series has zero variance

    # Calculate Pearson correlation
    corr, _ = pearsonr(df_merged["value1"], df_merged["value2"])

    return corr


def calculate_difference(
        series1: dict, series2: dict, tolerance: str | None = None
) -> dict:
    """
    Calculates the difference between two time series by nearest timestamp matching.

    Args:
        series1 (dict): first time series
        series2 (dict): second time series
        tolerance (str): max time difference for matching points (pandas Timedelta, e.g. '1T')

    Returns:
        dict: timestamp-to-difference series (empty dict if series are empty)
    """
    if not series1 or not series2:
        # Return empty dict instead of raising - graceful handling of empty series
        return {}

    df_merged = get_aligned_data(series1, series2, tolerance)

    if df_merged.empty:
        raise ValueError("No overlapping timestamps within tolerance")

    df_merged["diff"] = df_merged["value1"] - df_merged["value2"]
    return {idx.isoformat(): float(val) for idx, val in df_merged["diff"].items()}


def calculate_rolling_mean(series: dict, window_size: str = "1d") -> dict:
    """
    Calculates the rolling mean (moving average) of a time series using a configurable window size.

    Args:
        series (dict): Time series as a dictionary of timestamp-value pairs.
        window_size (str): Size of the moving window (e.g., '1d', '3h'). Defaults to '1d'.

    Returns:
        dict: Time series of rolling mean values.
    """
    if not series or not isinstance(series, dict):
        return {}
    if any(not isinstance(v, (int, float)) or np.isnan(v) for v in series.values()):
        return {}
    if not isinstance(window_size, str):
        return {}
    try:
        s = pd.Series(series)
        s.index = pd.to_datetime(s.index)
        s = s.sort_index()
        rolling_mean = s.rolling(pd.Timedelta(window_size)).mean()
    except (ValueError, TypeError) as e:
        raise ValueError("could not convert series to pd.Series: " + str(e)) from e
    return {idx.isoformat(): float(val) for idx, val in rolling_mean.items()}


def calculate_dtw(series1: dict, series2: dict) -> float:
    if not series1 or not series2:
        # Return None instead of raising - graceful handling of empty series
        return None  # type: ignore

    if not isinstance(series1, dict) or not isinstance(series2, dict):
        raise ValueError("Both series must be dictionaries with timestamps as keys")
    if len(series1) == 0 or len(series2) == 0:
        # Return None instead of raising - graceful handling
        return None  # type: ignore

    s1 = pd.Series(series1)
    s1.index = pd.to_datetime(s1.index)
    s1 = s1.sort_index().astype(float)

    s2 = pd.Series(series2)
    s2.index = pd.to_datetime(s2.index)
    s2 = s2.sort_index().astype(float)

    if s1.empty or s2.empty:
        return None

    x = s1.values.astype(np.float64).flatten()
    y = s2.values.astype(np.float64).flatten()

    distance, path = fastdtw(x, y)


    return distance


def calculate_euclidean_distance(
        series1: dict, series2: dict, tolerance: str | None = None
) -> float:
    """
    Computes the Euclidean distance between two time series by aligning points
    using pandas.merge_asof with nearest timestamp matching.

    Args:
        series1 (dict): First time series (timestamp -> value).
        series2 (dict): Second time series (timestamp -> value).
        tolerance (str | None): Maximum allowed time difference for matching
                                (e.g., '1T', '5s'). If None, tolerance will be
                                automatically estimated from median sampling intervals.

    Returns:
        float: Euclidean distance computed from the aligned points, or None if series are empty.
    """
    if not series1 or not series2:
        # Return None instead of raising - graceful handling of empty series
        return None  # type: ignore

    df_merged = get_aligned_data(series1, series2, tolerance)

    if df_merged.empty:
        raise ValueError("No overlapping timestamps within tolerance")

    diffs = df_merged["value1"].values - df_merged["value2"].values
    euclidean_distance = float(np.linalg.norm(diffs))

    return euclidean_distance


def calculate_cosine_similarity(
        series1: dict, series2: dict, tolerance: str | None = None
) -> float:
    """
    Computes the cosine similarity between two time series
    aligned in time (asof merge).

    Args:
        series1 (dict): The first time series {timestamp: value}.
        series2 (dict): The second time series {timestamp: value}.
        tolerance (str | None): Maximum time difference allowed when matching points,
                                e.g., '3min'. If None, it will be derived from the
                                median interval.

    Returns:
        float: The cosine similarity value in the range [-1, 1].
               Returns np.nan if it cannot be computed.
    """
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        return np.nan
    if not series1 or not series2:
        return np.nan

    try:
        df_merged = get_aligned_data(series1, series2, tolerance)
    except (ValueError, TypeError):
        return np.nan

    if df_merged.empty or len(df_merged) < 2:
        return np.nan

    a = df_merged["value1"].to_numpy()
    b = df_merged["value2"].to_numpy()

    # Jeśli jedna seria to same zera → brak sensownego podobieństwa
    if np.all(a == 0) or np.all(b == 0):
        return np.nan

    numerator = np.dot(a, b)
    denominator = np.linalg.norm(a) * np.linalg.norm(b)

    if denominator == 0:
        return np.nan

    return float(numerator / denominator)


def calculate_mae(series1: dict, series2: dict, tolerance: str | None = None) -> float:
    """
    Calculates Mean Absolute Error (MAE) between two time series matched by nearest timestamp.

    Args:
        series1 (dict): First time series
        series2 (dict): Second time series
        tolerance (str | None): Max allowed time difference for matching timestamps

    Returns:
        float: MAE value (or np.nan if cannot compute)
    """
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        return np.nan
    if not series1 or not series2:
        return np.nan

    try:
        df_merged = get_aligned_data(series1, series2, tolerance)
    except (ValueError, TypeError):
        return np.nan

    if df_merged.empty:
        return np.nan

    mae = np.mean(np.abs(df_merged["value1"] - df_merged["value2"]))
    return float(mae)


def calculate_rmse(series1: dict, series2: dict, tolerance: str | None = None) -> float:
    """
    Calculates Root Mean Square Error (RMSE) between two time series matched by nearest timestamp.

    Args:
        series1 (dict): First time series
        series2 (dict): Second time series
        tolerance (str | None): Max allowed time difference for matching timestamps

    Returns:
        float: RMSE value (or np.nan if cannot compute)
    """
    if not isinstance(series1, dict) or not isinstance(series2, dict):
        return np.nan
    if not series1 or not series2:
        return np.nan

    try:
        df_merged = get_aligned_data(series1, series2, tolerance)
    except (ValueError, TypeError):
        return np.nan

    if df_merged.empty:
        return np.nan

    rmse = np.sqrt(np.mean((df_merged["value1"] - df_merged["value2"]) ** 2))
    return float(rmse)
