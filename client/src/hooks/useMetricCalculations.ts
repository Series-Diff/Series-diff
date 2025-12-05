import { useState, useEffect, useMemo } from 'react';
import * as services from '../services';

import type { CombinedMetric } from '../components';

type SingleMetricType = Record<string, Record<string, number>>;
type CorrelationMetricType = Record<string, Record<string, Record<string, number>>>;

type SingleMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<SingleMetricType>>;
    fetch: (filenamesPerCategory: Record<string, string[]>) => Promise<SingleMetricType>;
};

type AllCorrelationMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<CorrelationMetricType>>;
    fetch: (filenamesPerCategory: Record<string, string[]>) => Promise<CorrelationMetricType>;
};

type PerCategoryCorrelationMetricEntry = {
    key: string;
    setter: React.Dispatch<React.SetStateAction<CorrelationMetricType>>;
    fetch: (...args: any[]) => Promise<Record<string, Record<string, number>>>;
};

export const useMetricCalculations = (
    filenamesPerCategory: Record<string, string[]>,
    selectedCategory: string | null,
    secondaryCategory: string | null
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
        // Load all metrics with original conditional logic
        singleMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        allCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        perCategoryCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
    }, [singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics]);

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length === 0) return;

        const fetchMetrics = async () => {
            try {
                // Fetch single metrics in parallel
                await Promise.all(
                    singleMetrics.map(async ({ fetch, setter }) => {
                        const data = await fetch(filenamesPerCategory);
                        setter(data);
                    })
                );

                // Fetch all-correlation metrics in parallel
                await Promise.all(
                    allCorrelationMetrics.map(async ({ fetch, setter }) => {
                        const data = await fetch(filenamesPerCategory);
                        setter(data);
                    })
                );

                // Fetch per-category correlation metrics
                for (const { key, setter, fetch } of perCategoryCorrelationMetrics) {
                    const data: CorrelationMetricType = {};
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const files = filenamesPerCategory[category];
                        // For Euclidean, it might need special params
                        let result;
                        if (key === 'EuclideanValues') {
                            result = await fetch(files, null, category);
                        } else {
                            result = await fetch(files, category);
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
    }, [filenamesPerCategory, singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics]);

    useEffect(() => {
        const updatedGroupedMetrics: Record<string, CombinedMetric[]> = {};

        const visibleCategories = [selectedCategory, secondaryCategory].filter(Boolean) as string[];

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
    }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, selectedCategory, secondaryCategory]);

    useEffect(() => {
        const allMetrics = [...singleMetrics, ...allCorrelationMetrics, ...perCategoryCorrelationMetrics];
        allMetrics.forEach(({ key }) => {
            const value = {
                meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, maeValues, rmseValues,
                PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues
            }[key.split('Values')[0]]; // Map key to value
            if (Object.keys(value || {}).length > 0) {
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