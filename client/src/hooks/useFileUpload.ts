import { useState } from 'react';
import * as services from '../services';

export const useFileUpload = (
    handleFetchData: (showLoading?: boolean) => Promise<void>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [, setDataPreview] = useState<Record<string, any> | null>(null);

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

        // Show preview of the first 3 entries
        const previewDates = Object.keys(groupedData).slice(0, 3);
        const preview: Record<string, any> = {};
        previewDates.forEach(date => {
            preview[date] = groupedData[date];
        });
        setDataPreview(preview);

        if (Object.keys(groupedData).length > 0) {
            setIsLoading(true);
            setError(null);
            await services.sendProcessedTimeSeriesData(groupedData, async (success) => {
                if (!success) {
                    setError("Przetwarzanie danych lub wysyłanie na serwer nie powiodło się.");
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
        setDataPreview(null);
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