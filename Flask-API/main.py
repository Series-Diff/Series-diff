import sys
import uuid
import math
from container import container
import services.metric_service as metric_service
from utils.data_utils import pivot_file
from flask_cors import CORS
from flask import Flask, jsonify, request
from utils.time_utils import convert_timeseries_keys_timezone
from services.plugin_service import validate_plugin_code

sys.stdout.reconfigure(line_buffering=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max
CORS(
    app,
    expose_headers=["X-Session-ID"],
    resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        }
    },
)

logger = container.logger
redis_client = container.redis_client
timeseries_manager = container.time_series_manager
limiter = container.limiter
limiter.init_app(app)


@app.errorhandler(429)
def ratelimit_handler(e):
    """
    Handle rate limit exceeded errors with proper CORS headers.
    Flask-Limiter's default 429 response may not include CORS headers,
    causing browsers to block the response as a network error.
    """
    response = jsonify(
        {
            "error": "Rate limit exceeded",
            "message": (
                str(e.description)
                if hasattr(e, "description")
                else "Too many requests. Please try again later."
            ),
            "retry_after": (
                e.get_response().headers.get("Retry-After")
                if hasattr(e, "get_response")
                else None
            ),
        }
    )
    response.status_code = 429
    # Ensure CORS headers are present
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Session-ID"
    response.headers["Access-Control-Expose-Headers"] = "X-Session-ID, Retry-After"
    if hasattr(e, "get_response"):
        retry_after = e.get_response().headers.get("Retry-After")
        if retry_after:
            response.headers["Retry-After"] = retry_after
    return response


def _all_required_services_are_running():
    """
    Check if all required services are running.
    """
    try:
        redis_client.ping()
    except Exception:
        logger.error("Redis service is not running.")
        return False
    return True


def _get_session_token():
    """
    Retrieve or generate a session token from request headers.
    """
    token = request.headers.get("X-Session-ID")
    is_new_token = False
    if not token or token == "null" or len(token.strip()) < 10:
        token = str(uuid.uuid4())
        logger.info(f"Generated new session token: {token}")
        is_new_token = True
    return token, is_new_token


def _create_response(data, status_code=200, token=None):
    """
    Create a Flask response with optional session token.
    Converts NaN values to null for valid JSON.

    :param data: Response data
    :param status_code: HTTP status code for the response
    :param token: Optional session token to include in the response headers
    """

    # Convert NaN to None (null in JSON) recursively
    def convert_nan(obj):
        if isinstance(obj, float) and math.isnan(obj):
            return None
        elif isinstance(obj, dict):
            return {k: convert_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_nan(item) for item in obj]
        return obj

    cleaned_data = convert_nan(data)
    response = jsonify(cleaned_data)
    response.status_code = status_code
    if token:
        response.headers["X-Session-ID"] = token
        response.headers["Access-Control-Expose-Headers"] = "X-Session-ID"
    return response


def _apply_timezone_conversion(data, param_name="data"):
    """
    Apply timezone conversion to timeseries data.

    :param data: Dictionary with timeseries data (keys are timestamps)
    :param param_name: Name of the parameter for logging
    """
    if not data:
        return data

    tz_param = request.args.get("tz", "Europe/Warsaw")
    keep_offset_param = request.args.get("keep_offset", "false").lower() in (
        "1",
        "true",
        "yes",
    )

    try:
        return convert_timeseries_keys_timezone(
            data,
            tz_str=tz_param,
            keep_offset=keep_offset_param,
        )

    except Exception as e:
        logger.warning(
            "Time conversion failed for %s: %s. Returning original timestamps.",
            param_name,
            e,
        )
        return data


@app.route("/health")
def health_check():
    try:
        if _all_required_services_are_running():
            return "OK", 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
    return "Service Unavailable", 503


@app.route("/", methods=["GET"])
def index():
    return _create_response(
        {
            "status": "API is working",
            "service": "SeriesDiff Backend",
        },
        200,
    )


