from datetime import datetime


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
        self.timeseries = {}

    def add_timeseries(self, time: str, data: dict):

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
            self.timeseries[time] = data
            for timeserie, categories in data.items():
                if not isinstance(categories, dict):
                    raise ValueError(f"Invalid category '{timeserie}': {categories}")
                for category, files in categories.items():
                    if not isinstance(files, (float, int)):
                        raise ValueError(f"Invalid file data for category '{category}': {files}")
            return True
        return False

    def get_timeseries(self, time:str = None, filename:str = None, category:str = None, start:str = None, end:str = None) -> dict:
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

        result = {}
        if not self.timeseries:
            return result
        if time and not isinstance(time, str):
            raise ValueError(f"Invalid time format: {time}. Expected a string.")

        if filename and not isinstance(filename, str):
            raise ValueError(f"Invalid filename format: {filename}. Expected a string.")

        if category and not isinstance(category, str):
            raise ValueError(f"Invalid category format: {category}. Expected a string.")
        if start and not isinstance(start, str):
            raise ValueError(f"Invalid start format: {start}. Expected a string.")
        if end and not isinstance(end, str):
            raise ValueError(f"Invalid end format: {end}. Expected a string.")
        if start and end and start > end:
            raise ValueError(f"Start date {start} is after end date {end}.")
        try:            
            datetime_start = datetime.fromisoformat(start) if start else None
            datetime_end = datetime.fromisoformat(end) if end else None
        except ValueError as e:
            raise ValueError(f"Invalid date format for start or end. Expected ISO format.") from e

        for timeseries, categories in self.timeseries.items():
            if time and timeseries != time:
                continue
            if datetime_start or datetime_end:
                try:
                    timeseries_datetime = datetime.fromisoformat(timeseries)
                except ValueError as e:
                    raise ValueError(f"Invalid time format in timeseries key: {timeseries}. Expected ISO format.") from e

                if datetime_start and timeseries_datetime < datetime_start:
                    continue
                if datetime_end and timeseries_datetime > datetime_end:
                    continue

            for timeseries_category, timeseries_filenames in categories.items():
                if category and timeseries_category != category:
                    continue

                for file, value in timeseries_filenames.items():
                    if filename and file != filename:
                        continue

                    result.setdefault(timeseries, {}).setdefault(timeseries_category, {})[file] = value

        return result
    def clear_timeseries(self):

        """
        Clear all timeseries data.
        """
        try:
            self.timeseries.clear()
            return {"message": "All timeseries data cleared successfully."}, 200
        except Exception as e:
            return {"error": str(e)}, 500
