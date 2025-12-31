import { useState, useEffect, useMemo, useRef } from 'react';
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

const RATE_LIMIT_MESSAGE = 'Network or CORS issue (possibly triggered by rate limiting). Please wait and retry.';
const SERVER_ERROR_MESSAGE = 'Server error while calculating metrics. Please try again.';
const BAD_REQUEST_FALLBACK = 'Bad request. Server encountered an error processing your data.';

const extractErrorDetail = (err: any): string | undefined => {
    const body = (err as any)?.body;
    if (typeof body === 'string' && body.trim()) {
        try {
            const parsed = JSON.parse(body);
            if (parsed?.error) {
                return String(parsed.error);
            }
        } catch {
            return body.trim();
        }
    }

    const message = err?.message;
    if (typeof message === 'string') {
        const dashParts = message.split(' - ');
        if (dashParts.length > 1) {
            return dashParts.slice(1).join(' - ').trim();
        }
        return message;
    }

    return undefined;
};

const buildErrorMessage = (err: any): string => {
    const status = (err as any)?.status ?? err?.response?.status;
    const detail = extractErrorDetail(err);

    if (status === 429) {
        return RATE_LIMIT_MESSAGE;
    }
    if (status === 500) {
        return SERVER_ERROR_MESSAGE;
    }
    if (status === 400) {
        return detail ? `Bad request: ${detail}` : BAD_REQUEST_FALLBACK;
    }
    if (err instanceof TypeError) {
        return RATE_LIMIT_MESSAGE;
    }

    return detail || 'Failed to fetch metric';
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
    
    // Error states for metrics
    const [metricErrors, setMetricErrors] = useState<Record<string, string>>({});
    
    // Loading state to prevent UI janking
    const [isMetricsLoading, setIsMetricsLoading] = useState(false);
    
    // Track previous filenamesPerCategory to prevent re-fetching on tab switch
    const prevFilenameCategoryRef = useRef<Record<string, string[]> | null>(null);
    // Track whether metrics were restored from storage to avoid redundant refetch on remount
    const restoredFromStorageRef = useRef(false);
    // Track whether any stored metric failed to parse; if true we must refetch
    const storageParseFailedRef = useRef(false);


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
    const loadMetricFromStorage = <T>(
        key: string,
        setter: React.Dispatch<React.SetStateAction<T>>,
        defaultValue: T = {} as unknown as T,
    ) => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as T;
                setter(parsed);
                restoredFromStorageRef.current = true;
            } catch (e) {
                console.error(`Failed to parse ${key} from storage`, e);
                storageParseFailedRef.current = true;
                setter(defaultValue); // Fallback to {} if parse fails
            }
        } else {
            setter(defaultValue); // Set to {} if not stored
        }
    };

    // Load metricErrors from storage
    useEffect(() => {
        const storedErrors = localStorage.getItem('metricErrors');
        if (storedErrors) {
            try {
                setMetricErrors(JSON.parse(storedErrors));
            } catch (e) {
                console.error('Failed to parse metricErrors from storage', e);
                setMetricErrors({});
            }
        }
    }, []);

    useEffect(() => {
        // Load all metrics from storage on mount (not on every metric change)
        singleMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        allCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        perCategoryCorrelationMetrics.forEach(({ key, setter }) => loadMetricFromStorage(key, setter));
        // Always clear the restoredFromStorageRef after initial mount
        restoredFromStorageRef.current = false;
    }, [singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics]);

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length === 0) return;

        // Only skip fetch if filenames are identical to previous (prevents unnecessary reloads on tab switch)
        const isSameFilenames = prevFilenameCategoryRef.current &&
            JSON.stringify(prevFilenameCategoryRef.current) === JSON.stringify(filenamesPerCategory);
        if (isSameFilenames) {
            setIsMetricsLoading(false);
            return;
        }

        prevFilenameCategoryRef.current = filenamesPerCategory;
        setIsMetricsLoading(true);

        const fetchMetrics = async () => {
            const errors: Record<string, string> = {};
            try {
                await Promise.all(
                    singleMetrics.map(async ({ key, fetch, setter }) => {
                        try {
                            const data = await fetch(filenamesPerCategory);
                            setter(data);
                        } catch (err: any) {
                            const errorMessage = buildErrorMessage(err);
                            if (!errors.statistics) {
                                errors.statistics = errorMessage;
                            }
                            console.error(`Error fetching single metric ${key}:`, err);
                        }
                    })
                );

                await Promise.all(
                    allCorrelationMetrics.map(async ({ key, fetch, setter }) => {
                        try {
                            const data = await fetch(filenamesPerCategory);
                            setter(data);
                        } catch (err: any) {
                            const errorMessage = buildErrorMessage(err);
                            errors[key] = errors[key] || errorMessage;
                            console.error(`Error fetching ${key}:`, err);
                        }
                    })
                );

                for (const { key, setter, fetch } of perCategoryCorrelationMetrics) {
                    try {
                        const data: CorrelationMetricType = {};
                        for (const category of Object.keys(filenamesPerCategory)) {
                            try {
                                const files = filenamesPerCategory[category];
                                const result = key === 'EuclideanValues'
                                    ? await fetch(files, null, category)
                                    : await fetch(files, category);
                                data[category] = result;
                            } catch (categoryErr: any) {
                                const errorMessage = buildErrorMessage(categoryErr);
                                errors[key] = errors[key] || errorMessage;
                                console.error(`Error fetching ${key} for category ${category}:`, categoryErr);
                            }
                        }
                        setter(data);
                    } catch (err: any) {
                        const errorMessage = buildErrorMessage(err);
                        errors[key] = errors[key] || errorMessage;
                        console.error(`Error fetching ${key}:`, err);
                    }
                }

                setMetricErrors(errors);
            } catch (err) {
                console.error('Error in metric fetch batch:', err);
            } finally {
                setIsMetricsLoading(false);
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

        if (Object.keys(metricErrors).length > 0) {
            localStorage.setItem('metricErrors', JSON.stringify(metricErrors));
        } else {
            localStorage.removeItem('metricErrors');
        }
    }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics, metricErrors]);

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
        setMetricErrors({});
        localStorage.removeItem('metricErrors');

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
        metricErrors,
        isMetricsLoading,
        resetMetrics,
    };
};