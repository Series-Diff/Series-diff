import { useState, useCallback, useEffect } from 'react';
import * as services from '../services';
import { apiLogger } from '../utils/apiLogger';
import { metricsCacheManager } from '../utils/metricsCacheManager';
import type { CacheKey } from '../utils/metricsCacheManager';
import { errorSimulator } from '../utils/errorSimulator';

// localStorage keys for persistence
const STORAGE_KEY_MA_ENABLED = 'dashboard_maEnabled';
const STORAGE_KEY_MA_WINDOW = 'dashboard_maWindow';

export const useMovingAverage = (
    filenamesPerCategory: Record<string, string[]>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    // Initialize from localStorage
    const [showMovingAverage, setShowMovingAverage] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY_MA_ENABLED);
        return stored === 'true';
    });
    const [maWindow, setMaWindow] = useState(() => {
        return localStorage.getItem(STORAGE_KEY_MA_WINDOW) || '1d';
    });
    const [isMaLoading, setIsMaLoading] = useState(false);
    const [rollingMeanChartData, setRollingMeanChartData] = useState<Record<string, services.TimeSeriesEntry[]>>({});

    // Persist showMovingAverage to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_MA_ENABLED, String(showMovingAverage));
    }, [showMovingAverage]);

    // Persist maWindow to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_MA_WINDOW, maWindow);
    }, [maWindow]);

    // Sync showMovingAverage with metric selection changes
    useEffect(() => {
        const handleMetricSelectionChange = (event: Event) => {
            const customEvent = event as CustomEvent;

            if (customEvent.detail?.key === 'selectedMetricsForDisplay') {
                const selectedMetricsArray = customEvent.detail.value as string[];
                const selectedMetricsSet = new Set(selectedMetricsArray);

                if (showMovingAverage && !selectedMetricsSet.has('moving_average')) {
                    setShowMovingAverage(false);
                }
            }
        };

        window.addEventListener('localStorageChange', handleMetricSelectionChange);

        return () => {
            window.removeEventListener('localStorageChange', handleMetricSelectionChange);
        };
    }, [showMovingAverage, setError]);

    const fetchMaData = useCallback(async (window: string) => {
        if (Object.keys(filenamesPerCategory).length === 0) {
            console.log('Cannot fetch MA, categories not loaded.');
            return;
        }
        setIsMaLoading(true);
        setError(null);
        try {
            // Check for simulated error first
            errorSimulator.checkAndThrow('moving_average');
            
            // Generate cache key for moving average
            const cacheParams: CacheKey = {
                metricType: 'moving_average',
                category: 'global',
                dateRange: 'all',
                window,
            };
            
            // Check cache first
            let rollingMeans: Record<string, services.TimeSeriesEntry[]>;
            const cached = metricsCacheManager.get<Record<string, services.TimeSeriesEntry[]>>(cacheParams);
            
            if (cached) {
                rollingMeans = cached;
                apiLogger.logQuery(`/api/moving-average`, 'GET', {
                    params: { window },
                    fromCache: true,
                    cacheKey: `moving_average|global|all|${window}`,
                    duration: 0,
                    status: 200,
                });
            } else {
                // Fetch if not cached
                const startTime = performance.now();
                apiLogger.logQuery(`/api/moving-average`, 'GET', {
                    params: { window, categories: Object.keys(filenamesPerCategory).length },
                });
                
                rollingMeans = await services.fetchAllRollingMeans(filenamesPerCategory, window);
                
                const duration = Math.round(performance.now() - startTime);
                apiLogger.logQuery(`/api/moving-average`, 'GET', {
                    params: { window, categories: Object.keys(filenamesPerCategory).length },
                    duration,
                    status: 200,
                });
                
                // Cache the result
                metricsCacheManager.set(cacheParams, rollingMeans);
            }
            
            setRollingMeanChartData(rollingMeans);
        } catch (err: unknown) {
            const rawMessage = err instanceof Error ? err.message : 'Unknown error';
            // Make error messages more user-friendly
            let userMessage: string;
            if (rawMessage.includes('invalid unit abbreviation')) {
                userMessage = `Invalid window format "${window}". Use formats like: 1d (day), 2h (hours), 30m (minutes), 1w (week). You can change the number before the unit.`;
            } else if (rawMessage.includes('SIMULATED ERROR')) {
                userMessage = rawMessage;
            } else {
                userMessage = `Moving Average error: ${rawMessage}`;
            }
            setError(userMessage);
            setRollingMeanChartData({});
        } finally {
            setIsMaLoading(false);
        }
    }, [filenamesPerCategory, setError]);

    // Auto-fetch MA data when toggle is restored from localStorage and filenamesPerCategory becomes available
    useEffect(() => {
        if (
            showMovingAverage &&
            Object.keys(filenamesPerCategory).length > 0 &&
            Object.keys(rollingMeanChartData).length === 0 &&
            !isMaLoading
        ) {
            fetchMaData(maWindow);
        }
    }, [showMovingAverage, filenamesPerCategory, rollingMeanChartData, isMaLoading, maWindow, fetchMaData]);

    const handleToggleMovingAverage = () => {
        // Check if moving_average is selected
        const selectedMetricsJson = localStorage.getItem('selectedMetricsForDisplay');
        const selectedMetrics = selectedMetricsJson
            ? new Set<string>(JSON.parse(selectedMetricsJson))
            // If there is no saved selection yet, default to moving_average being enabled
            : new Set<string>(['moving_average']);
        const isMovingAverageEnabled = selectedMetrics.has('moving_average');

        if (!isMovingAverageEnabled) {
            // Moving average is not enabled in metric selection - surface a user-facing error and log a warning
            setError('Moving Average is not enabled in metric selection');
            console.warn('Moving Average is not enabled in metric selection');
            return;
        }

        const newState = !showMovingAverage;
        setShowMovingAverage(newState);

        if (newState) {
            // Enable: fetch data if not present
            if (Object.keys(rollingMeanChartData).length === 0) {
                fetchMaData(maWindow);
            }
        }
        // Disable: data remains in state, but useEffect won't use it
    };

    const handleApplyMaWindow = () => {
        // Force refetch with new window only if MA is enabled
        if (showMovingAverage) {
            fetchMaData(maWindow);
        }
    };

    const resetMovingAverage = () => {
        setShowMovingAverage(false);
        setMaWindow('1d');
        setRollingMeanChartData({});
    };

    return {
        showMovingAverage,
        maWindow,
        setMaWindow,
        isMaLoading,
        rollingMeanChartData,
        handleToggleMovingAverage,
        handleApplyMaWindow,
        resetMovingAverage,
    };
};