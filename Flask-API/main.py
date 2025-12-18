import sys
from services.time_series_manager import TimeSeriesManager
import services.metric_service as metric_service
from utils.data_utils import pivot_file
from flask_cors import CORS
from flask import Flask, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from utils.time_utils import convert_timeseries_keys_timezone
# from services.plugin_service import get_plugin_manager

sys.stdout.reconfigure(line_buffering=True)


timeseries_manager = TimeSeriesManager()
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max
CORS(app)
logger = app.logger
logger.setLevel("DEBUG")

limiter = Limiter(
    app=app, key_func=get_remote_address, default_limits=["200 per day", "50 per hour"]
)


@app.route("/health")
def health_check():
    # Add your custom health check logic here
    if all_required_services_are_running():
        return "OK", 200
    else:
        return "Service Unavailable", 500


@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "API is working", "service": "SeriesDiff Backend"}), 200


@app.route("/api/timeseries", methods=["GET"])
@limiter.limit("10 per minute")
def get_timeseries():
    """
    Get timeseries data for a specific filename, category and time interval.

    Returns:
        JSON response with timeseries data or error message.
    """
    time = request.args.get("time")
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            time=time, filename=filename, category=category, start=start, end=end
        )
    except (KeyError, ValueError) as e:
        logger.error(
            "Error fetching timeseries for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(
            "Unexpected error fetching timeseries for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": "Unexpected error occurred"}), 500
    tz_param = request.args.get("tz", "Europe/Warsaw")
    keep_offset_param = request.args.get("keep_offset", "false").lower() in (
        "1",
        "true",
        "yes",
    )
    if data:
        try:
            data = convert_timeseries_keys_timezone(
                data, tz_str=tz_param, keep_offset=keep_offset_param
            )
        except Exception as e:
            logger.warning(
                "Time conversion failed: %s. Returning original timestamps.", e
            )
    if data is None:
        logger.warning(
            "Timeseries not found for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "Timeseries not found"}), 404
    logger.info(
        "Successfully fetched timeseries for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )
    return jsonify(data), 200


@app.route("/api/transform/pivot", methods=["POST"])
def transform_pivot():
    """
    Pivots uploaded data (CSV or JSON) using Pandas.
    Returns the transformed data as a JSON list of records.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    index_col = request.form.get("index_col")
    columns_col = request.form.get("columns_col")
    values_col = request.form.get("values_col")

    if not all([index_col, columns_col, values_col]):
        return (
            jsonify({"error": "Please select columns for Index, Category and Value."}),
            400,
        )

    try:
        result_data = pivot_file(file, index_col, columns_col, values_col)

        return jsonify(result_data), 200

    except Exception as e:
        logger.error(f"Error pivoting data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/timeseries/scatter_data", methods=["GET"])
def get_scatter_data():
    """
    Returns aligned data points for scatter plot using the same logic as Pearson correlation.
    """
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")  # Opcjonalnie

    try:
        # Pobranie danych
        data1 = timeseries_manager.get_timeseries(filename=filename1, category=category)
        tz_param = request.args.get("tz", "Europe/Warsaw")
        keep_offset_param = request.args.get("keep_offset", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        if data1:
            data1 = convert_timeseries_keys_timezone(
                data1, tz_str=tz_param, keep_offset=keep_offset_param
            )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(filename=filename2, category=category)
        if data2:
            data2 = convert_timeseries_keys_timezone(
                data2, tz_str=tz_param, keep_offset=keep_offset_param
            )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        # Użycie wspólnej logiki alignowania
        df_merged = metric_service.get_aligned_data(serie1, serie2, tolerance)

        # Przygotowanie odpowiedzi JSON
        # Format: [{x: 10, y: 12, time: "2023-01-01..."}, ...]
        result = []
        for index, row in df_merged.iterrows():
            result.append(
                {"x": row["value1"], "y": row["value2"], "time": index.isoformat()}
            )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting scatter data: {e}")
        return jsonify({"error": str(e)}), 400


@app.route("/api/timeseries/mean", methods=["GET"])
def get_mean():
    """
    Get the mean value of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the mean value or error message.
    """

    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        mean = metric_service.calculate_basic_statistics(serie)["mean"]
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating mean for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if mean is None:
        logger.warning(
            "No valid timeseries data provided for mean calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated mean for provided timeseries data: filename '%s', category '%s', time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"mean": mean}), 200


@app.route("/api/timeseries/median", methods=["GET"])
def get_median():
    """
    Get the median value of the timeseries for a specific filename and category.

    Returns:
        JSON response with the median value or error message.
    """

    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        median = metric_service.calculate_basic_statistics(serie)["median"]
        logger.debug(
            "Calculated median: %s for filename '%s' and category '%s' and time interval '%s - %s'",
            median,
            filename,
            category,
            start,
            end,
        )
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating median for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if median is None:
        logger.warning(
            "No valid timeseries data provided for median calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated median for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"median": median}), 200


@app.route("/api/timeseries/variance", methods=["GET"])
def get_variance():
    """
    Get the variance of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the variance value or error message.
    """

    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        variance = metric_service.calculate_basic_statistics(serie)["variance"]
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating variance for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if variance is None:
        logger.warning(
            "No valid timeseries data provided for variance calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated variance for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"variance": variance}), 200


@app.route("/api/timeseries/standard_deviation", methods=["GET"])
def get_standard_deviation():
    """
    Get the standard deviation of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the standard deviation value or error message.
    """
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        std_dev = metric_service.calculate_basic_statistics(serie)["std_dev"]
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating standard deviation for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if std_dev is None:
        logger.warning(
            "No valid timeseries data provided for standard deviation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated standard deviation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"standard_deviation": std_dev}), 200


@app.route("/api/timeseries/autocorrelation", methods=["GET"])
def get_autocorrelation():
    """
    Get the autocorrelation of the timeseries for a specific filename, category and time interval.
    Returns:
        JSON response with the autocorrelation value or error message.
    """
    if not request.args.get("filename") or not request.args.get("category"):
        logger.error("Missing required parameters: 'filename' and 'category'")
        return (
            jsonify(
                {"error": "Missing required parameters: 'filename' and 'category'"}
            ),
            400,
        )
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        acf_value = metric_service.calculate_autocorrelation(serie)
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating autocorrelation for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if acf_value is None:
        logger.warning(
            "No valid timeseries data provided for autocorrelation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated autocorrelation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"autocorrelation": acf_value}), 200


@app.route("/api/timeseries/coefficient_of_variation", methods=["GET"])
def get_coefficient_of_variation():
    """
    Get the coefficient of variation of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the coefficient of variation value or error message.
    """
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        cv = metric_service.calculate_coefficient_of_variation(serie)
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating coefficient of variation for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if cv is None:
        logger.warning(
            "No valid timeseries data provided for coefficient of variation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated coefficient of variation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"coefficient_of_variation": cv}), 200


@app.route("/api/timeseries/iqr", methods=["GET"])
def get_iqr():
    """
    Get the interquartile range (IQR) of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the IQR value or error message.
    """

    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            filename=filename, category=category, start=start, end=end
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)
        iqr = metric_service.calculate_iqr(serie)
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating IQR for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if iqr is None:
        logger.warning(
            "No valid timeseries data provided for IQR calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated IQR for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return jsonify({"iqr": iqr}), 200


@app.route("/api/timeseries/pearson_correlation", methods=["GET"])
def get_pearson_correlation():
    """
    Get the Pearson correlation between two timeseries for specific filenames, category and time interval.

    Returns:
        JSON response with the Pearson correlation value or error message.
    """
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")
    try:
        data1 = timeseries_manager.get_timeseries(
            filename=filename1, category=category, start=start, end=end
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)
        data2 = timeseries_manager.get_timeseries(
            filename=filename2, category=category, start=start, end=end
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)
        correlation = metric_service.calculate_pearson_correlation(
            serie1, serie2, tolerance
        )
    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating Pearson correlation for filenames '%s' and '%s' in category '%s': %s",
            filename1,
            filename2,
            category,
            e,
        )
        return jsonify({"error": str(e)}), 400
    if correlation is None:
        logger.warning(
            "No valid timeseries data provided for Pearson correlation calculation for filenames '%s' and '%s' in category '%s'",
            filename1,
            filename2,
            category,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400
    logger.info(
        "Successfully calculated Pearson correlation for provided timeseries data for filenames '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )
    return jsonify({"pearson_correlation": correlation}), 200


@app.route("/api/timeseries/cosine_similarity", methods=["GET"])
def get_cosine_similarity():
    """
    Get the cosine similarity between two timeseries for specific filenames, category and time interval.

    Returns:
        JSON response with the cosine similarity value or error message.
    """
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        # Pobierz dane dla obu plików
        data1 = timeseries_manager.get_timeseries(
            filename=filename1, category=category, start=start, end=end
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            filename=filename2, category=category, start=start, end=end
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        # Oblicz cosine similarity
        similarity = metric_service.calculate_cosine_similarity(
            serie1, serie2, tolerance
        )

    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating cosine similarity for filenames '%s' and '%s' in category '%s': %s",
            filename1,
            filename2,
            category,
            e,
        )
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Unexpected error calculating cosine similarity: %s", e)
        return jsonify({"error": "Unexpected error occurred"}), 500

    if similarity is None:
        logger.warning(
            "No valid timeseries data provided for cosine similarity calculation for filenames '%s' and '%s' in category '%s'",
            filename1,
            filename2,
            category,
        )
        return jsonify({"error": "No valid timeseries data provided"}), 400

    logger.info(
        "Successfully calculated cosine similarity for provided timeseries data for filenames '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )
    return jsonify({"cosine_similarity": similarity}), 200


@app.route("/api/timeseries/mae", methods=["GET"])
def get_mae():
    """
    Calculate MAE (Mean Absolute Error) between two timeseries.
    """
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(
            filename=filename1, category=category, start=start, end=end
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            filename=filename2, category=category, start=start, end=end
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        mae = metric_service.calculate_mae(serie1, serie2, tolerance)

    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating MAE for filenames '%s' and '%s' in category '%s': %s",
            filename1,
            filename2,
            category,
            e,
        )
        return jsonify({"error": str(e)}), 400

    if mae is None:
        return jsonify({"error": "No valid timeseries data provided"}), 400

    logger.info(
        "Successfully calculated MAE for files '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )

    return jsonify({"mae": mae}), 200


@app.route("/api/timeseries/rmse", methods=["GET"])
def get_rmse():
    """
    Calculate RMSE (Root Mean Squared Error) between two timeseries.
    """
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(
            filename=filename1, category=category, start=start, end=end
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            filename=filename2, category=category, start=start, end=end
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        rmse = metric_service.calculate_rmse(serie1, serie2, tolerance)

    except (KeyError, ValueError) as e:
        logger.error(
            "Error calculating RMSE for filenames '%s' and '%s' in category '%s': %s",
            filename1,
            filename2,
            category,
            e,
        )
        return jsonify({"error": str(e)}), 400

    if rmse is None:
        return jsonify({"error": "No valid timeseries data provided"}), 400

    logger.info(
        "Successfully calculated RMSE for files '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )

    return jsonify({"rmse": rmse}), 200


@app.route("/api/timeseries/difference", methods=["GET"])
def get_difference():
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(filename=filename1, category=category)
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(filename=filename2, category=category)
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        difference_series = metric_service.calculate_difference(
            serie1, serie2, tolerance
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"difference": difference_series}), 200


@app.route("/api/timeseries/rolling_mean", methods=["GET"])
def get_rolling_mean():
    filename = request.args.get("filename")
    category = request.args.get("category")
    window_size = request.args.get("window_size", "1d")

    try:
        data = timeseries_manager.get_timeseries(filename=filename, category=category)
        serie = metric_service.extract_series_from_dict(data, category, filename)

        rolling_mean_series = metric_service.calculate_rolling_mean(serie, window_size)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"rolling_mean": rolling_mean_series}), 200


@app.route("/api/timeseries/dtw", methods=["GET"])
def get_dtw():
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")

    try:
        data1 = timeseries_manager.get_timeseries(
            filename=filename1, category=category, start=start, end=end
        )
        series1 = metric_service.extract_series_from_dict(data1, category, filename1)
        data2 = timeseries_manager.get_timeseries(
            filename=filename2, category=category, start=start, end=end
        )
        series2 = metric_service.extract_series_from_dict(data2, category, filename2)

        dtw_distance = metric_service.calculate_dtw(series1, series2)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"dtw_distance": dtw_distance}), 200


@app.route("/api/timeseries/euclidean_distance", methods=["GET"])
def get_euclidean_distance():
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(filename=filename1, category=category)
        series1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(filename=filename2, category=category)
        series2 = metric_service.extract_series_from_dict(data2, category, filename2)

        euclidean_distances = metric_service.calculate_euclidean_distance(
            series1, series2, tolerance
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"euclidean_distance": euclidean_distances}), 200


@app.route("/api/upload-timeseries", methods=["POST"])
def add_timeseries():
    """
    Upload new timeseries data.

    Returns:
        JSON response indicating success or failure.
    """
    data = request.get_json()
    if not isinstance(data, dict):
        logger.error(
            "Invalid data format: Expected a JSON object with keys as identifiers"
        )
        return (
            jsonify({"error": "Expected a JSON object with keys as identifiers"}),
            400,
        )
    current_timeseries = timeseries_manager.timeseries.copy()
    for time, values in data.items():
        if not isinstance(values, dict):
            logger.error(
                "Invalid data format for time '%s': Expected a dictionary", time
            )
            return (
                jsonify(
                    {
                        f"error": "Invalid data format for time '{time}': Expected a dictionary"
                    }
                ),
                400,
            )
        try:
            timeseries_manager.add_timeseries(time, values)
            current_timeseries[time] = values
        except ValueError as e:
            logger.error("Error adding timeseries for time '%s': %s", time, e)
            timeseries_manager.timeseries = current_timeseries  # Restore previous state
            return jsonify({"error": str(e)}), 400
    logger.info("All timeseries data uploaded successfully")
    return jsonify({"status": "Data uploaded"}), 201


@app.route("/api/clear-timeseries", methods=["DELETE"])
def clear_timeseries():
    """
    Clear all timeseries data.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        timeseries_manager.clear_timeseries()
    except Exception as e:
        logger.error("Error clearing timeseries: %s", e)
        return jsonify({"error": str(e)}), 400
    return jsonify({"status": "All timeseries cleared"}), 200


from services.plugin_service import validate_plugin_code, execute_plugin_code, get_template


@app.route("/api/plugins/validate", methods=["POST"])
def api_validate_plugin_code():
    """
    Validate plugin code for security and correctness.

    Request body:
        code: Python code to validate

    Returns:
        Validation result with valid (bool) and optionally error (str).
    """
    data = request.get_json()

    if not data or "code" not in data:
        return jsonify({"error": "No code provided"}), 400

    result = validate_plugin_code(data["code"])

    return jsonify(result), 200


@app.route("/api/plugins/execute", methods=["POST"])
def api_execute_plugin():
    """
    Execute plugin code on two time series.

    NOTE: Plugin code is sent directly from the client (stored in localStorage).
    This keeps plugins private to each user.

    Request body:
        code: Python code implementing calculate(series1, series2) function
        filename1: First file name
        filename2: Second file name
        category: Category name
        start: Optional start time
        end: Optional end time

    Returns:
        Result value or error.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    required_fields = ["code", "filename1", "filename2", "category"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        # Fetch time series data
        data1 = timeseries_manager.get_timeseries(
            filename=data["filename1"],
            category=data["category"],
            start=data.get("start"),
            end=data.get("end")
        )
        series1 = metric_service.extract_series_from_dict(
            data1, data["category"], data["filename1"]
        )

        data2 = timeseries_manager.get_timeseries(
            filename=data["filename2"],
            category=data["category"],
            start=data.get("start"),
            end=data.get("end")
        )
        series2 = metric_service.extract_series_from_dict(
            data2, data["category"], data["filename2"]
        )

        # Execute the plugin code (sandboxed)
        result = execute_plugin_code(data["code"], series1, series2)

        if "error" in result:
            logger.error("Plugin execution error: %s", result["error"])
            return jsonify(result), 400

        logger.info(
            "Plugin executed successfully on %s and %s",
            data["filename1"], data["filename2"]
        )
        return jsonify(result), 200

    except Exception as e:
        logger.error("Error executing plugin: %s", e)
        return jsonify({"error": str(e)}), 400


def all_required_services_are_running():
    return True


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
