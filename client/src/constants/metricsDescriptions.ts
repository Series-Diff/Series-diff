/**
 * Metrics Descriptions File
 * 
 * This file contains detailed descriptions and interpretation guides for all metrics
 * used in the application. Each metric includes:
 * - name: Display name of the metric
 * - description: What the metric calculates
 * - interpretation: How to understand the values
 * - range: Expected value range
 * - examples: Example interpretations of specific values
 */

// Basic metric info shape used for custom/plugin metrics
export interface BasicMetricInfo {
    name: string;
    description: string;
}

// Full metric description with interpretation and examples
export interface MetricDescription extends BasicMetricInfo {
    interpretation: string;
    range: string;
    examples: { value: string; meaning: string }[];
}

export const METRICS_DESCRIPTIONS: Record<string, MetricDescription> = {
    'mean': {
        name: 'Mean',
        description: 'Arithmetic mean of values in the time series.',
        interpretation: 'Shows the central tendency of data - typical value in the dataset.',
        range: 'Any real number',
        examples: [
            { value: '> 0', meaning: 'Positive values in the series' },
            { value: '= 0', meaning: 'Values balanced around zero' },
            { value: '< 0', meaning: 'Negative values in the series' }
        ]
    },
    'median': {
        name: 'Median',
        description: 'Middle value in the sorted time series.',
        interpretation: 'Value that divides the dataset into two equal parts. Robust to outliers.',
        range: 'Any real number',
        examples: [
            { value: 'vs Mean', meaning: 'If median ≈ mean, data is symmetric' },
            { value: 'median < mean', meaning: 'Right-skewed distribution' },
            { value: 'median > mean', meaning: 'Left-skewed distribution' }
        ]
    },
    'variance': {
        name: 'Variance',
        description: 'Average of squared deviations from the mean.',
        interpretation: 'Measures data dispersion - how much values differ from the mean.',
        range: '≥ 0',
        examples: [
            { value: '= 0', meaning: 'All values are identical' },
            { value: 'Low', meaning: 'Data clustered close to the mean' },
            { value: 'High', meaning: 'Data highly dispersed' }
        ]
    },
    'std_dev': {
        name: 'Standard Deviation',
        description: 'Square root of variance.',
        interpretation: 'Measures typical deviation of values from the mean in the same units as the data.',
        range: '≥ 0',
        examples: [
            { value: '= 0', meaning: 'No variability in data' },
            { value: 'Low', meaning: 'Data stable, predictable' },
            { value: 'High', meaning: 'Data variable, unpredictable' }
        ]
    },
    'pearson_correlation': {
        name: 'Pearson Correlation',
        description: 'Measures the strength and direction of linear relationship between two time series.',
        interpretation: 'Shows how much two series change together in a linear fashion.',
        range: '[-1, 1]',
        examples: [
            { value: '1', meaning: 'Perfect positive correlation - series grow together' },
            { value: '0', meaning: 'No linear correlation' },
            { value: '-1', meaning: 'Perfect negative correlation - one grows, other decreases' },
            { value: '0.7-1', meaning: 'Strong positive correlation' },
            { value: '0.3-0.7', meaning: 'Moderate positive correlation' },
            { value: '0-0.3', meaning: 'Weak positive correlation' }
        ]
    },
    'cosine_similarity': {
        name: 'Cosine Similarity',
        description: 'Measures the cosine of the angle between two vectors representing time series.',
        interpretation: 'Shows directional similarity, regardless of magnitude.',
        range: '[-1, 1]',
        examples: [
            { value: '1', meaning: 'Identical direction - series are proportional' },
            { value: '0', meaning: 'Orthogonal - no directional similarity' },
            { value: '-1', meaning: 'Opposite directions' },
            { value: '> 0.9', meaning: 'Very similar patterns' },
            { value: '0.5-0.9', meaning: 'Moderately similar' },
            { value: '< 0.5', meaning: 'Weak similarity' }
        ]
    },
    'autocorrelation': {
        name: 'Autocorrelation',
        description: 'Correlation of the time series with its lagged version.',
        interpretation: 'Shows how much values in the series are related to earlier values.',
        range: '[-1, 1]',
        examples: [
            { value: '1', meaning: 'Perfect autocorrelation - strong trend/seasonality' },
            { value: '0', meaning: 'No autocorrelation - random data' },
            { value: '-1', meaning: 'Negative autocorrelation - strong oscillations' },
            { value: '> 0.7', meaning: 'Strong trend or seasonality' }
        ]
    },
    'mae': {
        name: 'MAE (Mean Absolute Error)',
        description: 'Average of absolute differences between two series.',
        interpretation: 'Measures average prediction error or difference between series.',
        range: '≥ 0',
        examples: [
            { value: '0', meaning: 'Perfect fit - no differences' },
            { value: 'Low', meaning: 'Small differences between series' },
            { value: 'High', meaning: 'Large differences between series' }
        ]
    },
    'rmse': {
        name: 'RMSE (Root Mean Square Error)',
        description: 'Square root of the average squared differences between two series.',
        interpretation: 'Similar to MAE, but penalizes larger errors more heavily.',
        range: '≥ 0',
        examples: [
            { value: '0', meaning: 'Perfect fit' },
            { value: 'RMSE > MAE', meaning: 'Presence of large errors' },
            { value: 'RMSE ≈ MAE', meaning: 'Errors are uniform' },
            { value: 'Low', meaning: 'Good fit between series' },
            { value: 'High', meaning: 'Poor fit' }
        ]
    },
    'dtw': {
        name: 'DTW (Dynamic Time Warping)',
        description: 'Distance between series with optimal time alignment.',
        interpretation: 'Measures similarity of series, allowing for time shifts and varying pace of changes.',
        range: '≥ 0',
        examples: [
            { value: '0', meaning: 'Identical series (after alignment)' },
            { value: 'Low', meaning: 'Similar patterns despite time differences' },
            { value: 'High', meaning: 'Different patterns' },
            { value: 'DTW < Euclidean', meaning: 'Series have similar shape but are shifted' }
        ]
    },
    'euclidean': {
        name: 'Euclidean Distance',
        description: 'Straight-line distance between points representing series.',
        interpretation: 'Measures direct point-by-point distance between series.',
        range: '≥ 0',
        examples: [
            { value: '0', meaning: 'Identical series' },
            { value: 'Low', meaning: 'Series are very similar' },
            { value: 'High', meaning: 'Series are very different' }
        ]
    },
    'moving_average': {
        name: 'Moving Average',
        description: 'Average of values in a sliding time window.',
        interpretation: 'Smooths short-term fluctuations and highlights long-term trends.',
        range: 'Depends on data',
        examples: [
            { value: 'Small window', meaning: 'More sensitive to changes' },
            { value: 'Large window', meaning: 'More smoothed, shows trends' },
            { value: 'Crossing', meaning: 'Intersection with data may signal trend change' }
        ]
    },
    'difference_chart': {
        name: 'Difference Chart',
        description: 'Point-by-point difference visualization between two series.',
        interpretation: 'Shows where and how much series differ over time.',
        range: 'Depends on data',
        examples: [
            { value: '≈ 0', meaning: 'Series are similar at this point' },
            { value: '> 0', meaning: 'First series greater than second' },
            { value: '< 0', meaning: 'First series less than second' },
            { value: 'High variability', meaning: 'Series cross frequently' }
        ]
    }
};

/**
 * Get metric description by metric key
 */
export const getMetricDescription = (metricKey: string): MetricDescription | undefined => {
    return METRICS_DESCRIPTIONS[metricKey];
};

/**
 * Check if metric has description available
 */
export const hasMetricDescription = (metricKey: string): boolean => {
    return metricKey in METRICS_DESCRIPTIONS;
};
