import { useState } from 'react';
import * as services from '../services';

export const useFileUpload = (
    handleFetchData: (showLoading?: boolean) => Promise<void>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
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