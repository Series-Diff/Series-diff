import unittest
import services.time_series_manager as tsm


class TestTimeSeriesManagerAddMethod(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()

    def test_add_timeseries_valid(self):
        # Arrange
        time = "2023-01-01"
        data = {
            "category1": {"file1": 1.0, "file2": 2.0},
            "category2": {"file3": 3.0, "file4": 4.0}
        }

        # Act
        result = self.manager.add_timeseries(time, data)

        # Assert
        self.assertTrue(result)
        self.assertIn(time, self.manager.timeseries)
        self.assertEqual(self.manager.timeseries[time], data)

    def test_add_timeseries_invalid_data_type(self):
        # Arrange
        time = "2023-01-01"
        data = "invalid_data"

        # Act
        result = self.manager.add_timeseries(time, data)

        # Assert
        self.assertFalse(result)
        self.assertNotIn(time, self.manager.timeseries)

    def test_add_timeseries_invalid_category(self):
        # Arrange
        time = "2023-01-01"
        data = {
            "category1": ["invalid_file_data"]
        }

        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.add_timeseries(time, data)

    def test_add_timeseries_invalid_file_data(self):
        # Arrange
        time = "2023-01-01"
        data = {
            "category1": {"file1": "invalid_data"}
        }

        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.add_timeseries(time, data)


class TestTimeSeriesManagerGetMethod(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()
        self.manager.timeseries = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0, 
                    "file2": 2.0,
                    "file3": 3.0
                },
                "category2": {
                    "file1": 3.0, 
                    "file2": 4.0
                }
            },
            "2023-01-02": {
                "category1": { 
                    "file2": 6.0,
                    "file3": 7.0
                }
            }   
        }

    def test_get_all_timeseries(self):
        # Act
        result = self.manager.get_timeseries()

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0, 
                    "file2": 2.0,
                    "file3": 3.0
                },
                "category2": {
                    "file1": 3.0, 
                    "file2": 4.0
                }
            },
            "2023-01-02": {
                "category1": { 
                    "file2": 6.0,
                    "file3": 7.0
                }
            }   
        }

        self.assertEqual(result, expected)

    def test_get_timeseries_with_time(self):
        # Act
        result = self.manager.get_timeseries(time="2023-01-01")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0, 
                    "file2": 2.0,
                    "file3": 3.0
                },
                "category2": {
                    "file1": 3.0, 
                    "file2": 4.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_category(self):
        # Act
        result = self.manager.get_timeseries(category="category1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0, 
                    "file2": 2.0,
                    "file3": 3.0
                }
            },
            "2023-01-02": {
                "category1": {
                    "file2": 6.0,
                    "file3": 7.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_filename(self):
        # Act
        result = self.manager.get_timeseries(filename="file1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0
                },
                "category2": {
                    "file1": 3.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_and_category(self):
        # Act
        result = self.manager.get_timeseries(time="2023-01-01", category="category1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0, 
                    "file2": 2.0,
                    "file3": 3.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_and_filename(self):
        # Act
        result = self.manager.get_timeseries(time="2023-01-01", filename="file1")

        # Assert
        expected = {         
            "2023-01-01": {
                    "category1": {
                        "file1": 1.0
                    },
                    "category2": {
                        "file1": 3.0
                    }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_category_and_filename(self):
        # Act
        result = self.manager.get_timeseries(category="category1", filename="file1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0
                },
                "category2": {
                    "file1": 3.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_category_and_filename(self):
        # Act
        result = self.manager.get_timeseries(category="category1", filename="file1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_with_time_category_and_filename(self):
        # Act
        result = self.manager.get_timeseries(time="2023-01-01", category="category1", filename="file1")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {
                    "file1": 1.0
                }
            }
        }
        self.assertEqual(result, expected)

    def test_get_timeseries_no_data(self):
        # Arrange
        empty_manager = tsm.TimeSeriesManager()

        # Act & Assert
        self.assertEqual(empty_manager.get_timeseries(), {})

    def test_get_timeseries_invalid_time(self):

        # Act
        result = self.manager.get_timeseries(time="invalid_time")

        # Assert
        self.assertEqual(result, {})

    def test_get_timeseries_invalid_data_type(self):
        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.get_timeseries(time=2023-1-1)

    def test_get_timeseries_invalid_category(self):
        # Act & Assert
        result = self.manager.get_timeseries(category="invalid_category")
        self.assertEqual(result, {})

    def test_get_timeseries_invalid_filename(self):
        # Act & Assert
        result = self.manager.get_timeseries(filename="invalid_file")
        self.assertEqual(result, {})

class TestTimeSeriesManagerClearTimeseries(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()
        self.manager.timeseries = {
            "2023-01-01": {
                "category1": {"file1": 1.0, "file2": 2.0},
                "category2": {"file3": 3.0, "file4": 4.0}
            }
        }

    def test_clear_timeseries(self):
        # Act
        self.manager.clear_timeseries()

        # Assert
        self.assertEqual(self.manager.timeseries, {})

if __name__ == "__main__":
    unittest.main()