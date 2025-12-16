/**
 * Metrics Configuration File
 * 
 * This file contains the predefined metrics definitions and category taxonomy
 * for the Metrics Page component.
 */

export interface Metric {
    value: string;
    label: string;
    description: string;
    category: string;
    fileName?: string;
}

/**
 * Extended categories to cover all current and potential metrics:
 * - Statistical: Basic descriptive stats like mean, median, variance, std dev, skewness, kurtosis, IQR, entropy, autocorrelation
 * - Variability: Error metrics like MAE, MSE, RMSE, SMAPE
 * - Temporal: Time-based like DTW, cross-correlation, rolling statistics (moving average), time warp edit distance (TWED)
 * - Anomaly: Anomaly detection like Euclidean, Fréchet
 * - Similarity: Correlation and similarity like Pearson, Kendall, cosine
 * - Distance: General distance metrics like Manhattan (L1), Chebyshev, Kendall Tau distance, edit distance on real sequences (EDR), longest common subsequence (LCSS)
 * - Transformation: Transformation-based like Fourier coefficient distance, wavelet coefficient distance, SAX (Symbolic Aggregate approXimation)
 * - Model-Based: Model-specific like ARIMA model distance, HMM likelihood distance
 * - Difference: For difference charts
 */
export const METRIC_CATEGORIES = [
    'All',
    'Statistical',
    'Variability',
    'Temporal',
    'Anomaly',
    'Similarity',
    'Distance',
    'Transformation',
    'Model-Based',
    'Difference'
] as const;

export type MetricCategory = typeof METRIC_CATEGORIES[number];

/**
 * Predefined metrics available in the application.
 * Commented metrics are planned for future implementation.
 */
export const PREDEFINED_METRICS: Metric[] = [
    // Statistics (basic descriptive stats)
    { value: 'mean', label: 'Mean', description: 'Average value of the time series data', category: 'Statistical' },
    { value: 'median', label: 'Median', description: 'Middle value in the sorted time series data', category: 'Statistical' },
    { value: 'variance', label: 'Variance', description: 'Measure of data dispersion from the mean', category: 'Statistical' },
    { value: 'std_dev', label: 'Standard Deviation', description: 'Square root of variance, indicating data spread', category: 'Statistical' },
    { value: 'autocorrelation', label: 'Autocorrelation', description: 'Correlation of the series with its lagged version', category: 'Temporal' },
    // { value: 'kurtosis', label: 'Kurtosis', description: 'Measure of the tailedness of the data distribution', category: 'Statistical' },
    // { value: 'iqr', label: 'IQR (Interquartile Range)', description: 'Difference between the 75th and 25th percentiles, measuring spread', category: 'Statistical' },
    // { value: 'skewness', label: 'Skewness', description: 'Measure of the asymmetry of the data distribution', category: 'Statistical' },
    // { value: 'entropy', label: 'Entropy', description: 'Measure of uncertainty or randomness in the data', category: 'Statistical' },

    // Metrics
    { value: 'pearson_correlation', label: 'Pearson Correlation', description: 'Measures linear correlation between series in matrix form', category: 'Similarity' },
    { value: 'cosine_similarity', label: 'Cosine Similarity', description: 'Measures angle between vectors for similarity in matrix form', category: 'Similarity' },
    { value: 'mae', label: 'MAE (Mean Absolute Error)', description: 'Mean Absolute Error measures average magnitude of errors in matrix form', category: 'Variability' },
    // { value: 'mse', label: 'MSE (Mean Squared Error)', description: 'Mean Squared Error measures average squared errors', category: 'Variability' },
    { value: 'rmse', label: 'RMSE (Root Mean Square Error)', description: 'Root Mean Square Error emphasizes larger errors in matrix form', category: 'Variability' },
    { value: 'dtw', label: 'DTW (Dynamic Time Warping)', description: 'Dynamic Time Warping for temporal alignment in matrix form', category: 'Temporal' },
    { value: 'euclidean', label: 'Euclidean Distance', description: 'Straight-line distance for anomaly detection in matrix form', category: 'Anomaly' },
    { value: 'difference_chart', label: 'Difference Chart', description: 'Visualizes differences between time series data', category: 'Difference' },

    // Rolling statistics
    { value: 'moving_average', label: 'Moving Average', description: 'Rolling mean for smoothing time series over various windows', category: 'Temporal' },

    // Potential future metrics (commented out)
    // { value: 'manhattan', label: 'Manhattan Distance (L1)', description: 'Sum of absolute differences for distance measurement', category: 'Distance' },
    // { value: 'chebyshev', label: 'Chebyshev Distance', description: 'Maximum absolute difference along any coordinate', category: 'Distance' },
    // { value: 'kendall_correlation', label: 'Kendall Correlation', description: 'Measures ordinal association between series', category: 'Similarity' },
    // { value: 'fourier_distance', label: 'Fourier Coefficient Distance', description: 'Distance based on Fourier transform coefficients', category: 'Transformation' },
    // { value: 'wavelet_distance', label: 'Wavelet Coefficient Distance', description: 'Distance based on wavelet transform coefficients', category: 'Transformation' },
    // { value: 'sax', label: 'SAX (Symbolic Aggregate approXimation)', description: 'Symbolic representation for time series approximation', category: 'Transformation' },
    // { value: 'arima_distance', label: 'ARIMA Model Distance', description: 'Distance based on ARIMA model parameters or residuals', category: 'Model-Based' },
    // { value: 'hmm_distance', label: 'HMM Likelihood Distance', description: 'Distance based on Hidden Markov Model likelihood', category: 'Model-Based' },
    // { value: 'cross_correlation', label: 'Cross-Correlation Function', description: 'Measures similarity as a function of displacement', category: 'Temporal' },
    // { value: 'smape', label: 'SMAPE (Symmetric Mean Absolute Percentage Error)', description: 'Symmetric percentage error for forecasting accuracy', category: 'Variability' },
    // { value: 'kendall_tau', label: 'Kendall Tau Distance', description: 'Distance based on Kendall Tau rank correlation', category: 'Distance' },
    // { value: 'frechet', label: 'Fréchet Distance', description: 'Measures similarity between curves considering location and ordering', category: 'Distance' },
    // { value: 'edr', label: 'EDR (Edit Distance on Real Sequences)', description: 'Edit distance for real-valued sequences', category: 'Distance' },
    // { value: 'lcss', label: 'LCSS (Longest Common Subsequence)', description: 'Longest common subsequence for sequence similarity', category: 'Distance' },
    // { value: 'twed', label: 'TWED (Time Warp Edit Distance)', description: 'Time warp edit distance combining DTW and edit distance', category: 'Temporal' },
];
