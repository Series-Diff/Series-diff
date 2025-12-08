import unittest
import pandas as pd
import numpy as np
from services.metric_service import extract_series_from_dict, calculate_basic_statistics, calculate_autocorrelation, calculate_coefficient_of_variation, calculate_iqr, calculate_pearson_correlation


class TestExtractSeriesFromDict(unittest.TestCase):
    def test_extract_series(self):

        # Arrange
        data = {
            "2023-01-01": {"category1": {"file1": 1, "file2": 2}},
            "2023-01-02": {"category1": {"file1": 3, "file2": 4}},
            "2023-01-03": {"category1": {"file1": 5, "file2": 6}}
        }

        # Act
        result = extract_series_from_dict(data, "category1", "file1")

        # Assert
        expected = {
            "2023-01-01": 1,
            "2023-01-02": 3,
            "2023-01-03": 5
        }

        self.assertEqual(result, expected)

    def test_empty_data(self):
        # Arrange
        data = {}

        # Act
        result = extract_series_from_dict(data, "category", "file")

        # Assert
        self.assertEqual(result, {})

    def test_invalid_data_type(self):
        # Arrange
        data = "invalid_data"
        # Act & Assert
        with self.assertRaises(ValueError):
            extract_series_from_dict(data, "category", "file")

    def test_invalid_category_type(self):

        # Arrange
        data = {
            "2023-01-01": {"category1": {"file1": 1, "file2": 2}},
            "2023-01-02": {"category1": {"file1": 3, "file2": 4}}
        }

        # Act & Assert
        with self.assertRaises(ValueError):
            extract_series_from_dict(data, 123, "file1")

    def test_invalid_file_stype(self):

        # Arrange
        data = {
            "2023-01-01": {"category1": {"file1": 1, "file2": 2}},
            "2023-01-02": {"category1": {"file1": "invalid", "file2": 4}}
        }

        # Act & Assert
        with self.assertRaises(ValueError):
            extract_series_from_dict(data, "category1", "file1")


class TestCalculateBasicStatistics(unittest.TestCase):
    def test_typical_series(self):
        series = {
            "2023-01-01": 1,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }
        stats = calculate_basic_statistics(series)
        self.assertAlmostEqual(stats["mean"], 3.0)
        self.assertAlmostEqual(stats["median"], 3.0)
        self.assertAlmostEqual(stats["variance"], 2.0)
        self.assertAlmostEqual(stats["std_dev"], 1.4142135623730951)

    def test_empty_series(self):
        stats = calculate_basic_statistics({})
        self.assertTrue(np.isnan(stats["mean"]))
        self.assertTrue(np.isnan(stats["median"]))
        self.assertTrue(np.isnan(stats["variance"]))
        self.assertTrue(np.isnan(stats["std_dev"]))

    def test_non_dict_input(self):
        stats = calculate_basic_statistics([1, 2, 3])
        self.assertTrue(np.isnan(stats["mean"]))
        self.assertTrue(np.isnan(stats["median"]))
        self.assertTrue(np.isnan(stats["variance"]))
        self.assertTrue(np.isnan(stats["std_dev"]))

    def test_nan_values(self):
        series = {
            "2023-01-01": np.nan,
            "2023-01-02": 2,
            "2023-01-03": 3
        }
        stats = calculate_basic_statistics(series)
        self.assertFalse(pd.isna(stats["mean"]))
        self.assertFalse(pd.isna(stats["median"]))
        self.assertFalse(pd.isna(stats["variance"]))
        self.assertFalse(pd.isna(stats["std_dev"]))

    def test_string_values(self):
        series = {
            "2023-01-01": "a",
            "2023-01-02": "b"
        }
        result = calculate_basic_statistics(series)
        self.assertTrue(isinstance(result, str) or "error" in result)


