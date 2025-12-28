from datetime import datetime
from typing import Any, Dict, Optional


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

    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def _validate_parameters(
        self,
        time: Optional[str],
        filename: Optional[str],
        category: Optional[str],
        start: Optional[str],
        end: Optional[str],
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

        if start and end and start > end:
            raise ValueError(f"Start date {start} is after end date {end}.")

    def _get_session_data(self, token: str) -> Dict[str, Any]:
        """Retrieve session data for a given token."""
        if token not in self.sessions:
            self.sessions[token] = {}
        return self.sessions[token]

    def _parse_dates(self, start: str, end: str) -> tuple:
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

    def _add_matching_data(
        self,
        result: dict,
        timeseries: str,
        categories: dict,
        category: str,
        filename: str,
    ):
        """Add matching data to result dictionary."""
        for ts_category, ts_filenames in categories.items():
            if category and ts_category != category:
                continue

            for file, value in ts_filenames.items():
                if filename and file != filename:
                    continue

                result.setdefault(timeseries, {}).setdefault(ts_category, {})[
                    file
                ] = value

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
        if isinstance(data, dict):
            session_data = self._get_session_data(token)
            session_data[time] = data
            for timeserie, categories in data.items():
                if not isinstance(categories, dict):
                    raise ValueError(f"Invalid category '{timeserie}': {categories}")
                for category, files in categories.items():
                    if not isinstance(files, (float, int)):
                        raise ValueError(
                            f"Invalid file data for category '{category}': {files}"
                        )
            return True
        return False

    def get_timeseries(
            self,
            token: str,
            time: str = None,
            filename: str = None,
            category: str = None,
            start: str = None,
            end: str = None,
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
            self._validate_parameters(time, filename, category, start, end)
            datetime_start, datetime_end = self._parse_dates(start, end)

            source_data = self._get_session_data(token)

            result = {}

            if not source_data:
                return result

            for timeseries, categories in source_data.items():
                if not self._matches_time_filter(
                    timeseries, time, datetime_start, datetime_end
                ):
                    continue

                self._add_matching_data(result, timeseries, categories, category, filename)

            return result

    def clear_timeseries(self, token: str) -> dict:
        """
        Clear all timeseries data.
        Returns:
            dict: Message indicating the result of the operation
        """
        try:
            self.sessions[token].clear()
            return {"message": "All timeseries data cleared successfully."}, 200
        except Exception as e:
            return {"error": str(e)}, 500
