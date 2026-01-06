import { useState, useEffect } from 'react';
import * as services from '../services';

export const useChartConfiguration = (
    filenamesPerCategory: Record<string, string[]>,
    chartData: Record<string, services.TimeSeriesEntry[]>,
    rollingMeanChartData: Record<string, services.TimeSeriesEntry[]>,
    showMovingAverage: boolean,
    maWindow: string,
    startDate?: Date | null,    
    endDate?: Date | null 
) => {
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const savedCategory = localStorage.getItem('selectedCategory');
        return savedCategory ? savedCategory : null;
    });

    const [secondaryCategory, setSecondaryCategory] = useState(() => {
        const savedCategory = localStorage.getItem('secondaryCategory');
        return savedCategory ? savedCategory : null;
    });

    const [rangePerCategory, setRangePerCategory] = useState<{ [key: string]: { min: number | '', max: number | '' } }>({});
    const [syncColorsByFile, setSyncColorsByFile] = useState(true);

    const [filteredData, setFilteredData] = useState<{
        primary: Record<string, services.TimeSeriesEntry[]>;
        secondary: Record<string, services.TimeSeriesEntry[]> | null;
    }>({ primary: {}, secondary: null });

    const handleDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategory(event.target.value);
    };

    const handleSecondaryDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSecondaryCategory(event.target.value || null);
    };

    const handleRangeChange = (category: string, min: number | '', max: number | '') => {
        setRangePerCategory(prev => ({
            ...prev,
            [category]: { min, max }
        }));
    };

    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length > 0 && selectedCategory === null) {
            setSelectedCategory(Object.keys(filenamesPerCategory)[0]);
        }
    }, [filenamesPerCategory, selectedCategory]);

    useEffect(() => {
        if (selectedCategory) {
            localStorage.setItem('selectedCategory', selectedCategory);
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (secondaryCategory) {
            localStorage.setItem('secondaryCategory', secondaryCategory);
        } else {
            localStorage.removeItem('secondaryCategory');
        }
    }, [secondaryCategory]);

    useEffect(() => {
        if (!chartData || Object.keys(chartData).length === 0) return;

        const processCategory = (category: string | null): Record<string, services.TimeSeriesEntry[]> => {
            if (!category) return {};

            let result: Record<string, services.TimeSeriesEntry[]> = {};

            for (const [key, series] of Object.entries(chartData)) {
                if (key.startsWith(`${category}.`)) {
                    result[key] = series.filter(item => {
                        const time = new Date(item.x).getTime();
                        const afterStart = !startDate || time >= startDate.getTime();
                        const beforeEnd = !endDate || time <= endDate.getTime();
                        return afterStart && beforeEnd;
                    });
                }
            }

            const fileIds = Array.from(new Set(Object.keys(result).map(k => k.split(".")[1])));

            fileIds.forEach(fileId => {
                const seriesKeys = Object.keys(result).filter(k => k.endsWith(`.${fileId}`));
                let allowedTimestamps: Set<string> | null = null;

                Object.entries(rangePerCategory).forEach(([group, range]) => {
                    if (!range || (range.min === '' && range.max === '')) return;

                    const seriesKey = `${group}.${fileId}`;
                    let seriesData = result[seriesKey] || chartData[seriesKey];
                    if (!seriesData) return;

                    const timestamps = new Set(
                        seriesData
                            .filter(item =>
                                (range.min === '' || item.y >= Number(range.min)) &&
                                (range.max === '' || item.y <= Number(range.max))
                            )
                            .map(item => item.x)
                    );

                    if (allowedTimestamps === null) {
                        allowedTimestamps = timestamps;
                    } else {
                        allowedTimestamps = new Set(
                            Array.from(allowedTimestamps).filter(ts => timestamps.has(ts))
                        );
                    }
                });

                if (allowedTimestamps) {
                    seriesKeys.forEach(key => {
                        result[key] = result[key].filter(item => allowedTimestamps!.has(item.x));
                    });
                }
            });

            if (showMovingAverage) {
                for (const [key, series] of Object.entries(rollingMeanChartData)) {
                    if (key.startsWith(`${category}.`)) {
                        const parts = key.split(".");
                        const baseKey = parts.slice(0, -1).join(".");
                        const legendKey = `${baseKey} (MA ${maWindow})`;
                        
                        result[legendKey] = series.filter(item => {
                            const time = new Date(item.x).getTime();
                            const afterStart = !startDate || time >= startDate.getTime();
                            const beforeEnd = !endDate || time <= endDate.getTime();
                            return afterStart && beforeEnd;
                        });
                    }
                }
            }

            return result;
        };

        const primary = processCategory(selectedCategory);
        const secondary = processCategory(secondaryCategory);

        setFilteredData({
            primary,
            secondary: Object.keys(secondary).length > 0 ? secondary : null
        });
    }, [chartData, selectedCategory, secondaryCategory, rangePerCategory, showMovingAverage, rollingMeanChartData, maWindow, startDate, endDate]);

    const resetChartConfig = () => {
        setSelectedCategory(null);
        setSecondaryCategory(null);
        setRangePerCategory({});
        setFilteredData({ primary: {}, secondary: null });
    };

    return {
        selectedCategory,
        secondaryCategory,
        handleRangeChange,
        syncColorsByFile,
        setSyncColorsByFile,
        filteredData,
        handleDropdownChange,
        handleSecondaryDropdownChange,
        resetChartConfig,
    };
};