@app.route("/api/timeseries", methods=["GET"])
@limiter.limit("100 per minute")
def get_timeseries():
    """
    Get timeseries data for a specific filename, category and time interval.

    Returns:
        JSON response with timeseries data or error message.
    """
    token, _ = _get_session_token()
    time = request.args.get("time")
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            timestamp=time,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    except Exception as e:
        logger.error(
            "Unexpected error fetching timeseries for filename '%s' and category '%s' and time interval '%s - %s': %s",
            filename,
            category,
            start,
            end,
            e,
        )
        return _create_response({"error": "Unexpected error occurred"}, 500)
    data = _apply_timezone_conversion(data, "timeseries")
    if data is None:
        logger.warning(
            "Timeseries not found for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "Timeseries not found"}, 404)
    logger.info(
        "Successfully fetched timeseries for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )
    return _create_response(data, 200, token=token)


@app.route("/api/transform/pivot", methods=["POST"])
def transform_pivot():
    """
    Pivots uploaded data (CSV or JSON) using Pandas.
    Returns the transformed data as a JSON list of records.
    """
    if "file" not in request.files:
        return _create_response({"error": "No file part in the request"}, 400)

    file = request.files["file"]
    if file.filename == "":
        return _create_response({"error": "No selected file"}, 400)

    index_col = request.form.get("index_col")
    columns_col = request.form.get("columns_col")
    values_col = request.form.get("values_col")

    if not all([index_col, columns_col, values_col]):
        return _create_response(
            {"error": "Please select columns for Index, Category and Value."},
            400,
        )

    try:
        result_data = pivot_file(
            file,
            index_col,
            columns_col,
            values_col,
        )

        return _create_response(result_data, 200)

    except Exception as e:
        logger.error(f"Error pivoting data: {e}")
        return _create_response({"error": str(e)}, 500)


@app.route("/api/timeseries/scatter_data", methods=["GET"])
def get_scatter_data():
    """
    Returns aligned data points for scatter plot using the same logic as Pearson correlation.
    """
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")  # Opcjonalnie
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        # Pobranie danych
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start_date,
            end=end_date,
        )
        data1 = _apply_timezone_conversion(data1, "data1")
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)
        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start_date,
            end=end_date,
        )
        data2 = _apply_timezone_conversion(data2, "data2")
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        # Użycie wspólnej logiki alignowania
        df_merged = metric_service.get_aligned_data(serie1, serie2, tolerance)

        # Przygotowanie odpowiedzi JSON
        # Format: [{x: 10, y: 12, time: "2023-01-01..."}, ...]
        result = []
        for index, row in df_merged.iterrows():
            result.append(
                {
                    "x": row["value1"],
                    "y": row["value2"],
                    "time": index.isoformat(),
                }
            )

        return _create_response(result, 200)

    except Exception as e:
        logger.error(f"Error getting scatter data: {e}")
        return _create_response({"error": str(e)}, 400)


