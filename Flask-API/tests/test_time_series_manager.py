import json
import unittest
import uuid
from unittest.mock import MagicMock
from logging import Logger
from services.time_series_manager import TimeSeriesManager


class TestTimeSeriesManagerAddMethod(unittest.TestCase):
    def setUp(self):
        self.mock_redis = MagicMock()
        self.mock_logger = MagicMock(spec=Logger)
        self.manager = TimeSeriesManager(
            redis_client=self.mock_redis, logger=self.mock_logger
        )
        self.token = str(uuid.uuid4())

    def test_add_timeseries_valid(self):
        # Arrange
        time = "2023-01-01T00:00:00"
        data = {
            "category1": {"file1": 1.0, "file2": 2.0},
            "category2": {"file3": 3.0, "file4": 4.0},
        }
        mock_pipeline = MagicMock()
        mock_pipeline.execute.return_value = [True, True]
        self.mock_redis.pipeline.return_value = mock_pipeline

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert
        self.assertTrue(result)
        mock_pipeline.hset.assert_called_once_with(
            f"session:{self.token}", time, json.dumps(data)
        )
        mock_pipeline.expire.assert_called_once_with(
            f"session:{self.token}", self.manager._ttl_seconds
        )
        mock_pipeline.execute.assert_called_once()

    def test_add_timeseries_invalid_data_type(self):
        # Arrange
        time = "2023-01-01T00:00:00"
        data = "invalid_data"

        # Act & Assert
        with self.assertRaises(ValueError) as context:
            self.manager.add_timeseries(self.token, time, data)

        self.assertIn("Expected a dictionary", str(context.exception))

    def test_add_timeseries_invalid_category(self):
        # Arrange
        time = "2023-01-01T00:00:00"
        data = {"category1": ["invalid_file_data"]}
        mock_pipeline = MagicMock()
        mock_pipeline.execute.return_value = [True, True]
        self.mock_redis.pipeline.return_value = mock_pipeline

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert - data is stored as-is in JSON, validation happens on retrieval
        self.assertTrue(result)

    def test_add_timeseries_invalid_file_data(self):
        # Arrange
        time = "2023-01-01T00:00:00"
        data = {"category1": {"file1": "invalid_data"}}
        mock_pipeline = MagicMock()
        mock_pipeline.execute.return_value = [True, True]
        self.mock_redis.pipeline.return_value = mock_pipeline

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert - data is stored as-is in JSON
        self.assertTrue(result)

    def test_add_timeseries_redis_exception(self):
        # Arrange
        time = "2023-01-01T00:00:00"
        data = {"category1": {"file1": 1.0}}
        self.mock_redis.pipeline.side_effect = Exception("Redis connection error")

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert
        self.assertFalse(result)
        self.mock_logger.error.assert_called()