class TestCalculateAutocorrelation(unittest.TestCase):
    def test_typical_series(self):
        # Arrange
        series = {
            "2023-01-01": 1,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        # Act
        acf_value = calculate_autocorrelation(series)

        # Assert
        self.assertAlmostEqual(acf_value, 0.4, places=1)  # Example expected value

    def test_empty_series(self):
        # Arrange
        series = {}

        # Act
        acf_value = calculate_autocorrelation(series)

        # Assert
        self.assertTrue(acf_value, np.nan)

    def test_non_dict_input(self):
        # Arrange
        series = [1, 2, 3]

        # Act
        acf_value = calculate_autocorrelation(series)

        # Assert
        self.assertTrue(acf_value, np.nan)

    def test_nan_values(self):

        # Arrange
        series = {
            "2023-01-01": np.nan,
            "2023-01-02": 2,
            "2023-01-03": 3
        }

        # Act
        acf_value = calculate_autocorrelation(series)

        # Assert
        self.assertTrue(np.isnan(acf_value))


class TestCalculateCoefficientOfVariation(unittest.TestCase):
    def test_typical_series(self):

        # Arrange
        series = {
            "2023-01-01": 1,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        # Act
        cv = calculate_coefficient_of_variation(series)

        # Assert
        self.assertAlmostEqual(cv, 52.7, places=2)

    def test_empty_series(self):

        # Arrange
        series = {}

        # Act
        cv = calculate_coefficient_of_variation(series)

        # Assert
        self.assertTrue(np.isnan(cv))

    def test_non_dict_input(self):

        # Arrange
        series = [1, 2, 3]

        # Act
        cv = calculate_coefficient_of_variation(series)

        # Assert
        self.assertTrue(np.isnan(cv))

    def test_nan_values(self):

        # Arrange
        series = {
            "2023-01-01": np.nan,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        # Act
        cv = calculate_coefficient_of_variation(series)

        # Assert
        self.assertTrue(np.isnan(cv))

    def test_zero_mean(self):

        # Arrange
        series = {
            "2023-01-01": 0,
            "2023-01-02": 0,
            "2023-01-03": 0
        }

        # Act
        cv = calculate_coefficient_of_variation(series)

        # Assert
        self.assertTrue(np.isnan(cv))


class TestCalculateIQR(unittest.TestCase):
    def test_typical_series(self):

        # Arrange
        series = {
            "2023-01-01": 1,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        # Act
        iqr = calculate_iqr(series)

        # Assert
        self.assertEqual(iqr, 2.0)  # IQR for this series is Q3 - Q1 = 4 - 2

    def test_empty_series(self):

        # Arrange
        series = {}

        # Act
        iqr = calculate_iqr(series)

        # Assert
        self.assertTrue(np.isnan(iqr))

    def test_non_dict_input(self):

        # Arrange
        series = [1, 2, 3]

        # Act
        iqr = calculate_iqr(series)

        # Assert
        self.assertTrue(np.isnan(iqr))

    def test_nan_values(self):

        # Arrange
        series = {
            "2023-01-01": np.nan,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        # Act
        iqr = calculate_iqr(series)

        # Assert
        self.assertTrue(np.isnan(iqr))


class TestCalculatePearsonCorrelation(unittest.TestCase):
    def test_typical_series(self):

        # Arrange
        series1 = {
            "2023-01-01": 1,
            "2023-01-02": 2,
            "2023-01-03": 3,
            "2023-01-04": 4,
            "2023-01-05": 5
        }

        series2 = {
            "2023-01-01": 5,
            "2023-01-02": 4,
            "2023-01-03": 3,
            "2023-01-04": 2,
            "2023-01-05": 1
        }

        # Act
        correlation = calculate_pearson_correlation(series1, series2)

        # Assert
        self.assertAlmostEqual(correlation, -1.0)

    def test_empty_series(self):

        # Arrange
        series1 = {}
        series2 = {}

        # Act
        correlation = calculate_pearson_correlation(series1, series2)

        # Assert
        self.assertTrue(np.isnan(correlation))

    def test_one_series_empty(self):
        # Arrange
        series1 = {
            "2023-01-01": 1,
            "2023-01-02": 2
        }
        series2 = {}

        # Act
        correlation = calculate_pearson_correlation(series1, series2)

        # Assert
        self.assertTrue(np.isnan(correlation))

    def test_non_dict_input(self):
        # Arrange
        series1 = [1, 2, 3]
        series2 = [4, 5, 6]

        # Act
        correlation = calculate_pearson_correlation(series1, series2)

        # Assert
        self.assertTrue(np.isnan(correlation))

    def test_nan_values(self):
        # Arrange
        series1 = {
            "2023-01-01": np.nan,
            "2023-01-02": 2,
            "2023-01-03": 3
        }
        series2 = {
            "2023-01-01": 5,
            "2023-01-02": np.nan,
            "2023-01-03": 6
        }

        # Act
        correlation = calculate_pearson_correlation(series1, series2)

        # Assert
        self.assertTrue(np.isnan(correlation))


if __name__ == "__main__":
    unittest.main()
