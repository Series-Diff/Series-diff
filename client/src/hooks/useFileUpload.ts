import { useState } from 'react';
import * as services from '../services';
import { clearTimeSeriesCache } from '../services/fetchTimeSeries';
import { useGlobalCache } from '../contexts/CacheContext';

export const useFileUpload = (
    handleFetchData: (showLoading?: boolean) => Promise<void>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const globalCache = useGlobalCache();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(files);
            setIsPopupOpen(true);
        }
        event.target.value = '';
    };

    const handlePopupComplete = async (groupedData: Record<string, any>) => {
        setIsPopupOpen(false); // Close popup first

        if (Object.keys(groupedData).length > 0) {
            setIsLoading(true);
            setError(null);
            // Clear all caches before re-fetching fresh data
            clearTimeSeriesCache();
            globalCache.clearAllCaches();
            localStorage.removeItem('chartData');
            localStorage.removeItem('filenamesPerCategory');
            await services.sendProcessedTimeSeriesData(groupedData, async (success) => {
                if (!success) {
                    setError("Data processing or server upload failed.");
                } else {
                    await handleFetchData();
                }
                setIsLoading(false);
            });
        } else {
            console.log("No data processed from files.");
        }
    };

    const handlePopupClose = () => {
        setIsPopupOpen(false);
        setSelectedFiles([]);
    };

    const resetFileUpload = () => {
        setIsPopupOpen(false);
        setSelectedFiles([]);
    };

    return {
        isPopupOpen,
        selectedFiles,
        handleFileUpload,
        handlePopupComplete,
        handlePopupClose,
        resetFileUpload,
    };
};