import { useState, useEffect, useCallback } from 'react';
import { fetchAllDifferences } from '../services/fetchAllDifferences';
import { TimeSeriesEntry } from '../services/fetchTimeSeries';
import { apiLogger } from '../utils/apiLogger';
import { metricsCacheManager } from '../utils/metricsCacheManager';
import type { CacheKey } from '../utils/metricsCacheManager';
import { errorSimulator } from '../utils/errorSimulator';

export interface DifferenceOption {
    value: string;
    label: string;
}

export interface UseDifferenceChartReturn {
    differenceValues: Record<string, Record<string, TimeSeriesEntry[]>>;
    selectedDiffCategory: string | null;
    selectedDifferences: string[];
    reversedDifferences: Record<string, boolean>;
    customToleranceValue: string;
    isDiffLoading: boolean;
    diffError: string | null;
    setDiffError: React.Dispatch<React.SetStateAction<string | null>>;
    differenceChartData: Record<string, TimeSeriesEntry[]>;
    differenceOptions: DifferenceOption[];
    handleDiffCategoryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleDifferenceCheckboxChange: (diffFullName: string) => void;
    handleReverseToggle: (diffFullName: string) => void;
    handleSelectAllToggle: () => void;
    setCustomToleranceValue: (value: string) => void;
    handleApplyTolerance: () => Promise<void>;
    handleResetTolerance: () => void;
    resetDifferenceChart: () => void;
}