@app.route("/api/timeseries/mean", methods=["GET"])
def get_mean():
    """
    Get the mean value of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the mean value or error message.
    """
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if mean is None:
        logger.warning(
            "No valid timeseries data provided for mean calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated mean for provided timeseries data: filename '%s', category '%s', time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"mean": mean}, 200)


@app.route("/api/timeseries/median", methods=["GET"])
def get_median():
    """
    Get the median value of the timeseries for a specific filename and category.

    Returns:
        JSON response with the median value or error message.
    """

    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if median is None:
        logger.warning(
            "No valid timeseries data provided for median calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated median for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"median": median}, 200)


@app.route("/api/timeseries/variance", methods=["GET"])
def get_variance():
    """
    Get the variance of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the variance value or error message.
    """

    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if variance is None:
        logger.warning(
            "No valid timeseries data provided for variance calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated variance for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"variance": variance}, 200)


@app.route("/api/timeseries/standard_deviation", methods=["GET"])
def get_standard_deviation():
    """
    Get the standard deviation of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the standard deviation value or error message.
    """
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if std_dev is None:
        logger.warning(
            "No valid timeseries data provided for standard deviation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated standard deviation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"standard_deviation": std_dev}, 200)


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
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if acf_value is None:
        logger.warning(
            "No valid timeseries data provided for autocorrelation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated autocorrelation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"autocorrelation": acf_value}, 200)


@app.route("/api/timeseries/coefficient_of_variation", methods=["GET"])
def get_coefficient_of_variation():
    """
    Get the coefficient of variation of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the coefficient of variation value or error message.
    """
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if cv is None:
        logger.warning(
            "No valid timeseries data provided for coefficient of variation calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated coefficient of variation for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"coefficient_of_variation": cv}, 200)


@app.route("/api/timeseries/iqr", methods=["GET"])
def get_iqr():
    """
    Get the interquartile range (IQR) of the timeseries for a specific filename, category and time interval.

    Returns:
        JSON response with the IQR value or error message.
    """
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    if iqr is None:
        logger.warning(
            "No valid timeseries data provided for IQR calculation for filename '%s' and category '%s' and time interval '%s - %s'",
            filename,
            category,
            start,
            end,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated IQR for provided timeseries data for filename '%s' and category '%s' and time interval '%s - %s'",
        filename,
        category,
        start,
        end,
    )

    return _create_response({"iqr": iqr}, 200)


@app.route("/api/timeseries/pearson_correlation", methods=["GET"])
def get_pearson_correlation():
    """
    Get the Pearson correlation between two timeseries for specific filenames, category and time interval.

    Returns:
        JSON response with the Pearson correlation value or error message.
    """
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    logger.info(
        f"Pearson correlation request: {filename1} vs {filename2}, category={category}"
    )

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start,
            end=end,
        )
        logger.info(
            f"Pearson: data1 keys count = {len(data1) if isinstance(data1, dict) else 'N/A'}"
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)
        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start,
            end=end,
        )
        logger.info(
            f"Pearson: data2 keys count = {len(data2) if isinstance(data2, dict) else 'N/A'}"
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        logger.info(f"Pearson: serie1_len={len(serie1)}, serie2_len={len(serie2)}")

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
        return _create_response({"error": str(e)}, 400)
    if correlation is None:
        logger.warning(
            "No valid timeseries data provided for Pearson correlation calculation for filenames '%s' and '%s' in category '%s'",
            filename1,
            filename2,
            category,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)
    logger.info(
        "Successfully calculated Pearson correlation for provided timeseries data for filenames '%s' and '%s' in category '%s': result=%s",
        filename1,
        filename2,
        category,
        correlation,
    )
    return _create_response({"pearson_correlation": correlation}, 200)


@app.route("/api/timeseries/cosine_similarity", methods=["GET"])
def get_cosine_similarity():
    """
    Get the cosine similarity between two timeseries for specific filenames, category and time interval.

    Returns:
        JSON response with the cosine similarity value or error message.
    """
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        # Pobierz dane dla obu plików
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start,
            end=end,
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)
    except Exception as e:
        logger.error("Unexpected error calculating cosine similarity: %s", e)
        return _create_response({"error": "Unexpected error occurred"}, 500)

    if similarity is None:
        logger.warning(
            "No valid timeseries data provided for cosine similarity calculation for filenames '%s' and '%s' in category '%s'",
            filename1,
            filename2,
            category,
        )
        return _create_response({"error": "No valid timeseries data provided"}, 400)

    logger.info(
        "Successfully calculated cosine similarity for provided timeseries data for filenames '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )
    return _create_response({"cosine_similarity": similarity}, 200)


@app.route("/api/timeseries/mae", methods=["GET"])
def get_mae():
    """
    Calculate MAE (Mean Absolute Error) between two timeseries.
    """
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start,
            end=end,
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)

    if mae is None:
        return _create_response({"error": "No valid timeseries data provided"}, 400)

    logger.info(
        "Successfully calculated MAE for files '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )

    return _create_response({"mae": mae}, 200)


@app.route("/api/timeseries/rmse", methods=["GET"])
def get_rmse():
    """
    Calculate RMSE (Root Mean Squared Error) between two timeseries.
    """
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start,
            end=end,
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start,
            end=end,
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
        return _create_response({"error": str(e)}, 400)

    if rmse is None:
        return _create_response({"error": "No valid timeseries data provided"}, 400)

    logger.info(
        "Successfully calculated RMSE for files '%s' and '%s' in category '%s'",
        filename1,
        filename2,
        category,
    )

    return _create_response({"rmse": rmse}, 200)


@app.route("/api/timeseries/difference", methods=["GET"])
def get_difference():
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
        )
        serie1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
        )
        serie2 = metric_service.extract_series_from_dict(data2, category, filename2)

        difference_series = metric_service.calculate_difference(
            serie1, serie2, tolerance
        )

    except Exception as e:
        return _create_response({"error": str(e)}, 400)

    difference_series = _apply_timezone_conversion(difference_series, "difference")
    return _create_response({"difference": difference_series}, 200)


@app.route("/api/timeseries/rolling_mean", methods=["GET"])
def get_rolling_mean():
    token, _ = _get_session_token()
    filename = request.args.get("filename")
    category = request.args.get("category")
    window_size = request.args.get("window_size", "1d")

    try:
        data = timeseries_manager.get_timeseries(
            token=token,
            filename=filename,
            category=category,
        )
        serie = metric_service.extract_series_from_dict(data, category, filename)

        rolling_mean_series = metric_service.calculate_rolling_mean(
            serie,
            window_size,
        )

    except Exception as e:
        return _create_response({"error": str(e)}, 400)

    rolling_mean_series = _apply_timezone_conversion(
        rolling_mean_series,
        "rolling_mean",
    )
    return _create_response({"rolling_mean": rolling_mean_series}, 200)


@app.route("/api/timeseries/dtw", methods=["GET"])
def get_dtw():
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")

    logger.info(f"DTW request: {filename1} vs {filename2}, category={category}")

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
            start=start,
            end=end,
        )
        series1 = metric_service.extract_series_from_dict(data1, category, filename1)
        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
            start=start,
            end=end,
        )
        series2 = metric_service.extract_series_from_dict(data2, category, filename2)

        logger.info(f"DTW: series1_len={len(series1)}, series2_len={len(series2)}")

        dtw_distance = metric_service.calculate_dtw(series1, series2)
        logger.info(f"DTW result: {dtw_distance}")

    except Exception as e:
        logger.error(f"DTW error: {e}")
        return _create_response({"error": str(e)}, 400)

    return _create_response({"dtw_distance": dtw_distance}, 200)


@app.route("/api/timeseries/euclidean_distance", methods=["GET"])
def get_euclidean_distance():
    token, _ = _get_session_token()
    filename1 = request.args.get("filename1")
    filename2 = request.args.get("filename2")
    category = request.args.get("category")
    tolerance = request.args.get("tolerance")

    logger.info(
        f"Euclidean distance request: {filename1} vs {filename2}, category={category}"
    )

    try:
        data1 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename1,
            category=category,
        )
        series1 = metric_service.extract_series_from_dict(data1, category, filename1)

        data2 = timeseries_manager.get_timeseries(
            token=token,
            filename=filename2,
            category=category,
        )
        series2 = metric_service.extract_series_from_dict(data2, category, filename2)

        logger.info(
            f"Euclidean: series1_len={len(series1)}, series2_len={len(series2)}"
        )

        euclidean_distances = metric_service.calculate_euclidean_distance(
            series1,
            series2,
            tolerance,
        )
        logger.info(f"Euclidean result: {euclidean_distances}")

    except Exception as e:
        logger.error(f"Euclidean error: {e}")
        return _create_response({"error": str(e)}, 400)

    return _create_response({"euclidean_distance": euclidean_distances}, 200)


