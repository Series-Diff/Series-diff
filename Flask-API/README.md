# This is documentation of Flask API for SeriesDiff Application

## File Structure

```
|- services – services with whole application logic
| |- metric_service.py - service to calculate metrics and statistics
| |- plugin_service.py - service to handle user plugins
| |- sandboxed_executor.py - service that execute plugins 
|                            in isolated environment
|- tests – Unit tests
| |- test_metric_service.py - unittests of metric service
| |- test_time_series_manager.py - unittests of time series manager
|
|- utils - utility classes with helper functions
| |- data_utils.py - helper functions to manipulate data
| |- time_utils.py - helper functions to handle datetime
|
| .dockerginore - file with patterns of files that should be 
|                 ignored by docker
| Dockerfile – main Dockerfile to containerize API
| Dockerfile.executor - Dockerfile used to build plugin executor
| Dockerfile.local - Dockerfile to build local machine
| README.md – documentation of API
| gunicorn_config.py - file with set of rules to run server machine
| main.py – main file of program
| poetry.lock - file with dependencies metadata
| pyproject.toml - file with used dependencies
```

## Running Application

### Web browser access
API can be accessed at [api.seriesdiff.com](https://api.seriesdiff.com/). The list of accessible endpoints is listed in [API Endopoints](#api-endpoints) section
###  Local development
If you want to develop application on your local machine you can use one of the two command
1. If you want to run only backend on the local environment you can use for it command `gunicorn -c ./gunicorn_config.py main:app`
2. If you want to run docker container to run application you can do it by two ways
   - build and run flask api container (with redis server):

      ```
      docker network create flask-api-net

      docker run -d --name redis  --network flask-api-net redis:alpine

      docker build -f Dockerfile.executor -t plugin-executor .

      docker run -d --name plugin-executor --network flask-api-net -e REDIS_HOST=redis plugin-executor

      docker build -f Dockerfile.local -t flask-api-local .

      docker run -it --rm --name flask-api --network flask-api-net -e REDIS_HOST=redis -p 5000:5000 flask-api-local
      ```
    - Use docker compose to run the whole application
    
       ```
       # to run docker compose you have to be in root project directory
       cd .. 

       docker compose up --build
       ```

## Testing Application

### Unit/Integration Tests (unittest with coverage)
- Tests are in the `tests/` folder (files matching `test_*.py`).
- Run tests with coverage summary: `coverage run -m unittest discover -s tests -p "test_*.py" && coverage report -m`.
- Run with HTML report and auto-open: `coverage run -m unittest discover -s tests -p "test_*.py" && coverage html & start htmlcov\index.html` (runs tests, generates report in `htmlcov/`, and opens `index.html` in default browser).
  - For detailed view, open `htmlcov/index.html` manually.

**Attention**  
Be sure you have unittest and coverage packages installed.

## API Endpoints

### Health & Status

#### `GET /health`
Health check endpoint - verifies Redis and other required services are running.

**Response:** `200 OK` or `503 Service Unavailable`

#### `GET /`
API status endpoint.

**Response:**
```json
{
  "status": "API is working",
  "service": "SeriesDiff Backend"
}
```

---

### Data Management

#### `GET /api/timeseries`
Get timeseries data for a specific filename, category and optional time interval.

**Query Parameters:**
- `time` - Specific timestamp (optional)
- `filename` - Name of the file
- `category` - Data category
- `start` - Start date for filtering (optional)
- `end` - End date for filtering (optional)
- `tz` - Timezone (optional, default: "Europe/Warsaw")
- `keep_offset` - Keep timezone offset (optional, default: false)

**Headers:**
- `X-Session-ID` - Session token (auto-generated if not provided)

**Rate Limit:** 100 requests per minute

**Response:** JSON object with timeseries data

#### `POST /api/upload-timeseries`
Upload new timeseries data to the session.

**Headers:**
- `X-Session-ID` - Session token

**Request Body:**
```json
{
  "2024-01-01T00:00:00": {
    "category1": {
      "file1.csv": 123.45,
      "file2.csv": 678.90
    }
  }
}
```

**Response:** `201 Created` with status message

#### `DELETE /api/clear-timeseries`
Clear all timeseries data for the current session.

**Headers:**
- `X-Session-ID` - Session token

**Response:** `200 OK` with status message

#### `POST /api/transform/pivot`
Pivot uploaded CSV or JSON data using Pandas.

**Form Data:**
- `file` - File to pivot (CSV or JSON)
- `index_col` - Column to use as index
- `columns_col` - Column to use as categories
- `values_col` - Column containing values

**Response:** JSON array of pivoted records

---

### Single Series Statistical Metrics

All endpoints below accept the following query parameters:
- `filename` - Name of the file
- `category` - Data category
- `start` - Start date for filtering (optional)
- `end` - End date for filtering (optional)
- `tz` - Timezone (optional, default: "Europe/Warsaw")
- `keep_offset` - Keep timezone offset (optional, default: false)

#### `GET /api/timeseries/mean`
Calculate the mean value of the timeseries.

**Response:** `{"mean": 123.45}`

#### `GET /api/timeseries/median`
Calculate the median value of the timeseries.

**Response:** `{"median": 123.45}`

#### `GET /api/timeseries/variance`
Calculate the variance of the timeseries.

**Response:** `{"variance": 123.45}`

#### `GET /api/timeseries/standard_deviation`
Calculate the standard deviation of the timeseries.

**Response:** `{"standard_deviation": 123.45}`

#### `GET /api/timeseries/coefficient_of_variation`
Calculate the coefficient of variation (CV) of the timeseries.

**Response:** `{"coefficient_of_variation": 0.12}`

#### `GET /api/timeseries/iqr`
Calculate the interquartile range (IQR) of the timeseries.

**Response:** `{"iqr": 50.5}`

#### `GET /api/timeseries/autocorrelation`
Calculate the autocorrelation of the timeseries.

**Response:** `{"autocorrelation": 0.85}`

---

### Time Series Transformations

#### `GET /api/timeseries/rolling_mean`
Calculate rolling mean with a specified window size.

**Query Parameters:**
- `filename` - Name of the file
- `category` - Data category
- `window_size` - Window size (default: "1d")
- `tz` - Timezone (optional, default: "Europe/Warsaw")
- `keep_offset` - Keep timezone offset (optional, default: false)

**Response:** `{"rolling_mean": {...}}`

#### `GET /api/timeseries/difference`
Calculate point-by-point difference between two timeseries.

**Query Parameters:**
- `filename1` - First file name
- `filename2` - Second file name
- `category` - Data category
- `tolerance` - Time alignment tolerance (optional)
- `tz` - Timezone (optional, default: "Europe/Warsaw")
- `keep_offset` - Keep timezone offset (optional, default: false)

**Response:** `{"difference": {...}}`

---

### Two Series Comparison Metrics

All endpoints below accept the following query parameters:
- `filename1` - First file name
- `filename2` - Second file name
- `category` - Data category
- `start` - Start date for filtering (optional)
- `end` - End date for filtering (optional)
- `tolerance` - Time alignment tolerance (optional)
- `tz` - Timezone (optional, default: "Europe/Warsaw")
- `keep_offset` - Keep timezone offset (optional, default: false)

#### `GET /api/timeseries/pearson_correlation`
Calculate Pearson correlation coefficient between two timeseries.

**Response:** `{"pearson_correlation": 0.95}`

#### `GET /api/timeseries/cosine_similarity`
Calculate cosine similarity between two timeseries.

**Response:** `{"cosine_similarity": 0.98}`

#### `GET /api/timeseries/mae`
Calculate Mean Absolute Error (MAE) between two timeseries.

**Response:** `{"mae": 12.34}`

#### `GET /api/timeseries/rmse`
Calculate Root Mean Squared Error (RMSE) between two timeseries.

**Response:** `{"rmse": 15.67}`

#### `GET /api/timeseries/dtw`
Calculate Dynamic Time Warping (DTW) distance between two timeseries.

**Response:** `{"dtw_distance": 234.56}`

#### `GET /api/timeseries/euclidean_distance`
Calculate Euclidean distance between two timeseries.

**Response:** `{"euclidean_distance": 123.45}`

#### `GET /api/timeseries/scatter_data`
Get aligned data points for scatter plot visualization.

**Query Parameters:**
- `filename1` - First file name
- `filename2` - Second file name
- `category` - Data category
- `tolerance` - Time alignment tolerance (optional)
- `start_date` - Start date for filtering (optional)
- `end_date` - End date for filtering (optional)

**Response:**
```json
[
  {"x": 10.5, "y": 12.3, "time": "2024-01-01T00:00:00"},
  {"x": 11.2, "y": 13.1, "time": "2024-01-02T00:00:00"}
]
```

---

### Plugin System

#### Plugins requirements
In order for the plugin to be validated correctly, it must implement the calculate method with the structure:  
```  calculate(series1, series2) -> float ```.

The container on which the plugins are executed is equipped with the following libraries that can be used in functions:
- pandas (pd)
-  numpy (np)
 - scipy
- scipy.stats
- scipy.signal,
- sklearn.metrics
- statsmodels.api (sm),
- statsmodels.tsa.api (tsa)

Additionally you can use helper function get_alligned_data with the following structure:
``` get_aligned_data(series1, series2, tolerance=None)``` <br>
Function aligns two series by timestamp. Returns a DataFrame with both time series aligned by timestamp with columns 'value1' and 'value2'.


#### `POST /api/plugins/validate`
Validate custom plugin code for security and syntax correctness.

**Request Body:**
```json
{
  "code": "def calculate(series1, series2):\n    return series1.mean()"
}
```

**Response:**
```json
{
  "valid": true
}
```
or
```json
{
  "valid": false,
  "error": "Security violation: unauthorized import"
}
```

#### `POST /api/plugins/execute`
Execute custom plugin code on multiple file pairs in a sandboxed environment.

**Request Body:**
```json
{
  "code": "def calculte(series1, series2):
              return series1.mean() - series2.mean()",
  "category": "temperature",
  "filenames": ["file1.csv", "file2.csv", "file3.csv"],
  "start": "2024-01-01",
  "end": "2024-12-31"
}
```

**Response:**
```json
{
  "results": {
    "file1.csv": {
      "file1.csv": 0.0,
      "file2.csv": 5.3,
      "file3.csv": -2.1
    },
    "file2.csv": {
      "file1.csv": -5.3,
      "file2.csv": 0.0,
      "file3.csv": -7.4
    }
  }
}
```

---

### Common Features

**Session Management:**
- All endpoints support session-based data isolation using the `X-Session-ID` header
- If no session ID is provided, a new one is automatically generated and returned in the response headers

**Timezone Support:**
- Most endpoints support `tz` (timezone string) and `keep_offset` (boolean) query parameters
- Default timezone: "Europe/Warsaw"
- Timestamps are converted to the requested timezone in responses

**Error Handling:**
- `400 Bad Request` - Invalid parameters or data format
- `404 Not Found` - Requested timeseries data not found
- `500 Internal Server Error` - Unexpected server error
- All errors return JSON: `{"error": "Error message"}`

**Data Format:**
- NaN values are automatically converted to `null` in JSON responses
- Maximum request size: 16MB

# Authors

- Michał Bojara
- Mikołaj Szulc
- Franciszka Jędraszak
- Karol Kowalczyk
- Natalia Szymczak
