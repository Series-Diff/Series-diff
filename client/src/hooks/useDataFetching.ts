import { useState, useEffect, useCallback } from 'react';
import * as services from '../services';

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

export const useDataFetching = () => {
    const [chartData, setChartData] = useState<Record<string, services.TimeSeriesEntry[]>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filenamesPerCategory, setFilenamesPerCategory] = useState<Record<string, string[]>>({});

    const handleFetchData = useCallback(async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) setIsLoading(true);
        setError(null);
        try {
            const allSeries = await services.fetchTimeSeriesData();
            setChartData(allSeries);

            const names = services.extractFilenamesPerCategory(allSeries);
            setFilenamesPerCategory(names);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data.');
            setChartData({});
        } finally {
            if (showLoadingIndicator) setIsLoading(false);
        }
    }, []);

    const getAuthHeaders = (): HeadersInit => {
        const token = localStorage.getItem('session_token');
        return token ? { 'X-Session-ID': token } : {};
    };

    const handleSessionToken = (response: Response) => {
    const newToken = response.headers.get('X-Session-ID');
    if (newToken) {
        localStorage.setItem('session_token', newToken);
    }
    };

    const handleReset = async () => {
        setIsLoading(true);
        setError(null);
        setChartData({});
        setFilenamesPerCategory({});
        localStorage.removeItem('chartData');
        localStorage.removeItem('filenamesPerCategory');
        localStorage.removeItem('selectedCategory');
        localStorage.removeItem('secondaryCategory');

        try {
            
            const resp = await fetch(`${API_URL}/api/clear-timeseries`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
            handleSessionToken(resp);
            
            if (!resp.ok) {
                // Handle rate limiting
                if (resp.status === 429) {
                    setError('Rate limit exceeded. Please wait before trying again. Chart data has been reset locally.');
                    console.error('Rate limit exceeded (429)');
                } else {
                    const errorText = await resp.text();
                    console.error("Failed to clear timeseries on backend:", errorText);
                    setError(`Failed to clear data on server: ${resp.status} ${resp.statusText}. Chart data has been reset.`);
                }
            } else {
                console.log("Timeseries data cleared on backend.");
            }
        } catch (err: any) {
            console.error("Error clearing timeseries on backend:", err);
            // More specific error message for network issues
            if (err.message === 'Failed to fetch') {
                setError('Unable to connect to server. Chart data has been reset locally.');
            } else {
                setError(`Error while clearing data on server: ${err.message}. Chart data has been reset.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedData = localStorage.getItem('chartData');
        const storedFilenames = localStorage.getItem('filenamesPerCategory');

        if (storedData && storedFilenames) {
            try {
                const parsedData = JSON.parse(storedData);
                const parsedFilenames = JSON.parse(storedFilenames);
                setChartData(parsedData);
                setFilenamesPerCategory(parsedFilenames);
            } catch (e) {
                localStorage.removeItem('chartData');
                localStorage.removeItem('filenamesPerCategory');
                handleFetchData();
            }
        } else {
            handleFetchData();
        }
    }, [handleFetchData]);

    useEffect(() => {
        if (Object.keys(chartData).length > 0) {
            try {
                localStorage.setItem('chartData', JSON.stringify(chartData));
            } catch (err: any) {
                if (err.name === 'QuotaExceededError') {
                    setError('Storage quota exceeded: The dataset is too large to save. You can still view and analyze the data, but it may not persist after refresh.');
                    console.error('localStorage quota exceeded', err);
                } else {
                    setError('Failed to save data to local storage.');
                    console.error('localStorage error', err);
                }
            }
        }
        if (Object.keys(filenamesPerCategory).length > 0) {
            try {
                localStorage.setItem('filenamesPerCategory', JSON.stringify(filenamesPerCategory));
            } catch (err: any) {
                if (err.name === 'QuotaExceededError') {
                    console.warn('localStorage quota exceeded for filenamesPerCategory', err);
                } else {
                    console.error('localStorage error for filenamesPerCategory', err);
                }
            }
        }
    }, [chartData, filenamesPerCategory]);

    return {
        chartData,
        error,
        setError,
        isLoading,
        setIsLoading,
        filenamesPerCategory,
        handleFetchData,
        handleReset,
    };
};