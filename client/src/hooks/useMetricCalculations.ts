import { useState, useEffect, useMemo } from 'react';
import * as services from '../services';

import type { CombinedMetric } from '../components';

type SingleMetricType = Record<string, Record<string, number>>;
type CorrelationMetricType = Record<string, Record<string, Record<string, number>>>;

type SingleMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<SingleMetricType>>;
    fetch: (filenamesPerCategory: Record<string, string[]>, start?: string, end?: string) => Promise<SingleMetricType>;
};

type AllCorrelationMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<CorrelationMetricType>>;
    fetch: (filenamesPerCategory: Record<string, string[]>, start?: string, end?: string) => Promise<CorrelationMetricType>;
};

type PerCategoryCorrelationMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<CorrelationMetricType>>;
    fetch: (...args: any[]) => Promise<Record<string, Record<string, number>>>;
};

export const useMetricCalculations = (
    filenamesPerCategory: Record<string, string[]>,
    selectedCategory: string | null,
    secondaryCategory: string | null,
    tertiaryCategory: string | null,
    startDate: Date | null,
    endDate: Date | null
) => {
    const [meanValues, setMeanValues] = useState<SingleMetricType>({});
    const [medianValues, setMedianValues] = useState<SingleMetricType>({});
    const [varianceValues, setVarianceValues] = useState<SingleMetricType>({});
    const [stdDevsValues, setStdDevsValues] = useState<SingleMetricType>({});
    const [autoCorrelationValues, setAutoCorrelationValues] = useState<SingleMetricType>({});
    const [maeValues, setMaeValues] = useState<CorrelationMetricType>({});
    const [rmseValues, setRmseValues] = useState<CorrelationMetricType>({});
    const [PearsonCorrelationValues, setPearsonCorrelationValues] = useState<CorrelationMetricType>({});
    const [DTWValues, setDTWValues] = useState<CorrelationMetricType>({});
    const [EuclideanValues, setEuclideanValues] = useState<CorrelationMetricType>({});
    const [CosineSimilarityValues, setCosineSimilarityValues] = useState<CorrelationMetricType>({});

    const [groupedMetrics, setGroupedMetrics] = useState<Record<string, CombinedMetric[]>>({});
    
    // Track selected metrics for reactive re-fetching
    // Note: stored as JSON array in localStorage, but converted to Set for consistent usage with useMetricsSelection
    const [selectedMetricsForDisplay, setSelectedMetricsForDisplay] = useState<Set<string> | null>(() => {
        const stored = localStorage.getItem('selectedMetricsForDisplay');
        return stored ? new Set(JSON.parse(stored)) : null;
    });

    // Listen for changes to selectedMetricsForDisplay
    useEffect(() => {
        const handleStorageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.key === 'selectedMetricsForDisplay') {
                const selectedArray = customEvent.detail.value as string[];
                setSelectedMetricsForDisplay(new Set(selectedArray)); // Convert array to Set for consistency
            }
        };

        window.addEventListener('localStorageChange', handleStorageChange);
        return () => window.removeEventListener('localStorageChange', handleStorageChange);
    }, []);

    // Helper array for single metrics
    const singleMetrics = useMemo<SingleMetricEntry[]>(() => [
        { key: 'meanValues', setter: setMeanValues, fetch: services.fetchAllMeans },
        { key: 'medianValues', setter: setMedianValues, fetch: services.fetchAllMedians },
        { key: 'varianceValues', setter: setVarianceValues, fetch: services.fetchAllVariances },
        { key: 'stdDevsValues', setter: setStdDevsValues, fetch: services.fetchAllStdDevs },
        { key: 'autoCorrelationValues', setter: setAutoCorrelationValues, fetch: services.fetchAllAutoCorrelations },
    ], []);

    // Helper array for all-correlation metrics like MAE and RMSE
    const allCorrelationMetrics = useMemo<AllCorrelationMetricEntry[]>(() => [
        { key: 'maeValues', setter: setMaeValues, fetch: services.fetchAllMae },
        { key: 'rmseValues', setter: setRmseValues, fetch: services.fetchAllRmse },
    ], []);

    // Helper array for per-category correlation metrics
    const perCategoryCorrelationMetrics = useMemo<PerCategoryCorrelationMetricEntry[]>(() => [
        { key: 'PearsonCorrelationValues', setter: setPearsonCorrelationValues, fetch: services.fetchAllPearsonCorrelations },
        { key: 'DTWValues', setter: setDTWValues, fetch: services.fetchAllDTWs },
        { key: 'EuclideanValues', setter: setEuclideanValues, fetch: services.fetchAllEuclideans },
        { key: 'CosineSimilarityValues', setter: setCosineSimilarityValues, fetch: services.fetchAllCosineSimilarities },
    ], []);

    // Helper to load metric from storage (restored original conditional parsing)
    const loadMetricFromStorage = (key: string, setter: React.Dispatch<React.SetStateAction<any>>, defaultValue = {}) => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                setter(JSON.parse(stored));
            } catch (e) {
                console.error(`Failed to parse ${key} from storage`, e);
                setter(defaultValue); // Fallback to {} if parse fails
            }
        } else {
            setter(defaultValue); // Set to {} if not stored
        }
    };

    useEffect(() => {
        singleMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        allCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        perCategoryCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
    }, [singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics]);

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length === 0) return;

        const fetchMetrics = async () => {
            try {
                const start = startDate ? startDate.toISOString() : undefined;
                const end = endDate ? endDate.toISOString() : undefined;

                // Get selected metrics from localStorage
                const selectedMetricsJson = localStorage.getItem('selectedMetricsForDisplay');
                const selectedMetrics = selectedMetricsJson ? new Set<string>(JSON.parse(selectedMetricsJson)) : null;

                // Mapping: metric value → state key
                const metricToStateKey: Record<string, string> = {
                    'mean': 'meanValues',
                    'median': 'medianValues',
                    'variance': 'varianceValues',
                    'std_dev': 'stdDevsValues',
                    'autocorrelation': 'autoCorrelationValues',
                    'mae': 'maeValues',
                    'rmse': 'rmseValues',
                    'pearson_correlation': 'PearsonCorrelationValues',
                    'dtw': 'DTWValues',
                    'euclidean': 'EuclideanValues',
                    'cosine_similarity': 'CosineSimilarityValues'
                };

                // Helper: check if metric should be fetched
                const shouldFetch = (metricValue: string) => {
                    return selectedMetrics === null || selectedMetrics.has(metricValue);
                };

                // Fetch single metrics in parallel (only if selected)
                const singleMetricsToFetch = singleMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                if (singleMetricsToFetch.length > 0) {
                    await Promise.all(
                        singleMetricsToFetch.map(async ({ fetch, setter }) => {
                            const data = await fetch(filenamesPerCategory, start, end);
                            setter(data);
                        })
                    );
                }

                // Fetch all-correlation metrics in parallel (only if selected)
                const allCorrelationMetricsToFetch = allCorrelationMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                if (allCorrelationMetricsToFetch.length > 0) {
                    await Promise.all(
                        allCorrelationMetricsToFetch.map(async ({ fetch, setter }) => {
                            const data = await fetch(filenamesPerCategory, start, end);
                            setter(data);
                        })
                    );
                }

                // Fetch per-category correlation metrics (only if selected)
                const perCategoryMetricsToFetch = perCategoryCorrelationMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                for (const { key, setter, fetch } of perCategoryMetricsToFetch) {
                    const data: CorrelationMetricType = {};
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const files = filenamesPerCategory[category];
                        let result;
                        if (key === 'EuclideanValues') {
                            result = await fetch(files, null, category, start, end);
                        } else {
                            result = await fetch(files, category, start, end);
                        }
                        data[category] = result;
                    }
                    setter(data);
                }
            } catch (err) {
                console.error('Error fetching metrics:', err);
            }
        };

        fetchMetrics();
    }, [filenamesPerCategory, singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics, startDate, endDate, selectedMetricsForDisplay]);

    useEffect(() => {
        const updatedGroupedMetrics: Record<string, CombinedMetric[]> = {};

        const visibleCategories = [selectedCategory, secondaryCategory, tertiaryCategory].filter(Boolean) as string[];

        visibleCategories.forEach((category) => {
            const meanMetricNames = Object.keys(meanValues[category] || {});
            const medianMetricNames = Object.keys(medianValues[category] || {});
            const varianceMetricNames = Object.keys(varianceValues[category] || {});
            const stdDevMetricNames = Object.keys(stdDevsValues[category] || {});
            const autoCorrelationMetricNames = Object.keys(autoCorrelationValues[category] || {});

            const allUniqueMetricNames = new Set([
                ...meanMetricNames,
                ...medianMetricNames,
                ...varianceMetricNames,
                ...stdDevMetricNames,
                ...autoCorrelationMetricNames
            ]);

            updatedGroupedMetrics[category] = Array.from(allUniqueMetricNames).map((metricName) => ({
                id: metricName,
                name: metricName,
                mean: meanValues[category]?.[metricName],
                median: medianValues[category]?.[metricName],
                variance: varianceValues[category]?.[metricName],
                stdDev: stdDevsValues[category]?.[metricName],
                autoCorrelation: autoCorrelationValues[category]?.[metricName],
            }));
        });

        setGroupedMetrics(updatedGroupedMetrics);
    }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, selectedCategory, secondaryCategory, tertiaryCategory]);

    useEffect(() => {
        const allMetrics = [...singleMetrics, ...allCorrelationMetrics, ...perCategoryCorrelationMetrics];
        const metricMap: Record<string, any> = {
            meanValues, medianValues, varianceValues, stdDevsValues,
            autoCorrelationValues, maeValues, rmseValues,
            PearsonCorrelationValues, DTWValues, EuclideanValues,
            CosineSimilarityValues
        };
        allMetrics.forEach(({ key }) => {
            const value = metricMap[key];
            if (value && Object.keys(value).length > 0) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
    }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics]);

    const resetMetrics = () => {
        setMeanValues({});
        setMedianValues({});
        setVarianceValues({});
        setStdDevsValues({});
        setAutoCorrelationValues({});
        setMaeValues({});
        setRmseValues({});
        setPearsonCorrelationValues({});
        setDTWValues({});
        setEuclideanValues({});
        setCosineSimilarityValues({});
        setGroupedMetrics({});

        // Clear from localStorage
        localStorage.removeItem('meanValues');
        localStorage.removeItem('medianValues');
        localStorage.removeItem('varianceValues');
        localStorage.removeItem('stdDevsValues');
        localStorage.removeItem('autoCorrelationValues');
        localStorage.removeItem('maeValues');
        localStorage.removeItem('rmseValues');
        localStorage.removeItem('PearsonCorrelationValues');
        localStorage.removeItem('DTWValues');
        localStorage.removeItem('EuclideanValues');
        localStorage.removeItem('CosineSimilarityValues');
    };

    return {
        maeValues,
        rmseValues,
        PearsonCorrelationValues,
        DTWValues,
        EuclideanValues,
        CosineSimilarityValues,
        groupedMetrics,
        resetMetrics,
    };
};