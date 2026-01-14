import { useState, useEffect } from 'react';
import * as services from '../services';

export type ColorSyncMode = 'default' | 'group' | 'file';

// localStorage key for color sync mode persistence
const STORAGE_KEY_COLOR_SYNC_MODE = 'dashboard_colorSyncMode';

export const useChartConfiguration = (
    filenamesPerCategory: Record<string, string[]>,
    chartData: Record<string, services.TimeSeriesEntry[]>,
    rollingMeanChartData: Record<string, services.TimeSeriesEntry[]>,
    showMovingAverage: boolean,
    maWindow: string,
    startDate?: Date | null,
    endDate?: Date | null,
    manualData: Record<string, services.TimeSeriesEntry[]> = {}
) => {
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const savedCategory = localStorage.getItem('selectedCategory');
        return savedCategory ? savedCategory : null;
    });

    const [secondaryCategory, setSecondaryCategory] = useState(() => {
        const savedCategory = localStorage.getItem('secondaryCategory');
        return savedCategory ? savedCategory : null;
    });

    const [tertiaryCategory, setTertiaryCategory] = useState(() => {
        const savedCategory = localStorage.getItem('tertiaryCategory');
        return savedCategory ? savedCategory : null;
    });

    const [rangePerCategory, setRangePerCategory] = useState<{ [key: string]: { min: number | '', max: number | '' } }>({});
    
    // Initialize colorSyncMode from localStorage
    const [colorSyncMode, setColorSyncMode] = useState<ColorSyncMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_COLOR_SYNC_MODE);
        if (stored === 'group' || stored === 'file') return stored;
        return 'default';
    });

    // Persist colorSyncMode to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_COLOR_SYNC_MODE, colorSyncMode);
    }, [colorSyncMode]);

    const syncColorsByFile = colorSyncMode === 'file';
    const syncColorsByGroup = colorSyncMode === 'group';

    const [filteredData, setFilteredData] = useState<{
        primary: Record<string, services.TimeSeriesEntry[]>;
        secondary: Record<string, services.TimeSeriesEntry[]> | null;
        tertiary: Record<string, services.TimeSeriesEntry[]> | null;
    }>({ primary: {}, secondary: null, tertiary: null });
    const [filteredManualData, setFilteredManualData] = useState<Record<string, services.TimeSeriesEntry[]>>({});

    const handleDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategory(event.target.value);
    };

    const handleSecondaryDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSecondaryCategory(event.target.value || null);
    };

    const handleTertiaryDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setTertiaryCategory(event.target.value || null);
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
        if (tertiaryCategory) {
            localStorage.setItem('tertiaryCategory', tertiaryCategory);
        } else {
            localStorage.removeItem('tertiaryCategory');
        }
    }, [tertiaryCategory]);

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
        const tertiary = processCategory(tertiaryCategory);

        // Filter manualData only by time range (start/end)
        const newFilteredManualData: Record<string, services.TimeSeriesEntry[]> = {};
        for (const [key, series] of Object.entries(manualData)) {
            newFilteredManualData[key] = series.filter(item => {
                const time = new Date(item.x).getTime();
                const afterStart = !startDate || time >= startDate.getTime();
                const beforeEnd = !endDate || time <= endDate.getTime();
                return afterStart && beforeEnd;
            });
        }

        setFilteredData({
            primary,
            secondary: Object.keys(secondary).length > 0 ? secondary : null,
            tertiary: Object.keys(tertiary).length > 0 ? tertiary : null
        });
        setFilteredManualData(newFilteredManualData);
    }, [chartData, selectedCategory, secondaryCategory, tertiaryCategory, rangePerCategory, showMovingAverage, rollingMeanChartData, maWindow, startDate, endDate, manualData]);

    const resetChartConfig = () => {
        setSelectedCategory(null);
        setSecondaryCategory(null);
        setTertiaryCategory(null);
        setRangePerCategory({});
        setFilteredData({ primary: {}, secondary: null, tertiary: null });
        setColorSyncMode('default');
    };

    return {
        selectedCategory,
        secondaryCategory,
        tertiaryCategory,
        handleRangeChange,
        syncColorsByFile,
        colorSyncMode,
        setColorSyncMode,
        syncColorsByGroup,
        filteredData,
        filteredManualData,
        handleDropdownChange,
        handleSecondaryDropdownChange,
        handleTertiaryDropdownChange,
        resetChartConfig,
    };
};