@app.route("/api/upload-timeseries", methods=["POST"])
def add_timeseries():
    """
    Upload new timeseries data.

    Returns:
        JSON response indicating success or failure.
    """
    token, _ = _get_session_token()
    data = request.get_json()
    if not isinstance(data, dict):
        logger.error(
            "Invalid data format: Expected a JSON object with keys as identifiers"
        )
        return _create_response(
            {"error": "Expected a JSON object with keys as identifiers"},
            400,
        )
    try:
        current_timeseries = timeseries_manager.get_timeseries(token=token)
        for time, values in data.items():
            if not isinstance(values, dict):
                logger.error(
                    "Invalid data format for time '%s': Expected a dictionary",
                    time,
                )
                return _create_response(
                    {
                        "error": f"Invalid data format for time '{time}': Expected a dictionary"
                    },
                    400,
                )

            # Normalize category and filename by trimming whitespace to handle CSV/JSON inconsistencies
            normalized_values = {}
            for category, category_data in values.items():
                if isinstance(category_data, dict):
                    normalized_category_key = category.strip()
                    normalized_category_data = {}
                    for filename, file_value in category_data.items():
                        normalized_filename = filename.strip()
                        normalized_category_data[normalized_filename] = file_value
                    normalized_values[normalized_category_key] = (
                        normalized_category_data
                    )
                else:
                    normalized_values[category.strip()] = category_data

            timeseries_manager.add_timeseries(token, time, normalized_values)
            current_timeseries[time] = normalized_values
    except ValueError as e:
        logger.error("Error adding timeseries for time '%s': %s", time, e)
        timeseries_manager.sessions[token] = (
            current_timeseries  # Restore previous state
        )
        return _create_response({"error": str(e)}, 400)
    logger.info("All timeseries data uploaded successfully")
    return _create_response({"status": "Data uploaded"}, 201)