class TestTimeSeriesManagerGetMethod(unittest.TestCase):
    def setUp(self):
        self.mock_redis = MagicMock()
        self.mock_logger = MagicMock(spec=Logger)
        self.manager = TimeSeriesManager(
            redis_client=self.mock_redis, logger=self.mock_logger
        )
        self.token = str(uuid.uuid4())

        # Prepare test data
        self.test_data = {
            "2023-01-01T00:00:00": json.dumps(
                {
                    "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                    "category2": {"file1": 3.0, "file2": 4.0},
                }
            ),
            "2023-01-02T00:00:00": json.dumps(
                {"category1": {"file2": 6.0, "file3": 7.0}}
            ),
        }

    def test_get_all_timeseries(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token)

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            },
            "2023-01-02T00:00:00": {"category1": {"file2": 6.0, "file3": 7.0}},
        }

        self.assertEqual(result, expected)
        self.mock_redis.hgetall.assert_called_once_with(f"session:{self.token}")

    def test_get_timeseries_with_time(self):
        # Arrange
        timestamp = "2023-01-01T00:00:00"
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = [self.test_data[timestamp]]

        # Act
        result = self.manager.get_timeseries(self.token, timestamp=timestamp)

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            }
        }
        self.assertEqual(result, expected)
        self.mock_redis.hkeys.assert_called_once()
        self.mock_redis.hmget.assert_called_once()

    def test_get_timeseries_with_category(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token, category="category1")

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0}
            },
            "2023-01-02T00:00:00": {"category1": {"file2": 6.0, "file3": 7.0}},
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_filename(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token, filename="file1")

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0},
                "category2": {"file1": 3.0},
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_and_category(self):
        # Arrange
        timestamp = "2023-01-01T00:00:00"
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = [self.test_data[timestamp]]

        # Act
        result = self.manager.get_timeseries(
            self.token, timestamp=timestamp, category="category1"
        )

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0}
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_and_filename(self):
        # Arrange
        timestamp = "2023-01-01T00:00:00"
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = [self.test_data[timestamp]]

        # Act
        result = self.manager.get_timeseries(
            self.token, timestamp=timestamp, filename="file1"
        )

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0},
                "category2": {"file1": 3.0},
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_category_and_filename(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(
            self.token, category="category1", filename="file1"
        )

        # Assert
        expected = {"2023-01-01T00:00:00": {"category1": {"file1": 1.0}}}
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_category_and_filename(self):
        # Arrange
        timestamp = "2023-01-01T00:00:00"
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = [self.test_data[timestamp]]

        # Act
        result = self.manager.get_timeseries(
            self.token, timestamp=timestamp, category="category1", filename="file1"
        )

        # Assert
        expected = {"2023-01-01T00:00:00": {"category1": {"file1": 1.0}}}
        self.assertEqual(result, expected)

    def test_get_timeseries_no_data(self):
        # Arrange
        self.mock_redis.hgetall.return_value = {}

        # Act & Assert
        result = self.manager.get_timeseries(self.token)
        self.assertEqual(result, {})

    def test_get_timeseries_invalid_time(self):
        # Arrange
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = []

        # Act
        result = self.manager.get_timeseries(self.token, timestamp="invalid_time")

        # Assert
        self.assertEqual(result, {})

    def test_get_timeseries_invalid_data_type(self):
        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.get_timeseries(self.token, timestamp=2023)

    def test_get_timeseries_invalid_category(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token, category="invalid_category")

        # Assert - invalid category returns empty result after filtering
        self.assertEqual(result, {})

    def test_get_timeseries_invalid_filename(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token, filename="invalid_file")

        # Assert - invalid filename returns empty result after filtering
        self.assertEqual(result, {})

    def test_get_timeseries_with_categories_list(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(
            self.token, categories=["category1", "category2"]
        )

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            },
            "2023-01-02T00:00:00": {"category1": {"file2": 6.0, "file3": 7.0}},
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_filenames_list(self):
        # Arrange
        self.mock_redis.hgetall.return_value = self.test_data

        # Act
        result = self.manager.get_timeseries(self.token, filenames=["file1", "file2"])

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            },
            "2023-01-02T00:00:00": {"category1": {"file2": 6.0}},
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_date_range(self):
        # Arrange
        self.mock_redis.hkeys.return_value = list(self.test_data.keys())
        self.mock_redis.hmget.return_value = [self.test_data["2023-01-01T00:00:00"]]

        # Act
        result = self.manager.get_timeseries(
            self.token, start="2023-01-01T00:00:00", end="2023-01-01T23:59:59"
        )

        # Assert
        expected = {
            "2023-01-01T00:00:00": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            }
        }
        self.assertEqual(result, expected)


class TestTimeSeriesManagerClearTimeseries(unittest.TestCase):
    def setUp(self):
        self.mock_redis = MagicMock()
        self.mock_logger = MagicMock(spec=Logger)
        self.manager = TimeSeriesManager(
            redis_client=self.mock_redis, logger=self.mock_logger
        )
        self.token = str(uuid.uuid4())

    def test_clear_timeseries(self):
        # Act
        result, status_code = self.manager.clear_timeseries(self.token)

        # Assert
        self.assertEqual(status_code, 200)
        self.assertEqual(result["message"], "All timeseries data cleared successfully.")
        self.mock_redis.delete.assert_called_once_with(f"session:{self.token}")

    def test_clear_timeseries_exception(self):
        # Arrange
        self.mock_redis.delete.side_effect = Exception("Redis error")

        # Act
        result, status_code = self.manager.clear_timeseries(self.token)

        # Assert
        self.assertEqual(status_code, 500)
        self.assertIn("error", result)
        self.mock_logger.error.assert_called()


if __name__ == "__main__":
    unittest.main()