export function useDifferenceChart(
    filenamesPerCategory: Record<string, string[]>,
    setError?: (error: string | null) => void,
    start?: string | null,
    end?: string | null,
    timeRangePending?: boolean,
    defaultMinDateForBounds?: Date | null,
    defaultMaxDateForBounds?: Date | null
): UseDifferenceChartReturn {
    const [differenceValues, setDifferenceValues] = useState<Record<string, Record<string, TimeSeriesEntry[]>>>({});
    const [selectedDiffCategory, setSelectedDiffCategory] = useState<string | null>(null);
    const [selectedDifferences, setSelectedDifferences] = useState<string[]>([]);
    const [reversedDifferences, setReversedDifferences] = useState<Record<string, boolean>>({});
    const [selectionsByCategory, setSelectionsByCategory] = useState<Record<string, string[]>>({});
    const [reversedByCategory, setReversedByCategory] = useState<Record<string, Record<string, boolean>>>({});
    const [hasUserInteractedByCategory, setHasUserInteractedByCategory] = useState<Record<string, boolean>>({});
    const [activeTolerance, setActiveTolerance] = useState<number | null>(null);
    const [customToleranceValue, setCustomToleranceValue] = useState("");
    const [isDiffLoading, setIsDiffLoading] = useState(false);
    const [diffError, setDiffError] = useState<string | null>(null);

    // Track selected metrics for reactive clearing when difference_chart is deselected
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

    // Clear data when difference_chart is deselected
    useEffect(() => {
        const shouldShowDifferences =
            selectedMetricsForDisplay === null ||
            (selectedMetricsForDisplay.size > 0 && selectedMetricsForDisplay.has('difference_chart'));

        if (!shouldShowDifferences) {
            // Clear all difference data when metric is deselected
            setDifferenceValues({});
            setSelectedDifferences([]);
            setReversedDifferences({});
        }
    }, [selectedMetricsForDisplay]);

    // Initialize selected category when filenamesPerCategory changes
    useEffect(() => {
        const categories = Object.keys(filenamesPerCategory);
        if (categories.length > 0 && !selectedDiffCategory) {
            setSelectedDiffCategory(categories[0]);
        }
    }, [filenamesPerCategory, selectedDiffCategory]);

    // Fetch differences when category or tolerance changes
    useEffect(() => {
        // Check if difference_chart is selected FIRST (before any async operations)
        // Note: selectedMetricsForDisplay === null means "show all" (modal not yet opened)
        // selectedMetricsForDisplay.size === 0 means "hide all" (user deselected everything)
        const shouldFetchDifferences =
            selectedMetricsForDisplay === null ||
            (selectedMetricsForDisplay.size > 0 && selectedMetricsForDisplay.has('difference_chart'));

        if (!shouldFetchDifferences) {
            // Don't fetch if difference_chart is not selected
            return;
        }

        // If date range required but not ready yet, wait until both start & end are available
        if (timeRangePending) {
            return;
        }

        const fetchDifferencesForCategory = async (category: string, tolerance: number | null) => {
            const filesForCategory = filenamesPerCategory[category];
            if (!category || !filesForCategory?.length) {
                // If we already have selections stored for this category, restore them
                if (category && selectionsByCategory[category]) {
                    setSelectedDifferences(selectionsByCategory[category]);
                    setReversedDifferences(reversedByCategory[category] || {});
                }
                return;
            }

            // Check cache BEFORE assuming we have data for this category
            // Cache key includes tolerance and dateRange
            const toleranceStr = tolerance !== null ? tolerance.toString() : 'no-tolerance';
            // Normalize nulls to bounds for cache key stability across full-range toggle
            const effectiveStartKey = (start === null)
                ? (defaultMinDateForBounds ? defaultMinDateForBounds.toISOString() : null)
                : start;
            const effectiveEndKey = (end === null)
                ? (defaultMaxDateForBounds ? defaultMaxDateForBounds.toISOString() : null)
                : end;
            const dateRangeKey = `${effectiveStartKey || 'no-start'}_to_${effectiveEndKey || 'no-end'}`;
            const cacheParams: CacheKey = {
                metricType: 'difference_chart',
                category,
                dateRange: dateRangeKey,
                tolerance: toleranceStr,
            };
            const cachedData = metricsCacheManager.get<Record<string, TimeSeriesEntry[]>>(cacheParams);
            
            if (cachedData) {
                // Data is cached - restore it and handle selections
                setDifferenceValues(prev => ({ ...prev, [category]: cachedData }));
                
                const optionKeys = Object.keys(cachedData || {}).map(diffKey => `${category}.${diffKey}`);
                const existingSelection = selectionsByCategory[category] || [];
                const filteredExisting = existingSelection.filter(key => optionKeys.includes(key));
                
                // If no valid selections exist and user hasn't interacted, auto-select first series
                const userHasInteracted = hasUserInteractedByCategory[category];
                const finalSelection = !userHasInteracted && filteredExisting.length === 0 && optionKeys.length > 0
                    ? [optionKeys[0]] // Auto-select first series
                    : filteredExisting;
                
                setSelectionsByCategory(prev => ({ ...prev, [category]: finalSelection }));
                if (category === selectedDiffCategory) {
                    setSelectedDifferences(finalSelection);
                }
                
                const existingReversed = reversedByCategory[category] || {};
                const filteredReversed: Record<string, boolean> = {};
                finalSelection.forEach(key => {
                    filteredReversed[key] = existingReversed[key] || false;
                });
                setReversedByCategory(prev => ({ ...prev, [category]: filteredReversed }));
                if (category === selectedDiffCategory) {
                    setReversedDifferences(filteredReversed);
                }
                
                return;
            }

            if (filesForCategory.length < 2) {
                const existingSelection = selectionsByCategory[category] || [];
                const existingReversed = reversedByCategory[category] || {};

                // Avoid endless updates when there is nothing to select for this category
                if (existingSelection.length === 0 && Object.keys(existingReversed).length === 0) {
                    return;
                }

                setSelectionsByCategory(prev => ({ ...prev, [category]: [] }));
                setReversedByCategory(prev => ({ ...prev, [category]: {} }));
                if (category === selectedDiffCategory) {
                    setSelectedDifferences([]);
                    setReversedDifferences({});
                }
                return;
            }

            setIsDiffLoading(true);
            try {
                // Check for simulated error first (inside try-catch to prevent uncaught error overlay)
                errorSimulator.checkAndThrow('difference_chart');
                
                // Fetch data (we already checked cache above and returned if found)
                const startTime = performance.now();
                apiLogger.logQuery(`/api/difference/${category}`, 'GET', {
                    params: { tolerance, files: filesForCategory.length, start, end },
                });
                
                const diffs = await fetchAllDifferences({ [category]: filesForCategory }, tolerance, start || undefined, end || undefined);
                
                const duration = Math.round(performance.now() - startTime);
                apiLogger.logQuery(`/api/difference/${category}`, 'GET', {
                    params: { tolerance, files: filesForCategory.length, start, end },
                    duration,
                    status: 200,
                });
                
                // Cache the result
                metricsCacheManager.set(cacheParams, diffs[category]);
                
                setDifferenceValues(prev => ({ ...prev, [category]: diffs[category] }));

                const optionKeys = Object.keys(diffs[category] || {}).map(diffKey => `${category}.${diffKey}`);
                const existingSelection = selectionsByCategory[category] || [];
                const filteredExisting = existingSelection.filter(key => optionKeys.includes(key));
                
                // If user hasn't interacted with this category yet, auto-select first series
                const userHasInteracted = hasUserInteractedByCategory[category];
                const finalSelection = !userHasInteracted && filteredExisting.length === 0 && optionKeys.length > 0
                    ? [optionKeys[0]] // Auto-select first series
                    : filteredExisting;
                
                setSelectionsByCategory(prev => ({ ...prev, [category]: finalSelection }));
                if (category === selectedDiffCategory) {
                    setSelectedDifferences(finalSelection);
                }

                const existingReversed = reversedByCategory[category] || {};
                const filteredReversed: Record<string, boolean> = {};
                finalSelection.forEach(key => {
                    filteredReversed[key] = existingReversed[key] || false;
                });
                setReversedByCategory(prev => ({ ...prev, [category]: filteredReversed }));
                if (category === selectedDiffCategory) {
                    setReversedDifferences(filteredReversed);
                }
            } catch (err: unknown) {
                const errorMsg = (err instanceof Error ? err.message : 'Failed to fetch differences.');
                setDiffError(errorMsg);
                // Note: Don't propagate to global setError - diff errors are shown in diff view only
            } finally {
                setIsDiffLoading(false);
            }
        };

        if (selectedDiffCategory) {
            fetchDifferencesForCategory(selectedDiffCategory, activeTolerance);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDiffCategory, filenamesPerCategory, activeTolerance, selectedMetricsForDisplay, start, end, timeRangePending]);

    const handleDiffCategoryChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = event.target.value;

        // Check if difference_chart is selected
        const shouldFetchDifferences =
            selectedMetricsForDisplay === null ||
            (selectedMetricsForDisplay.size > 0 && selectedMetricsForDisplay.has('difference_chart'));

        if (!shouldFetchDifferences) {
            // Don't fetch if difference_chart is not selected
            return;
        }

        // Persist current selections for current category
        if (selectedDiffCategory) {
            setSelectionsByCategory(prev => ({ ...prev, [selectedDiffCategory]: selectedDifferences }));
            setReversedByCategory(prev => ({ ...prev, [selectedDiffCategory]: reversedDifferences }));
        }

        // Just change the category - fetchDifferencesForCategory will be called by useEffect
        setSelectedDiffCategory(newCategory);
    }, [selectedDiffCategory, selectedDifferences, reversedDifferences, selectedMetricsForDisplay]);

    const handleDifferenceCheckboxChange = useCallback((diffFullName: string) => {
        if (!selectedDiffCategory) return;
        // Mark that user has interacted with this category
        setHasUserInteractedByCategory(prev => ({ ...prev, [selectedDiffCategory]: true }));
        setSelectedDifferences(prev => {
            const newSelection = prev.includes(diffFullName)
                ? prev.filter(d => d !== diffFullName)
                : [...prev, diffFullName];

            setSelectionsByCategory(prevSel => ({ ...prevSel, [selectedDiffCategory]: newSelection }));

            setReversedDifferences(prevRev => {
                const updated = { ...prevRev };
                if (!(diffFullName in updated)) updated[diffFullName] = false;
                Object.keys(updated).forEach(key => {
                    if (!newSelection.includes(key)) delete updated[key];
                });
                setReversedByCategory(prevRev => ({ ...prevRev, [selectedDiffCategory]: updated }));
                return updated;
            });

            return newSelection;
        });
    }, [selectedDiffCategory]);

    const handleReverseToggle = useCallback((diffFullName: string) => {
        if (!selectedDiffCategory) return;
        // Mark that user has interacted with this category
        setHasUserInteractedByCategory(prev => ({ ...prev, [selectedDiffCategory]: true }));
        setReversedDifferences(prev => {
            const updated = {
                ...prev,
                [diffFullName]: !prev[diffFullName]
            };
            setReversedByCategory(prevRev => ({ ...prevRev, [selectedDiffCategory]: updated }));
            return updated;
        });
    }, [selectedDiffCategory]);

    const getDifferenceOptions = useCallback((): DifferenceOption[] => {
        if (!selectedDiffCategory || !differenceValues[selectedDiffCategory]) return [];
        return Object.keys(differenceValues[selectedDiffCategory]).map(diffKey => ({
            value: `${selectedDiffCategory}.${diffKey}`,
            label: diffKey
        }));
    }, [selectedDiffCategory, differenceValues]);

    const handleSelectAllToggle = useCallback(() => {
        if (!selectedDiffCategory) return;
        // Mark that user has interacted with this category
        setHasUserInteractedByCategory(prev => ({ ...prev, [selectedDiffCategory]: true }));
        const options = getDifferenceOptions();
        const allSelected = options.every(opt => selectedDifferences.includes(opt.value));

        if (allSelected) {
            setSelectionsByCategory(prev => ({ ...prev, [selectedDiffCategory]: [] }));
            setSelectedDifferences([]);
            setReversedByCategory(prev => ({ ...prev, [selectedDiffCategory]: {} }));
            setReversedDifferences({});
        } else {
            const allKeys = options.map(opt => opt.value);
            setSelectionsByCategory(prev => ({ ...prev, [selectedDiffCategory]: allKeys }));
            setSelectedDifferences(allKeys);

            const allReversed: Record<string, boolean> = {};
            allKeys.forEach(key => (allReversed[key] = false));
            setReversedByCategory(prev => ({ ...prev, [selectedDiffCategory]: allReversed }));
            setReversedDifferences(allReversed);
        }
    }, [getDifferenceOptions, selectedDifferences, selectedDiffCategory]);

    const handleApplyTolerance = useCallback(async () => {
        // Check if difference_chart is selected
        const shouldFetchDifferences =
            selectedMetricsForDisplay === null ||
            (selectedMetricsForDisplay.size > 0 && selectedMetricsForDisplay.has('difference_chart'));

        if (!shouldFetchDifferences) {
            return;
        }

        // Parse the tolerance value
        const numericValue = parseFloat(customToleranceValue);
        const tol = customToleranceValue === "" || isNaN(numericValue) ? null : Math.abs(numericValue);
        
        // Don't do anything if:
        // 1. Value hasn't changed
        // 2. Input is empty and tolerance is already null
        if (tol === activeTolerance) return;
        if (customToleranceValue === "" && activeTolerance === null) return;

        // Just update the tolerance - useEffect will handle the fetch
        setActiveTolerance(tol);
    }, [customToleranceValue, activeTolerance, selectedMetricsForDisplay]);

    const handleResetTolerance = useCallback(() => {
        // Check if difference_chart is selected
        const shouldFetchDifferences =
            selectedMetricsForDisplay === null ||
            (selectedMetricsForDisplay.size > 0 && selectedMetricsForDisplay.has('difference_chart'));

        if (!shouldFetchDifferences) {
            return;
        }

        // Clear any existing errors first
        setDiffError(null);
        setError?.(null);
        
        // Only refetch if tolerance was actually set
        if (activeTolerance === null && customToleranceValue === "") return;

        // Just reset tolerance - useEffect will handle the fetch
        setCustomToleranceValue("");
        setActiveTolerance(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTolerance, customToleranceValue, selectedMetricsForDisplay]);

    const resetDifferenceChart = useCallback(() => {
        setDifferenceValues({});
        setSelectedDiffCategory(null);
        setSelectedDifferences([]);
        setReversedDifferences({});
        setSelectionsByCategory({});
        setReversedByCategory({});
        setHasUserInteractedByCategory({});
        setActiveTolerance(null);
        setCustomToleranceValue("");
        setDiffError(null);
    }, []);

    // Compute chart data for differences
    const differenceChartData: Record<string, TimeSeriesEntry[]> = {};
    selectedDifferences.forEach(diffFullName => {
        const [categoryName, diffKey] = diffFullName.split('.');
        const diffData = differenceValues[categoryName]?.[diffKey];
        const isReversed = reversedDifferences[diffFullName];

        if (diffData) {
            differenceChartData[`Difference: ${diffKey}${isReversed ? " (reversed)" : ""}`] = isReversed
                ? diffData.map(entry => ({ ...entry, y: -entry.y }))
                : diffData;
        }
    });

    return {
        differenceValues,
        selectedDiffCategory,
        selectedDifferences,
        reversedDifferences,
        customToleranceValue,
        isDiffLoading,
        diffError,
        setDiffError,
        differenceChartData,
        differenceOptions: getDifferenceOptions(),
        handleDiffCategoryChange,
        handleDifferenceCheckboxChange,
        handleReverseToggle,
        handleSelectAllToggle,
        setCustomToleranceValue,
        handleApplyTolerance,
        handleResetTolerance,
        resetDifferenceChart,
    };
}
