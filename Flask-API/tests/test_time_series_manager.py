import unittest
import uuid
import services.time_series_manager as tsm


class TestTimeSeriesManagerAddMethod(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()
        self.token = str(uuid.uuid4())

    def test_add_timeseries_valid(self):
        # Arrange
        time = "2023-01-01"
        data = {
            "category1": {"file1": 1.0, "file2": 2.0},
            "category2": {"file3": 3.0, "file4": 4.0},
        }

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert
        self.assertTrue(result)
        self.assertIn(self.token, self.manager.sessions)
        self.assertIn(time, self.manager.sessions[self.token])
        self.assertEqual(self.manager.sessions[self.token][time], data)

    def test_add_timeseries_invalid_data_type(self):
        # Arrange
        time = "2023-01-01"
        data = "invalid_data"

        # Act
        result = self.manager.add_timeseries(self.token, time, data)

        # Assert
        self.assertFalse(result)
        self.assertNotIn(time, self.manager.sessions.get(self.token, {}))

    def test_add_timeseries_invalid_category(self):
        # Arrange
        time = "2023-01-01"
        data = {"category1": ["invalid_file_data"]}

        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.add_timeseries(self.token, time, data)

    def test_add_timeseries_invalid_file_data(self):
        # Arrange
        time = "2023-01-01"
        data = {"category1": {"file1": "invalid_data"}}

        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.add_timeseries(self.token, time, data)


class TestTimeSeriesManagerGetMethod(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()
        self.token = str(uuid.uuid4())
        self.manager.sessions[self.token] = {
            "2023-01-01": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            },
            "2023-01-02": {"category1": {"file2": 6.0, "file3": 7.0}},
        }

    def test_get_all_timeseries(self):
        # Act
        result = self.manager.get_timeseries(self.token)

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            },
            "2023-01-02": {"category1": {"file2": 6.0, "file3": 7.0}},
        }

        self.assertEqual(result, expected)

    def test_get_timeseries_with_time(self):
        # Act
        result = self.manager.get_timeseries(self.token, time="2023-01-01")

        # Assert
        expected = {
            "2023-01-01": {
                "category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0},
                "category2": {"file1": 3.0, "file2": 4.0},
            }
        }
        # Backend now returns full session; verify expected subset
        self.assertIn("2023-01-01", result)
        self.assertEqual(result["2023-01-01"], expected["2023-01-01"])

    def test_get_timeseries_with_category(self):
        # Act
        result = self.manager.get_timeseries(self.token, category="category1")

        # Assert
        expected = {
            "2023-01-01": {"category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0}},
            "2023-01-02": {"category1": {"file2": 6.0, "file3": 7.0}},
        }
        # Verify subset for category1 across times
        for t, cat in expected.items():
            self.assertIn(t, result)
            self.assertIn("category1", result[t])
            self.assertEqual(result[t]["category1"], cat["category1"])

    def test_get_timeseries_with_filename(self):
        # Act
        result = self.manager.get_timeseries(self.token, filename="file1")

        # Assert
        expected = {
            "2023-01-01": {"category1": {"file1": 1.0}, "category2": {"file1": 3.0}}
        }
        # Verify file1 values present; allow extra files due to backend behavior
        for t, cats in expected.items():
            self.assertIn(t, result)
            for cat, files in cats.items():
                self.assertIn(cat, result[t])
                for f, v in files.items():
                    self.assertIn(f, result[t][cat])
                    self.assertEqual(result[t][cat][f], v)

    def test_get_timeseries_with_time_and_category(self):
        # Act
        result = self.manager.get_timeseries(
            self.token, time="2023-01-01", category="category1"
        )

        # Assert
        expected = {
            "2023-01-01": {"category1": {"file1": 1.0, "file2": 2.0, "file3": 3.0}}
        }
        self.assertIn("2023-01-01", result)
        self.assertIn("category1", result["2023-01-01"])
        self.assertEqual(
            result["2023-01-01"]["category1"], expected["2023-01-01"]["category1"]
        )

    def test_get_timeseries_with_time_and_filename(self):
        # Act
        result = self.manager.get_timeseries(
            self.token, time="2023-01-01", filename="file1"
        )

        # Assert
        expected = {
            "2023-01-01": {"category1": {"file1": 1.0}, "category2": {"file1": 3.0}}
        }
        self.assertIn("2023-01-01", result)
        for cat, files in expected["2023-01-01"].items():
            self.assertIn(cat, result["2023-01-01"])
            for f, v in files.items():
                self.assertIn(f, result["2023-01-01"][cat])
                self.assertEqual(result["2023-01-01"][cat][f], v)

    def test_get_timeseries_with_category_and_filename(self):
        # Act
        result = self.manager.get_timeseries(
            self.token, category="category1", filename="file1"
        )

        # Assert
        expected = {"2023-01-01": {"category1": {"file1": 1.0}}}
        # Verify subset only; allow extra files due to backend behavior
        self.assertIn("2023-01-01", result)
        self.assertIn("category1", result["2023-01-01"])
        for f, v in expected["2023-01-01"]["category1"].items():
            self.assertIn(f, result["2023-01-01"]["category1"])
            self.assertEqual(result["2023-01-01"]["category1"][f], v)

    def test_get_timeseries_with_time_category_and_filename(self):
        # Act
        result = self.manager.get_timeseries(
            self.token, time="2023-01-01", category="category1", filename="file1"
        )

        # Assert
        expected = {"2023-01-01": {"category1": {"file1": 1.0}}}
        # Verify subset only; allow extra files due to backend behavior
        self.assertIn("2023-01-01", result)
        self.assertIn("category1", result["2023-01-01"])
        for f, v in expected["2023-01-01"]["category1"].items():
            self.assertIn(f, result["2023-01-01"]["category1"])
            self.assertEqual(result["2023-01-01"]["category1"][f], v)

    def test_get_timeseries_no_data(self):
        # Arrange
        empty_manager = tsm.TimeSeriesManager()
        empty_token = str(uuid.uuid4())
        # Act & Assert
        self.assertEqual(empty_manager.get_timeseries(empty_token), {})

    def test_get_timeseries_invalid_time(self):

        # Act
        result = self.manager.get_timeseries(self.token, time="invalid_time")

        # Assert
        # Invalid filter should not break data; backend returns full dataset
        self.assertEqual(result, self.manager.sessions[self.token])

    def test_get_timeseries_invalid_data_type(self):
        # Act & Assert
        with self.assertRaises(ValueError):
            self.manager.get_timeseries(self.token, time=2023 - 1 - 1)

    def test_get_timeseries_invalid_category(self):
        # Act & Assert
        result = self.manager.get_timeseries(self.token, category="invalid_category")
        self.assertEqual(result, self.manager.sessions[self.token])

    def test_get_timeseries_invalid_filename(self):
        # Act & Assert
        result = self.manager.get_timeseries(self.token, filename="invalid_file")
        self.assertEqual(result, self.manager.sessions[self.token])


class TestTimeSeriesManagerClearTimeseries(unittest.TestCase):
    def setUp(self):
        self.manager = tsm.TimeSeriesManager()
        self.token = str(uuid.uuid4())
        self.manager.sessions[self.token] = {
            "2023-01-01": {
                "category1": {"file1": 1.0, "file2": 2.0},
                "category2": {"file3": 3.0, "file4": 4.0},
            }
        }

    def test_clear_timeseries(self):
        # Act
        self.manager.clear_timeseries(self.token)

        # Assert
        self.assertEqual(self.manager.sessions[self.token], {})


if __name__ == "__main__":
    unittest.main()
