import { useState, useEffect, useMemo, useCallback } from 'react';
import * as services from '../services';
import { apiLogger } from '../utils/apiLogger';
import { metricsCacheManager } from '../utils/metricsCacheManager';
import { errorSimulator } from '../utils/errorSimulator';
import { useGlobalCache } from '../contexts/CacheContext';

import type { CombinedStatistic } from '../components';
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

    // Per-metric isLoading and error state
    // Initialize loading as true for all correlation/pairwise metrics to prevent "No data available" flash
    const [metricLoading, setMetricLoading] = useState<Record<string, boolean>>({
        PearsonCorrelationValues: true,
        CosineSimilarityValues: true,
        maeValues: true,
        rmseValues: true,
        DTWValues: true,
        EuclideanValues: true,
    });
    const [metricError, setMetricError] = useState<Record<string, string | null>>({});

    const [groupedMetrics, setGroupedMetrics] = useState<Record<string, CombinedStatistic[]>>({});
    
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
    ), [defaultMinDateForBounds]);
    const defaultMaxIso = useMemo(() => (
        defaultMaxDateForBounds ? new Date(defaultMaxDateForBounds.getTime()).toISOString() : null
    ), [defaultMaxDateForBounds]);

    // Helper function to clamp a date string to data bounds
    // Returns clamped ISO string or null if input is null
    const clampDateToDataBounds = useCallback((dateIso: string | null, isStart: boolean): string | null => {
        if (!dateIso) return null;
        
        const date = new Date(dateIso);
        const minBound = defaultMinDateForBounds ? new Date(defaultMinDateForBounds.getTime()) : null;
        const maxBound = defaultMaxDateForBounds ? new Date(defaultMaxDateForBounds.getTime()) : null;
        
        if (isStart && minBound && date < minBound) {
            return minBound.toISOString();
        }
        if (!isStart && maxBound && date > maxBound) {
            return maxBound.toISOString();
        }
        
        return dateIso;
    }, [defaultMinDateForBounds, defaultMaxDateForBounds]);

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length === 0) return;
        if (timeRangePending) return;

        // Compute total unique files loaded across categories
        const uniqueFileSet = new Set(Object.values(filenamesPerCategory).flat());
        const totalFilesLoaded = uniqueFileSet.size;

        // Helper to set loading/error for a metric
        const setLoading = (metricKey: string, value: boolean) => setMetricLoading(prev => ({ ...prev, [metricKey]: value }));
        const setErrorState = (metricKey: string, error: string | null) => setMetricError(prev => ({ ...prev, [metricKey]: error }));

        // Pre-emptively mark metrics as loading when a selection/date-range change happens
        // and there is no cached data for that metric+dateRange (so the UI can show spinners immediately)
        (async () => {
            try {
                const start: string | null = startDate ? startDate.toISOString() : null;
                const end: string | null = endDate ? endDate.toISOString() : null;
                // Clamp dates to data bounds for consistent cache keys
                const effectiveStartKey = (start === null) ? defaultMinIso : clampDateToDataBounds(start, true);
                const effectiveEndKey = (end === null) ? defaultMaxIso : clampDateToDataBounds(end, false);
                const dateRangeKey = `${effectiveStartKey || 'no-start'}_to_${effectiveEndKey || 'no-end'}`;

                const selectedMetricsJson = localStorage.getItem('selectedMetricsForDisplay');
                const selectedMetricsLocal = selectedMetricsJson ? new Set<string>(JSON.parse(selectedMetricsJson)) : null;

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

                // Pairwise metrics require at least 2 files globally
                const pairwiseMetrics = new Set(['mae','rmse','pearson_correlation','dtw','euclidean','cosine_similarity']);

                const shouldFetch = (metricValue: string) => {
                    if (!metricValue) return false;
                    if (pairwiseMetrics.has(metricValue) && totalFilesLoaded < 2) return false;
                    return selectedMetricsLocal === null || selectedMetricsLocal.has(metricValue);
                };

                // For each metric type, if it should fetch and currently has no stored state, check cache presence
                for (const [metricValue, stateKey] of Object.entries(metricToStateKey)) {
                    if (!shouldFetch(metricValue)) continue;

                    // If local state already has data, no need to mark loading
                    const metricStateMap: any = (stateKey === 'meanValues' ? meanValues :
                        stateKey === 'medianValues' ? medianValues :
                        stateKey === 'varianceValues' ? varianceValues :
                        stateKey === 'stdDevsValues' ? stdDevsValues :
                        stateKey === 'autoCorrelationValues' ? autoCorrelationValues :
                        stateKey === 'maeValues' ? maeValues :
                        stateKey === 'rmseValues' ? rmseValues :
                        stateKey === 'PearsonCorrelationValues' ? PearsonCorrelationValues :
                        stateKey === 'DTWValues' ? DTWValues :
                        stateKey === 'EuclideanValues' ? EuclideanValues :
                        stateKey === 'CosineSimilarityValues' ? CosineSimilarityValues : {}
                    );

                    if (metricStateMap && Object.keys(metricStateMap).length > 0) {
                        // already have some data, skip
                        continue;
                    }

                    // Check cache for any category that would be fetched
                    let anyCached = false;
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const files = filenamesPerCategory[category];
                        if (pairwiseMetrics.has(metricValue) && (!files || files.length < 2)) continue;

                        const cacheParams: CacheKey = {
                            metricType: metricValue,
                            category,
                            dateRange: dateRangeKey,
                        };

                        if (metricsCacheManager.has(cacheParams)) {
                            anyCached = true;
                            break;
                        }
                    }

                    if (!anyCached) {
                        // No cache found for this metric+dateRange -> mark as loading so spinner shows immediately
                        setLoading(stateKey, true);
                        setErrorState(stateKey, null);
                    }
                }
            } catch (e) {
                // ignore
            }
        })();

        const fetchMetrics = async () => {
            try {
            // Standardize full-range parameters as null (not undefined)
            const start: string | null = startDate ? startDate.toISOString() : null;
            const end: string | null = endDate ? endDate.toISOString() : null;
                
                // Generate cache key prefix for date range
                // Normalize nulls to bounds to keep keys stable when toggling full range
                // Also clamp dates to data bounds - if user selects date outside data range,
                // treat it as the boundary for cache key purposes (avoids duplicate requests)
                const effectiveStartKey = (start === null)
                    ? defaultMinIso
                    : clampDateToDataBounds(start, true);
                const effectiveEndKey = (end === null)
                    ? defaultMaxIso
                    : clampDateToDataBounds(end, false);
                const dateRangeKey = `${effectiveStartKey || 'no-start'}_to_${effectiveEndKey || 'no-end'}`;
                
                // Use clamped dates for API calls too - this ensures that dates outside 
                // data bounds are treated as the boundary dates, avoiding unnecessary requests
                const apiStart = effectiveStartKey || undefined;
                const apiEnd = effectiveEndKey || undefined;

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

                // Pairwise metrics require at least 2 files globally
                const pairwiseMetrics = new Set(['mae','rmse','pearson_correlation','dtw','euclidean','cosine_similarity']);

                // Helper: check if metric should be fetched
                const shouldFetch = (metricValue: string) => {
                    if (!metricValue) return false;
                    if (pairwiseMetrics.has(metricValue) && totalFilesLoaded < 2) return false;
                    return selectedMetrics === null || selectedMetrics.has(metricValue);
                };

                // Immediately mark as loading all metric state keys that will need fetching
                // This ensures spinners show across all visible metrics (not just where the request is currently in-flight)

                const keysToMarkLoading = new Set<string>();

                for (const [metricValue, stateKey] of Object.entries(metricToStateKey)) {
                    if (!shouldFetch(metricValue)) continue;

                    // Skip if we already have data locally
                    const metricStateMap: any = (stateKey === 'meanValues' ? meanValues :
                        stateKey === 'medianValues' ? medianValues :
                        stateKey === 'varianceValues' ? varianceValues :
                        stateKey === 'stdDevsValues' ? stdDevsValues :
                        stateKey === 'autoCorrelationValues' ? autoCorrelationValues :
                        stateKey === 'maeValues' ? maeValues :
                        stateKey === 'rmseValues' ? rmseValues :
                        stateKey === 'PearsonCorrelationValues' ? PearsonCorrelationValues :
                        stateKey === 'DTWValues' ? DTWValues :
                        stateKey === 'EuclideanValues' ? EuclideanValues :
                        stateKey === 'CosineSimilarityValues' ? CosineSimilarityValues : {}
                    );

                    let needsFetch = false;

                    if (!metricStateMap || Object.keys(metricStateMap).length === 0) {
                        // No local data - definitely needs fetching
                        needsFetch = true;
                    } else {
                        // Check cache presence for categories that would be fetched
                        for (const category of Object.keys(filenamesPerCategory)) {
                            const files = filenamesPerCategory[category];
                            if (pairwiseMetrics.has(metricValue) && (!files || files.length < 2)) continue;

                            const cacheParams: CacheKey = {
                                metricType: metricValue,
                                category,
                                dateRange: dateRangeKey,
                            };

                            if (!metricsCacheManager.has(cacheParams)) {
                                needsFetch = true;
                                break;
                            }
                        }
                    }

                    if (needsFetch) {
                        keysToMarkLoading.add(stateKey);
                    }
                }

                // Mark loading for all keys that will be fetched
                keysToMarkLoading.forEach(k => {
                    setLoading(k, true);
                    setErrorState(k, null);
                });

                // Fetch single metrics in parallel (only if selected)
                const singleMetricsToFetch = singleMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                if (singleMetricsToFetch.length > 0) {
                    await Promise.all(
                        singleMetricsToFetch.map(async ({ key, fetch, setter }) => {
                            const metricTypeMap: Record<string, string> = {
                                meanValues: 'mean',
                                medianValues: 'median',
                                varianceValues: 'variance',
                                // Use API-consistent key with underscore so cache lookup matches stored entries
                                stdDevsValues: 'std_dev',
                                autoCorrelationValues: 'autocorrelation',
                            };
                            const metricType = metricTypeMap[key] || key;
                            setLoading(key, true);
                            setErrorState(key, null);
                            
                            // Check error simulator FIRST (for demo/presentation purposes)
                            // This must be before cache check to always simulate errors when enabled
                            try {
                                errorSimulator.checkAndThrow(metricType);
                            } catch (err) {
                                setErrorState(key, err instanceof Error ? err.message : 'Simulated error');
                                setLoading(key, false);
                                return;
                            }
                            
                            // Check for cached errors first - if any category has cached error, show error without fetching
                            for (const category of Object.keys(filenamesPerCategory)) {
                                const cacheParams: CacheKey = {
                                    metricType,
                                    category,
                                    dateRange: dateRangeKey,
                                };
                                const cachedError = metricsCacheManager.getError(cacheParams);
                                if (cachedError) {
                                    setErrorState(key, cachedError);
                                    setLoading(key, false);
                                    return;
                                }
                            }
                            
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
                            try {
                                if (categoriesToFetch.length === 0) {
                                    if (Object.keys(cachedData).length > 0) {
                                        setter(cachedData);
                                    }
                                    setLoading(key, false);
                                    return;
                                }
                                
                                const startTime = performance.now();
                                apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                    params: { categories: categoriesToFetch.length, start: apiStart, end: apiEnd },
                                });
                                const data = await fetch(filenamesPerCategory, apiStart, apiEnd);
                                const duration = Math.round(performance.now() - startTime);
                                apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                    params: { categories: categoriesToFetch.length, start: apiStart, end: apiEnd },
                                    duration,
                                    status: 200,
                                });
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
                                const mergedData = { ...cachedData, ...data };
                                setter(mergedData);
                                setLoading(key, false);
                            } catch (err) {
                                // Cache the error so page reload shows error instead of retrying
                                for (const category of Object.keys(filenamesPerCategory)) {
                                    const cacheParams: CacheKey = {
                                        metricType,
                                        category,
                                        dateRange: dateRangeKey,
                                    };
                                    metricsCacheManager.setError(cacheParams, err instanceof Error ? err.message : 'Failed to fetch metric.');
                                }
                                setErrorState(key, err instanceof Error ? err.message : 'Failed to fetch metric.');
                                setLoading(key, false);
                            }
                        })
                    );
                }

                // Fetch all-correlation metrics in parallel (only if selected and >=2 files)
                const allCorrelationMetricsToFetch = allCorrelationMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                if (allCorrelationMetricsToFetch.length > 0) {
                    await Promise.all(
                        allCorrelationMetricsToFetch.map(async ({ key, fetch, setter }) => {
                            const metricTypeMap: Record<string, string> = {
                                maeValues: 'mae',
                                rmseValues: 'rmse',
                            };
                            const metricType = metricTypeMap[key] || key;
                            setLoading(key, true);
                            setErrorState(key, null);
                            
                            // Check error simulator FIRST (for demo/presentation purposes)
                            // This must be before cache check to always simulate errors when enabled
                            try {
                                errorSimulator.checkAndThrow(metricType);
                            } catch (err) {
                                setErrorState(key, err instanceof Error ? err.message : 'Simulated error');
                                setLoading(key, false);
                                return;
                            }
                            
                            // Check for cached errors first - if any category has cached error, show error without fetching
                            for (const category of Object.keys(filenamesPerCategory)) {
                                const files = filenamesPerCategory[category] || [];
                                if (files.length < 2) continue;
                                
                                const cacheParams: CacheKey = {
                                    metricType,
                                    category,
                                    dateRange: dateRangeKey,
                                };
                                const cachedError = metricsCacheManager.getError(cacheParams);
                                if (cachedError) {
                                    setErrorState(key, cachedError);
                                    setLoading(key, false);
                                    return;
                                }
                            }
                            
                            let cachedData: CorrelationMetricType = {};
                            let categoriesToFetch: string[] = [];
                            for (const category of Object.keys(filenamesPerCategory)) {
                                // Skip categories with less than 2 files
                                const files = filenamesPerCategory[category] || [];
                                if (files.length < 2) continue;

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
                            try {
                                // Check if all data is cached - use cache as primary source
                                if (categoriesToFetch.length === 0) {
                                    if (Object.keys(cachedData).length > 0) {
                                        setter(cachedData);
                                    }
                                    setLoading(key, false);
                                    return;
                                }
                                
                                const startTime = performance.now();
                                apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                    params: { categories: categoriesToFetch.length, start: apiStart, end: apiEnd },
                                });
                                const data = await fetch(filenamesPerCategory, apiStart, apiEnd);
                                const duration = Math.round(performance.now() - startTime);
                                apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                                    params: { categories: categoriesToFetch.length, start: apiStart, end: apiEnd },
                                    duration,
                                    status: 200,
                                });
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
                                const mergedData = { ...cachedData, ...data };
                                setter(mergedData);
                                setLoading(key, false);
                            } catch (err) {
                                // Cache the error so page reload shows error instead of retrying
                                for (const category of Object.keys(filenamesPerCategory)) {
                                    const files = filenamesPerCategory[category] || [];
                                    if (files.length < 2) continue;
                                    const cacheParams: CacheKey = {
                                        metricType,
                                        category,
                                        dateRange: dateRangeKey,
                                    };
                                    metricsCacheManager.setError(cacheParams, err instanceof Error ? err.message : 'Failed to fetch metric.');
                                }
                                setErrorState(key, err instanceof Error ? err.message : 'Failed to fetch metric.');
                                setLoading(key, false);
                            }
                        })
                    );
                }

                // Fetch per-category correlation metrics (only if selected and >=2 files)
                const perCategoryMetricsToFetch = perCategoryCorrelationMetrics.filter(({ key }) => {
                    const metricValue = Object.keys(metricToStateKey).find(k => metricToStateKey[k] === key);
                    return metricValue && shouldFetch(metricValue);
                });

                // Process all per-category metrics IN PARALLEL (not sequentially)
                // This ensures that a slow/failing metric (like DTW) doesn't block others (Euclidean, Cosine)
                await Promise.all(perCategoryMetricsToFetch.map(async ({ key, setter, fetch }) => {
                    const metricTypeMap: Record<string, string> = {
                        PearsonCorrelationValues: 'pearson_correlation',
                        DTWValues: 'dtw',
                        EuclideanValues: 'euclidean',
                        CosineSimilarityValues: 'cosine_similarity',
                    };
                    const metricType = metricTypeMap[key] || key;

                    // Early skip if global file count < 2
                    if (totalFilesLoaded < 2) {
                        setter({});
                        setLoading(key, false);
                        return;
                    }

                    setLoading(key, true);
                    setErrorState(key, null);
                    
                    // Check error simulator FIRST (for demo/presentation purposes)
                    // This must be before cache check to always simulate errors when enabled
                    try {
                        errorSimulator.checkAndThrow(metricType);
                    } catch (err) {
                        setErrorState(key, err instanceof Error ? err.message : 'Simulated error');
                        setLoading(key, false);
                        return;
                    }
                    
                    // Check for cached errors first - if any category has cached error, show error without fetching
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const files = filenamesPerCategory[category];
                        if (!files || files.length < 2) continue;
                        
                        const cacheParams: CacheKey = {
                            metricType,
                            category,
                            dateRange: dateRangeKey,
                        };
                        const cachedError = metricsCacheManager.getError(cacheParams);
                        if (cachedError) {
                            setErrorState(key, cachedError);
                            setLoading(key, false);
                            return;
                        }
                    }
                    
                    // First check metricsCacheManager for all categories
                    const cachedData: CorrelationMetricType = {};
                    const categoriesToFetch: string[] = [];
                    
                    for (const category of Object.keys(filenamesPerCategory)) {
                        const files = filenamesPerCategory[category];

                        // Skip categories with less than 2 files
                        if (!files || files.length < 2) continue;

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
                    
                    // If all categories are cached, use cached data immediately
                    if (categoriesToFetch.length === 0) {
                        if (Object.keys(cachedData).length > 0) {
                            setter(cachedData);
                        }
                        setLoading(key, false);
                        return;
                    }
                    
                    // Fetch missing categories
                    const fetchedData: CorrelationMetricType = {};
                    for (const category of categoriesToFetch) {
                        const files = filenamesPerCategory[category];
                        const cacheParams: CacheKey = {
                            metricType,
                            category,
                            dateRange: dateRangeKey,
                        };
                        
                        const startTime = performance.now();
                        apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                            params: { files: files.length, start: apiStart, end: apiEnd },
                        });
                        let result;
                        try {
                            if (key === 'EuclideanValues') {
                                result = await fetch(files, null, category, apiStart, apiEnd);
                            } else {
                                result = await fetch(files, category, apiStart, apiEnd);
                            }
                            const duration = Math.round(performance.now() - startTime);
                            apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                params: { files: files.length, start: apiStart, end: apiEnd },
                                duration,
                                status: 200,
                            });
                            metricsCacheManager.set(cacheParams, result);
                            fetchedData[category] = result;
                        } catch (fetchError) {
                            const duration = Math.round(performance.now() - startTime);
                            apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                                params: { files: files.length, start: apiStart, end: apiEnd },
                                duration,
                                status: 500,
                            });
                            // Cache the error so page reload shows error instead of retrying
                            metricsCacheManager.setError(cacheParams, fetchError instanceof Error ? fetchError.message : 'Failed to fetch metric.');
                            setErrorState(key, fetchError instanceof Error ? fetchError.message : 'Failed to fetch metric.');
                        }
                    }
                    
                    // Merge cached and fetched data
                    const mergedData = { ...cachedData, ...fetchedData };
                    setter(mergedData);
                    setLoading(key, false);
                }));
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
        const updatedGroupedMetrics: Record<string, CombinedStatistic[]> = {};

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

    // Clear state for metrics explicitly deselected by the user so they are neither requested nor shown
    useEffect(() => {
        // If null -> default selection applies, do not clear
        if (selectedMetricsForDisplay === null) return;

        const deselected = (metricValue: string, clearFn: () => void, stateKey?: string) => {
            if (!selectedMetricsForDisplay.has(metricValue)) {
                try {
                    clearFn();
                } catch (e) {
                    console.warn(`Failed to clear metric ${metricValue}:`, e);
                }
                if (stateKey) {
                    setMetricLoading(prev => ({ ...prev, [stateKey]: false }));
                    setMetricError(prev => ({ ...prev, [stateKey]: null }));
                }
                // Remove persisted cached copy so the metric won't reappear from localStorage immediately
                try { localStorage.removeItem(stateKey || metricValue); } catch (e) { /* ignore */ }
            }
        };

        deselected('mean', () => setMeanValues({}), 'meanValues');
        deselected('median', () => setMedianValues({}), 'medianValues');
        deselected('variance', () => setVarianceValues({}), 'varianceValues');
        deselected('std_dev', () => setStdDevsValues({}), 'stdDevsValues');
        deselected('autocorrelation', () => setAutoCorrelationValues({}), 'autoCorrelationValues');
        deselected('mae', () => setMaeValues({}), 'maeValues');
        deselected('rmse', () => setRmseValues({}), 'rmseValues');
        deselected('pearson_correlation', () => setPearsonCorrelationValues({}), 'PearsonCorrelationValues');
        deselected('dtw', () => setDTWValues({}), 'DTWValues');
        deselected('euclidean', () => setEuclideanValues({}), 'EuclideanValues');
        deselected('cosine_similarity', () => setCosineSimilarityValues({}), 'CosineSimilarityValues');

    }, [selectedMetricsForDisplay]);

    useEffect(() => {
        const allMetrics = [...singleMetrics, ...allCorrelationMetrics, ...perCategoryCorrelationMetrics];
        const metricMap: Record<string, any> = {
            meanValues, medianValues, varianceValues, stdDevsValues,
            autoCorrelationValues, maeValues, rmseValues,
            PearsonCorrelationValues, DTWValues, EuclideanValues,
            CosineSimilarityValues
        };

        // Compute dateRangeKey for the current start/end so we can persist it with each metric
        const saveStart: string | null = startDate ? startDate.toISOString() : null;
        const saveEnd: string | null = endDate ? endDate.toISOString() : null;
        const saveEffectiveStart = (saveStart === null) ? defaultMinIso : saveStart;
        const saveEffectiveEnd = (saveEnd === null) ? defaultMaxIso : saveEnd;
        const saveDateRangeKey = `${saveEffectiveStart || 'no-start'}_to_${saveEffectiveEnd || 'no-end'}`;

        allMetrics.forEach(({ key }) => {
            const value = metricMap[key];
            if (value && Object.keys(value).length > 0) {
                const payload = {
                    dateRange: saveDateRangeKey,
                    timestamp: Date.now(),
                    data: value
                };
                try {
                    const existing = localStorage.getItem(key);
                    const newStr = JSON.stringify(payload);
                    if (existing !== newStr) {
                        localStorage.setItem(key, newStr);
                    }
                } catch (e) {
                    // ignore storage errors
                }
            }
        });
    }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, singleMetrics, allCorrelationMetrics, perCategoryCorrelationMetrics, startDate, endDate, defaultMinIso, defaultMaxIso]);

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

    // Retry function for individual metrics - allows user to manually retry failed requests
    const retryMetric = useCallback(async (metricKey: string) => {
        const start: string | null = startDate ? startDate.toISOString() : null;
        const end: string | null = endDate ? endDate.toISOString() : null;
        // Clamp dates to data bounds for consistent cache keys
        const effectiveStartKey = (start === null) ? defaultMinIso : clampDateToDataBounds(start, true);
        const effectiveEndKey = (end === null) ? defaultMaxIso : clampDateToDataBounds(end, false);
        const dateRangeKey = `${effectiveStartKey || 'no-start'}_to_${effectiveEndKey || 'no-end'}`;
        
        // Use clamped dates for API calls
        const apiStart = effectiveStartKey || undefined;
        const apiEnd = effectiveEndKey || undefined;

        // Map state keys to metric types and fetch functions
        const metricConfig: Record<string, { metricType: string; fetchFn: (...args: any[]) => Promise<any>; setter: any; isPerCategory?: boolean }> = {
            meanValues: { metricType: 'mean', fetchFn: services.fetchAllMeans, setter: setMeanValues },
            medianValues: { metricType: 'median', fetchFn: services.fetchAllMedians, setter: setMedianValues },
            varianceValues: { metricType: 'variance', fetchFn: services.fetchAllVariances, setter: setVarianceValues },
            stdDevsValues: { metricType: 'std_dev', fetchFn: services.fetchAllStdDevs, setter: setStdDevsValues },
            autoCorrelationValues: { metricType: 'autocorrelation', fetchFn: services.fetchAllAutoCorrelations, setter: setAutoCorrelationValues },
            maeValues: { metricType: 'mae', fetchFn: services.fetchAllMae, setter: setMaeValues },
            rmseValues: { metricType: 'rmse', fetchFn: services.fetchAllRmse, setter: setRmseValues },
            PearsonCorrelationValues: { metricType: 'pearson_correlation', fetchFn: services.fetchAllPearsonCorrelations, setter: setPearsonCorrelationValues, isPerCategory: true },
            DTWValues: { metricType: 'dtw', fetchFn: services.fetchAllDTWs, setter: setDTWValues, isPerCategory: true },
            EuclideanValues: { metricType: 'euclidean', fetchFn: services.fetchAllEuclideans, setter: setEuclideanValues, isPerCategory: true },
            CosineSimilarityValues: { metricType: 'cosine_similarity', fetchFn: services.fetchAllCosineSimilarities, setter: setCosineSimilarityValues, isPerCategory: true },
        };

        const config = metricConfig[metricKey];
        if (!config) {
            console.warn(`Unknown metric key for retry: ${metricKey}`);
            return;
        }

        const { metricType, fetchFn, setter, isPerCategory } = config;

        // Clear cached errors for this metric before retrying
        for (const category of Object.keys(filenamesPerCategory)) {
            const files = filenamesPerCategory[category];
            // For pairwise metrics, only clear if category has >= 2 files
            if (isPerCategory && (!files || files.length < 2)) continue;
            
            const cacheParams: CacheKey = {
                metricType,
                category,
                dateRange: dateRangeKey,
            };
            metricsCacheManager.clearError(cacheParams);
        }

        // Set loading state
        setMetricLoading(prev => ({ ...prev, [metricKey]: true }));
        setMetricError(prev => ({ ...prev, [metricKey]: null }));

        try {
            if (isPerCategory) {
                // Per-category metrics (Pearson, DTW, Euclidean, Cosine)
                const fetchedData: CorrelationMetricType = {};
                
                for (const category of Object.keys(filenamesPerCategory)) {
                    const files = filenamesPerCategory[category];
                    if (!files || files.length < 2) continue;

                    const cacheParams: CacheKey = {
                        metricType,
                        category,
                        dateRange: dateRangeKey,
                    };

                    const startTime = performance.now();
                    try {
                        let result;
                        if (metricKey === 'EuclideanValues') {
                            result = await fetchFn(files, null, category, apiStart, apiEnd);
                        } else {
                            result = await fetchFn(files, category, apiStart, apiEnd);
                        }
                        const duration = Math.round(performance.now() - startTime);
                        apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                            params: { files: files.length, start: apiStart, end: apiEnd },
                            duration,
                            status: 200,
                        });
                        metricsCacheManager.set(cacheParams, result);
                        fetchedData[category] = result;
                    } catch (fetchError) {
                        const duration = Math.round(performance.now() - startTime);
                        apiLogger.logQuery(`/api/metrics/${metricType}/${category}`, 'GET', {
                            params: { files: files.length, start: apiStart, end: apiEnd },
                            duration,
                            status: 500,
                        });
                        throw fetchError;
                    }
                }
                
                setter(fetchedData);
            } else {
                // All-category metrics (mean, median, variance, etc., MAE, RMSE)
                const startTime = performance.now();
                const data = await fetchFn(filenamesPerCategory, apiStart, apiEnd);
                const duration = Math.round(performance.now() - startTime);
                apiLogger.logQuery(`/api/metrics/${metricType}`, 'GET', {
                    params: { start: apiStart, end: apiEnd },
                    duration,
                    status: 200,
                });

                // Cache all categories
                for (const category of Object.keys(data)) {
                    const cacheParams: CacheKey = {
                        metricType,
                        category,
                        dateRange: dateRangeKey,
                    };
                    metricsCacheManager.set(cacheParams, data[category]);
                }

                setter(data);
            }

            setMetricLoading(prev => ({ ...prev, [metricKey]: false }));
        } catch (err) {
            setMetricError(prev => ({ ...prev, [metricKey]: err instanceof Error ? err.message : 'Failed to fetch metric.' }));
            setMetricLoading(prev => ({ ...prev, [metricKey]: false }));
        }
    }, [filenamesPerCategory, startDate, endDate, defaultMinIso, defaultMaxIso]);

    return {
        maeValues,
        rmseValues,
        PearsonCorrelationValues,
        DTWValues,
        EuclideanValues,
        CosineSimilarityValues,
        groupedMetrics,
        resetMetrics,
        metricLoading,
        metricError,
        retryMetric,
    };
};