@app.route("/api/clear-timeseries", methods=["DELETE"])
def clear_timeseries():
    """
    Clear all timeseries data.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        token, _ = _get_session_token()
        timeseries_manager.clear_timeseries(token=token)
    except Exception as e:
        logger.error("Error clearing timeseries: %s", e)
        return _create_response({"error": str(e)}, 400)
    logger.info("All timeseries for token %s cleared successfully", token)
    return _create_response({"status": "All timeseries cleared"}, 200)


@app.route("/api/plugins/validate", methods=["POST"])
def api_validate_plugin_code():
    """
    Validate plugin code for security and correctness.

    Request body:
        code: Python code to validate

    Returns:
        Validation result with valid (bool) and optionally error (str).
    """

    token, _ = _get_session_token()
    data = request.get_json()

    if not data or "code" not in data:
        return _create_response({"error": "No code provided"}, 400)

    result = validate_plugin_code(data["code"])

    return _create_response(result, 200, token=token)


def _validate_plugin_request(data):
    """Validate plugin execution request data."""
    if not data:
        return {"error": "No data provided"}

    required_fields = ["code", "category", "filenames"]
    for field in required_fields:
        if field not in data:
            return {"error": f"Missing required field: {field}"}

    if not data["filenames"] or len(data["filenames"]) < 2:
        return {"error": "At least 2 filenames required"}

    return None


def _fetch_series_data(filenames, category, start, end, token):
    """Fetch all series data for given filenames."""
    series_data = {}
    for filename in filenames:
        try:
            raw_data = timeseries_manager.get_timeseries(
                filename=filename,
                category=category,
                start=start,
                end=end,
                token=token,
            )
            series_data[filename] = metric_service.extract_series_from_dict(
                raw_data, category, filename
            )
        except Exception as e:
            logger.error("Error extracting series data for file '%s': %s", filename, e)
            raise RuntimeError(
                f"Error extracting series data for file '{filename}': {e}"
            ) from e
    return series_data


def _build_execution_pairs(filenames, series_data):
    """Build pairs for execution from filenames and series data."""
    pairs = []
    for file1 in filenames:
        for file2 in filenames:
            pairs.append(
                {
                    "series1": series_data[file1],
                    "series2": series_data[file2],
                    "key": f"{file1}|{file2}",
                }
            )
    return pairs


def _transform_results_to_map(execution_results):
    """Transform flat execution results to nested structure."""
    results_map = {}
    for item in execution_results:
        key = item.get("key", "")
        if "|" in key:
            f1, f2 = key.split("|", 1)
            if f1 not in results_map:
                results_map[f1] = {}
            results_map[f1][f2] = item.get("result") if "result" in item else None
    return results_map


@app.route("/api/plugins/execute", methods=["POST"])
def api_execute_plugin():
    """
    Execute plugin code on multiple file pairs in a single Docker container.
    """
    from services.sandboxed_executor import get_executor

    token, _ = _get_session_token()
    data = request.get_json()

    # Validate request
    validation_error = _validate_plugin_request(data)
    if validation_error:
        return _create_response(validation_error, 400)

    try:
        # Fetch all series data
        series_data = _fetch_series_data(
            data["filenames"],
            data["category"],
            data.get("start"),
            data.get("end"),
            token,
        )

        # Build pairs and execute
        pairs = _build_execution_pairs(data["filenames"], series_data)
        executor = get_executor()
        result = executor.execute(data["code"], pairs)

        # Check for top-level execution errors
        if "error" in result:
            logger.error("Plugin execution error: %s", result["error"])
            return _create_response(result, 400)

        # Check for item-level errors
        execution_results = result.get("results", [])
        errors = [item["error"] for item in execution_results if "error" in item]
        if errors:
            logger.warning("Plugin code execution failed: %s", errors[0])
            return _create_response({"error": errors[0]}, 400)

        # Transform results to nested structure
        results_map = _transform_results_to_map(execution_results)
        logger.info("Plugin executed successfully for %d pairs", len(pairs))
        return _create_response({"results": results_map}, 200, token=token)

    except Exception as e:
        logger.error("Error executing plugin: %s", e)
        return _create_response({"error": str(e)}, 400)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
