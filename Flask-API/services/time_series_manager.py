from datetime import datetime

try:
    import orjson as json

    # orjson returns bytes, so we need wrapper functions
    def _json_loads(x):
        return json.loads(x)

    def _json_dumps(x):
        return json.dumps(x).decode("utf-8")

except ImportError:
    import json

    def _json_loads(x):
        return json.loads(x)

    def _json_dumps(x):
        return json.dumps(x)


from typing import Any, Dict, List, Optional
from logging import Logger
from redis import Redis


class TimeSeriesManager:
    """
    Service class to manage time series data.

    Raises:
        ValueError: If the data format is invalid
        ValueError: If required keys are missing in the timeserie
        ValueError: If the timeserie data is invalid

    Returns:
        bool: True if added successfully, False otherwise
    """

    def __init__(self, redis_client: Redis, logger: Logger):
        self.redis = redis_client
        self.logger = logger
        self._ttl_seconds = 3600 * 2  # 2 hours

    def _get_key(self, token: str) -> str:
        """Generate Redis key for a given token."""
        return f"session:{token}"

    def _refresh_ttl(self, token: str) -> None:
        """Refresh the TTL for an active session to keep it alive."""
        key = self._get_key(token)
        try:
            if self.redis.exists(key):
                self.redis.expire(key, self._ttl_seconds)
        except Exception as e:
            self.logger.warning(f"Failed to refresh TTL for token {token}: {e}")

    def _validate_parameters(
        self,
        time: Optional[str] = None,
        filename: Optional[str] = None,
        category: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
        filenames: Optional[list] = None,
        categories: Optional[list] = None,
    ):
        """Validate input parameters."""
        for param, param_type in [
            (time, "time"),
            (filename, "filename"),
            (category, "category"),
            (start, "start"),
            (end, "end"),
        ]:
            if param and not isinstance(param, str):
                raise ValueError(
                    f"Invalid {param_type} format: {param}. Expected a string."
                )

        if filenames and not isinstance(filenames, list):
            raise ValueError(f"Invalid filenames format: {filenames}. Expected list.")
        if categories and not isinstance(categories, list):
            raise ValueError(f"Invalid categories format: {categories}. Expected list.")

        if start and end and start > end:
            raise ValueError(f"Start date {start} is after end date {end}.")

    def _get_session_data(self, token: str) -> Dict[str, Any]:
        """Retrieve session data for a given token."""
        key = self._get_key(token)
        try:
            pipeline = self.redis.pipeline()
            pipeline.hgetall(key)
            pipeline.expire(key, self._ttl_seconds)
            results = pipeline.execute()
            return results[0] if results else {}
        except Exception as e:
            self.logger.error(f"Error retrieving session data for token {token}: {e}")
            raise e

    def _get_redis_subset(
        self,
        token: str,
        timestamp: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve a subset of Redis data based on time filters.

        Args:
            token (str): The token identifying the session
            timestamp (str, optional): Specific timestamp to filter by
            start (str, optional): Start of the time interval
            end (str, optional): End of the time interval
        """
        key = self._get_key(token)
        try:
            timestamps = self.redis.hkeys(key)
            filtered_keys = []
            datetime_start, datetime_end = self._parse_dates(start, end)

            for ts_key in timestamps:
                if self._matches_time_filter(
                    ts_key, timestamp, datetime_start, datetime_end
                ):
                    filtered_keys.append(ts_key)

            if not filtered_keys:
                self.logger.info(f"No data found for token {token} with given filters.")
                return {}

            # Use pipeline for batch operations
            pipeline = self.redis.pipeline()
            pipeline.hmget(key, filtered_keys)
            pipeline.expire(key, self._ttl_seconds)
            results = pipeline.execute()

            values = results[0]
            filtered_data = {
                ts: val for ts, val in zip(filtered_keys, values) if val is not None
            }

            return filtered_data
        except Exception as e:
            self.logger.error(f"Error retrieving Redis subset for token {token}: {e}")
            raise e

    def _process_data(
        self,
        data: Dict[str, Any],
        timestamp: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
        categories: Optional[List[str]] = None,
        filenames: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Process raw Redis data into structured format based on time filters.

        Args:
            data (Dict[str, Any]): Raw data from Redis
            timestamp (str, optional): Specific timestamp to filter by
            start (str, optional): Start of the time interval
            end (str, optional): End of the time interval
            categories (List[str], optional): List of categories to filter by
            filenames (List[str], optional): List of filenames to filter by

        Returns:
            Dict[str, Any]: Processed and filtered data
        """
        processed_data = {}
        datetime_start, datetime_end = self._parse_dates(start, end)

        for ts_key, ts_value in data.items():
            if self._matches_time_filter(
                ts_key, timestamp, datetime_start, datetime_end
            ):
                try:
                    self._add_matching_data(
                        result=processed_data,
                        timestamp=ts_key,
                        values=_json_loads(ts_value),
                        category=None,
                        filename=None,
                        categories=categories,
                        filenames=filenames,
                    )
                except (json.JSONDecodeError, ValueError) as e:
                    self.logger.error(
                        f"Error decoding JSON for timestamp {ts_key}: {e}"
                    )
                    continue

        return processed_data

    def _parse_dates(
        self, start: Optional[str] = None, end: Optional[str] = None
    ) -> tuple:
        """Parse ISO format dates."""
        try:
            datetime_start = datetime.fromisoformat(start) if start else None
            datetime_end = datetime.fromisoformat(end) if end else None
            return datetime_start, datetime_end
        except ValueError as e:
            raise ValueError(
                "Invalid date format for start or end. Expected ISO format."
            ) from e

    def _matches_time_filter(
        self, timeseries: str, time: str, datetime_start, datetime_end
    ) -> bool:
        """Check if timeseries matches time filters."""
        if time and timeseries != time:
            return False

        if datetime_start or datetime_end:
            try:
                ts_datetime = datetime.fromisoformat(timeseries)
            except ValueError as e:
                raise ValueError(
                    f"Invalid time format in timeseries key: {timeseries}. Expected ISO format."
                ) from e

            if datetime_start and ts_datetime < datetime_start:
                return False
            if datetime_end and ts_datetime > datetime_end:
                return False

        return True

    def _filter_files_in_category(
        self,
        files_data: Dict[str, Any],
        target_filename: Optional[str],
        target_filenames_list: Optional[List[str]],
    ) -> Dict[str, Any]:
        """
        Helper method to filter files within a category.
        Reduces complexity of _add_matching_data.
        """
        filtered_files = {}
        for file_name, value in files_data.items():
            if target_filename and file_name != target_filename:
                continue
            if target_filenames_list and file_name not in target_filenames_list:
                continue
            filtered_files[file_name] = value
        return filtered_files

    def _add_matching_data(
        self,
        result: Dict[str, Any],
        timestamp: str,
        values: Dict[str, Any],
        category: Optional[str],
        filename: Optional[str],
        categories: Optional[List[str]],
        filenames: Optional[List[str]],
    ):
        """Add matching data to result dictionary."""
        for ts_category, ts_filenames in values.items():
            if category and ts_category != category:
                continue
            if categories and ts_category not in categories:
                continue

            if isinstance(ts_filenames, dict) and ts_filenames:
                filtered_filenames = self._filter_files_in_category(
                    ts_filenames, filename, filenames
                )

                if filtered_filenames:
                    if timestamp not in result:
                        result[timestamp] = {}
                    if ts_category not in result[timestamp]:
                        result[timestamp][ts_category] = {}
                    result[timestamp][ts_category].update(filtered_filenames)
            else:
                if timestamp not in result:
                    result[timestamp] = {}
                result[timestamp][ts_category] = ts_filenames

    def add_timeseries(self, token: str, time: str, data: dict):
        """
        Add a timeseries to the manager.

        Args:
            key (str): Identifier for the timeseries
            data (list[dict]): List of timeseries data, each item should be a dictionary with keys "log_date", "values"

        Raises:
            ValueError: If the data format is invalid
            ValueError: If required keys are missing in the timeserie
            ValueError: If the timeserie data is invalid

        Returns:
            bool: True if added successfully, False otherwise
        """
        self._validate_parameters(time=time)

        if not isinstance(data, dict):
            raise ValueError(f"Invalid data format: {data}. Expected a dictionary.")

        if not data:
            raise ValueError("Data cannot be empty.")

        key = self._get_key(token)

        try:
            pipeline = self.redis.pipeline()
            json_value = _json_dumps(data)
            pipeline.hset(key, time, json_value)
            pipeline.expire(key, self._ttl_seconds)
            pipeline.execute()
            return True
        except Exception as e:
            self.logger.error(f"Error adding timeseries for token {token}: {e}")
            return False

    def get_timeseries(
        self,
        token: str,
        timestamp: str = None,
        filename: str = None,
        category: str = None,
        start: str = None,
        end: str = None,
        filenames: list = None,
        categories: list = None,
    ) -> dict:
        """
        Retrieve timeseries data.

        Args:
            time (str, optional): The time to filter timeseries by
            filename (str, optional): The filename to filter timeseries by
            category (str, optional): The category to filter timeseries by
            start (str, optional): The start of the time interval
            end (str, optional): The end of the time interval
        Returns:
            dict: Timeseries data for the specified time or all timeseries if no key is provided
        """
        self._validate_parameters(
            timestamp, filename, category, start, end, filenames, categories
        )

        if timestamp or start or end:
            raw_data = self._get_redis_subset(token, timestamp, start, end)
        else:
            raw_data = self._get_session_data(token)

        if not raw_data:
            return {}

        # Convert single values to lists for unified processing
        category_filter = (
            categories if categories else ([category] if category else None)
        )
        filename_filter = filenames if filenames else ([filename] if filename else None)

        return self._process_data(
            raw_data,
            timestamp=timestamp,
            start=start,
            end=end,
            categories=category_filter,
            filenames=filename_filter,
        )

    def clear_timeseries(self, token: str) -> dict:
        """
        Clear all timeseries data.
        Returns:
            dict: Message indicating the result of the operation
        """
        try:
            key = self._get_key(token)
            self.redis.delete(key)
            return {"message": "All timeseries data cleared successfully."}, 200
        except Exception as e:
            self.logger.error(f"Error clearing timeseries for token {token}: {e}")
            return {"error": str(e)}, 500
