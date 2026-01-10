import { useState, useEffect, useMemo } from 'react';
import * as services from '../services';
import { apiLogger } from '../utils/apiLogger';
import { metricsCacheManager } from '../utils/metricsCacheManager';
import { useGlobalCache } from '../contexts/CacheContext';

import type { CombinedMetric } from '../components';
import type { CacheKey } from '../utils/metricsCacheManager';

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
    endDate: Date | null,
    timeRangePending: boolean,
    defaultMinDateForBounds?: Date | null,
    defaultMaxDateForBounds?: Date | null
) => {
    const globalCache = useGlobalCache();
    
    // Set global cache in metricsCacheManager on mount
    useEffect(() => {
        metricsCacheManager.setCache(globalCache.metricsCache);
    }, [globalCache.metricsCache]);
    
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

    // Stable, memoized default bounds as ISO strings to avoid identity churn
    const defaultMinIso = useMemo(() => (
        defaultMinDateForBounds ? new Date(defaultMinDateForBounds.getTime()).toISOString() : null
    ), [defaultMinDateForBounds ? defaultMinDateForBounds.getTime() : null]);
    const defaultMaxIso = useMemo(() => (
        defaultMaxDateForBounds ? new Date(defaultMaxDateForBounds.getTime()).toISOString() : null
    ), [defaultMaxDateForBounds ? defaultMaxDateForBounds.getTime() : null]);

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length === 0) return;
        // Ensure we always include start/end in requests by waiting until both are ready
        if (timeRangePending) return;

        const fetchMetrics = async () => {
            try {
            // Standardize full-range parameters as null (not undefined)
            const start: string | null = startDate ? startDate.toISOString() : null;
            const end: string | null = endDate ? endDate.toISOString() : null;
                
                // Generate cache key prefix for date range
                // Normalize nulls to bounds to keep keys stable when toggling full range
                const effectiveStartKey = (start === null)
                    ? defaultMinIso
                    : start;
                const effectiveEndKey = (end === null)
                    ? defaultMaxIso
                    : end;
                const dateRangeKey = `${effectiveStartKey || 'no-start'}_to_${effectiveEndKey || 'no-end'}`;

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
                        singleMetricsToFetch.map(async ({ key, fetch, setter }) => {
                            // Map hook key to metric type name
                            const metricTypeMap: Record<string, string> = {
                                meanValues: 'mean',
                                medianValues: 'median',
                                varianceValues: 'variance',
                                stdDevsValues: 'stdDev',
                                autoCorrelationValues: 'autocorrelation',
                            };
                            const metricType = metricTypeMap[key] || key;
                            
                            // Check cache for each category
                            let cachedData: SingleMetricType = {};
                            let categoriesToFetch: string[] = [];
                            
                            for (const category of Object.keys(filenamesPerCategory)) {
                                const cacheParams: CacheKey = {
                                    metricType,
                                    category,
                                    dateRange: dateRangeKey,
                                };
                                
                                const cached = metricsCacheManager.get<Record<string, number>>(cacheParams);
                                if (cached) {
                                    cachedData[category] = cached;
                                    apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                        params: { start, end },
                                        fromCache: true,
                                        cacheKey: `${metricType}|${category}|${dateRangeKey}`,
                                        duration: 0,
                                        status: 200,
                                    });
                                } else {
                                    categoriesToFetch.push(category);
                                }
                            }
                            
                            // If all categories cached, use cached data
                            if (categoriesToFetch.length === 0) {
                                if (Object.keys(cachedData).length > 0) {
                                    setter(cachedData);
                                }
                                return;
                            }
                            
                            // Fetch data for categories not in cache
                            const startTime = performance.now();
                            apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                params: { categories: categoriesToFetch.length, start, end },
                            });
                            
                            const data = await fetch(filenamesPerCategory, start || undefined, end || undefined);
                            const duration = Math.round(performance.now() - startTime);
                            
                            apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                params: { categories: categoriesToFetch.length, start, end },
                                duration,
                                status: 200,
                            });
                            
                            // Cache each category separately
                            for (const category of Object.keys(data)) {
                                if (categoriesToFetch.includes(category)) {
                                    const cacheParams: CacheKey = {
                                        metricType,
                                        category,
                                        dateRange: dateRangeKey,
                                    };
                                    metricsCacheManager.set(cacheParams, data[category]);
                                }
                            }
                            
                            // Merge cached and newly fetched data
                            const mergedData = { ...cachedData, ...data };
                            setter(mergedData);
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
                        allCorrelationMetricsToFetch.map(async ({ key, fetch, setter }) => {
                            // Map hook key to metric type name
                            const metricTypeMap: Record<string, string> = {
                                maeValues: 'mae',
                                rmseValues: 'rmse',
                            };
                            const metricType = metricTypeMap[key] || key;
                            
                            // Check cache for each category
                            let cachedData: CorrelationMetricType = {};
                            let categoriesToFetch: string[] = [];
                            
                            for (const category of Object.keys(filenamesPerCategory)) {
                                const cacheParams: CacheKey = {
                                    metricType,
                                    category,
                                    dateRange: dateRangeKey,
                                };
                                
                                const cached = metricsCacheManager.get<Record<string, Record<string, number>>>(cacheParams);
                                if (cached) {
                                    cachedData[category] = cached;
                                    apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                        params: { start, end },
                                        fromCache: true,
                                        cacheKey: `${metricType}|${category}|${dateRangeKey}`,
                                        duration: 0,
                                        status: 200,
                                    });
                                } else {
                                    categoriesToFetch.push(category);
                                }
                            }
                            
                            // If all categories cached, use cached data
                            if (categoriesToFetch.length === 0) {
                                if (Object.keys(cachedData).length > 0) {
                                    setter(cachedData);
                                }
                                return;
                            }
                            
                            // Fetch data for categories not in cache
                            const startTime = performance.now();
                            apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                params: { categories: categoriesToFetch.length, start, end },
                            });
                            
                            const data = await fetch(filenamesPerCategory, start || undefined, end || undefined);
                            const duration = Math.round(performance.now() - startTime);
                            
                            apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                params: { categories: categoriesToFetch.length, start, end },
                                duration,
                                status: 200,
                            });
                            
                            // Cache each category separately
                            for (const category of Object.keys(data)) {
                                if (categoriesToFetch.includes(category)) {
                                    const cacheParams: CacheKey = {
                                        metricType,
                                        category,
                                        dateRange: dateRangeKey,
                                    };
                                    metricsCacheManager.set(cacheParams, data[category]);
                                }
                            }
                            
                            // Merge cached and newly fetched data
                            const mergedData = { ...cachedData, ...data };
                            setter(mergedData);
                        })
                    );
                }

                // Fetch per-category correlation metrics (only if selected)
                const perCategoryMetricsToFetch = perCategoryCorrelationMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                for (const { key, setter, fetch } of perCategoryMetricsToFetch) {
                    const metricTypeMap: Record<string, string> = {
                        PearsonCorrelationValues: 'pearson_correlation',
                        DTWValues: 'dtw',
                        EuclideanValues: 'euclidean',
                        CosineSimilarityValues: 'cosine_similarity',
                    };
                    const metricType = metricTypeMap[key] || key;
                    
                    const data: CorrelationMetricType = {};
                    
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const cacheParams: CacheKey = {
                            metricType,
                            category,
                            dateRange: dateRangeKey,
                        };
                        
                        // Check cache first
                        const cached = metricsCacheManager.get<Record<string, Record<string, number>>>(cacheParams);
                        if (cached) {
                            data[category] = cached;
                            apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                params: { start, end },
                                fromCache: true,
                                cacheKey: `${metricType}|${category}|${dateRangeKey}`,
                                duration: 0,
                                status: 200,
                            });
                            continue;
                        }
                        
                        // Fetch if not cached
                        const startTime = performance.now();
                        const files = filenamesPerCategory[category];
                        
                        apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                            params: { files: files.length, start, end },
                        });
                        
                        let result;
                        try {
                            if (key === 'EuclideanValues') {
                                result = await fetch(files, null, category, start || undefined, end || undefined);
                            } else {
                                result = await fetch(files, category, start || undefined, end || undefined);
                            }
                            
                            const duration = Math.round(performance.now() - startTime);
                            
                            apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                params: { files: files.length, start, end },
                                duration,
                                status: 200,
                            });
                            
                            // Cache the result only on success
                            metricsCacheManager.set(cacheParams, result);
                            data[category] = result;
                        } catch (fetchError) {
                            const duration = Math.round(performance.now() - startTime);
                            apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                params: { files: files.length, start, end },
                                duration,
                                status: 500,
                            });
                            console.warn(`Failed to fetch ${metricType} for ${category}:`, fetchError);
                            // Don't cache errors, skip this category
                        }
                    }
                    
                    setter(data);
                }
            } catch (err) {
                apiLogger.logQuery('/api/metrics', 'GET', {
                    status: 500,
                    duration: 0,
                });
                console.error('Error fetching metrics:', err);
            }
        };

        fetchMetrics();
    }, [
        filenamesPerCategory,
        singleMetrics,
        allCorrelationMetrics,
        perCategoryCorrelationMetrics,
        startDate,
        endDate,
        selectedMetricsForDisplay,
        timeRangePending,
        defaultMinIso,
        defaultMaxIso
    ]);

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