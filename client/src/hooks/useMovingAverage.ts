import { useState, useCallback } from 'react';
import * as services from '../services';

export const useMovingAverage = (
    filenamesPerCategory: Record<string, string[]>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    const [showMovingAverage, setShowMovingAverage] = useState(false);
    const [maWindow, setMaWindow] = useState('1d'); // Default value
    const [isMaLoading, setIsMaLoading] = useState(false);
    const [rollingMeanChartData, setRollingMeanChartData] = useState<Record<string, services.TimeSeriesEntry[]>>({});

    const fetchMaData = useCallback(async (window: string) => {
        if (Object.keys(filenamesPerCategory).length === 0) {
            console.log("Cannot fetch MA, categories not loaded.");
            return;
        }
        setIsMaLoading(true);
        setError(null);
        try {
            const rollingMeans = await services.fetchAllRollingMeans(filenamesPerCategory, window);
            setRollingMeanChartData(rollingMeans);
        } catch (err: any) {
            setError(`Failed to fetch moving average data: ${err.message}`);
            setRollingMeanChartData({});
        } finally {
            setIsMaLoading(false);
        }
    }, [filenamesPerCategory, setError]);

    const handleToggleMovingAverage = () => {
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