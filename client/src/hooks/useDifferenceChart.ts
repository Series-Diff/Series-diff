import { useState, useEffect, useCallback } from 'react';
import { fetchAllDifferences } from '../services/fetchAllDifferences';
import { TimeSeriesEntry } from '../services/fetchTimeSeries';

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
    setError?: (error: string | null) => void
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

    // Initialize selected category when filenamesPerCategory changes
    useEffect(() => {
        const categories = Object.keys(filenamesPerCategory);
        if (categories.length > 0 && !selectedDiffCategory) {
            setSelectedDiffCategory(categories[0]);
        }
    }, [filenamesPerCategory, selectedDiffCategory]);

    // Helper to sync selection maps
    const setSelectionsForCategory = useCallback((category: string, selections: string[]) => {
        setSelectionsByCategory(prev => ({ ...prev, [category]: selections }));
        if (category === selectedDiffCategory) {
            setSelectedDifferences(selections);
        }
    }, [selectedDiffCategory]);

    const setReversedForCategory = useCallback((category: string, reversed: Record<string, boolean>) => {
        setReversedByCategory(prev => ({ ...prev, [category]: reversed }));
        if (category === selectedDiffCategory) {
            setReversedDifferences(reversed);
        }
    }, [selectedDiffCategory]);

    // Fetch differences when category changes
    useEffect(() => {
        const fetchDifferencesForCategory = async (category: string, tolerance: number | null) => {
            const filesForCategory = filenamesPerCategory[category];
            if (!category || differenceValues[category] || !filesForCategory?.length) {
                // If we already have selections stored for this category, restore them
                if (category && selectionsByCategory[category]) {
                    setSelectedDifferences(selectionsByCategory[category]);
                    setReversedDifferences(reversedByCategory[category] || {});
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

                setSelectionsForCategory(category, []);
                setReversedForCategory(category, {});
                return;
            }

            setIsDiffLoading(true);
            try {
                const diffs = await fetchAllDifferences({ [category]: filesForCategory }, tolerance);
                setDifferenceValues(prev => ({ ...prev, [category]: diffs[category] }));

                const optionKeys = Object.keys(diffs[category] || {}).map(diffKey => `${category}.${diffKey}`);
                const existingSelection = selectionsByCategory[category] || [];
                const filteredExisting = existingSelection.filter(key => optionKeys.includes(key));
                
                // If user hasn't interacted with this category yet, auto-select first 2
                const userHasInteracted = hasUserInteractedByCategory[category];
                const finalSelection = !userHasInteracted && filteredExisting.length === 0 
                    ? optionKeys.slice(0, 2) 
                    : filteredExisting;
                setSelectionsForCategory(category, finalSelection);

                const existingReversed = reversedByCategory[category] || {};
                const filteredReversed: Record<string, boolean> = {};
                finalSelection.forEach(key => {
                    filteredReversed[key] = existingReversed[key] || false;
                });
                setReversedForCategory(category, filteredReversed);
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to fetch differences.';
                setDiffError(errorMsg);
                setError?.(errorMsg);
            } finally {
                setIsDiffLoading(false);
            }
        };

        if (selectedDiffCategory) {
            fetchDifferencesForCategory(selectedDiffCategory, activeTolerance);
        }
    }, [selectedDiffCategory, differenceValues, filenamesPerCategory, activeTolerance, setError, selectionsByCategory, reversedByCategory, setSelectionsForCategory, setReversedForCategory, hasUserInteractedByCategory]);

    const handleDiffCategoryChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = event.target.value;

        // Persist current selections for current category
        if (selectedDiffCategory) {
            setSelectionsForCategory(selectedDiffCategory, selectedDifferences);
            setReversedForCategory(selectedDiffCategory, reversedDifferences);
        }

        setSelectedDiffCategory(newCategory);

        if (filenamesPerCategory[newCategory]?.length < 2) {
            setSelectionsForCategory(newCategory, []);
            setReversedForCategory(newCategory, {});
            return;
        }

        // If we already have data for this category, restore stored selections if any
        const storedSelection = selectionsByCategory[newCategory];
        const storedReversed = reversedByCategory[newCategory];
        const userHasInteracted = hasUserInteractedByCategory[newCategory];
        
        if (differenceValues[newCategory]) {
            const optionKeys = Object.keys(differenceValues[newCategory]).map(diffKey => `${newCategory}.${diffKey}`);
            const filteredStored = (storedSelection || []).filter(key => optionKeys.includes(key));
            // If user hasn't interacted and no stored selection, auto-select first 2
            const finalSelection = !userHasInteracted && filteredStored.length === 0
                ? optionKeys.slice(0, 2)
                : filteredStored;
            setSelectionsForCategory(newCategory, finalSelection);

            const filteredReversed: Record<string, boolean> = {};
            finalSelection.forEach(key => {
                filteredReversed[key] = storedReversed?.[key] || false;
            });
            setReversedForCategory(newCategory, filteredReversed);
            return;
        }

        // If no data yet, fetch; selections will be set when fetch completes
        if (!differenceValues[newCategory] && filenamesPerCategory[newCategory]) {
            setIsDiffLoading(true);
            try {
                const diffs = await fetchAllDifferences({ [newCategory]: filenamesPerCategory[newCategory] }, activeTolerance);
                setDifferenceValues(prev => ({ ...prev, [newCategory]: diffs[newCategory] }));

                const optionKeys = Object.keys(diffs[newCategory] || {}).map(diffKey => `${newCategory}.${diffKey}`);
                const filteredStored = (storedSelection || []).filter(key => optionKeys.includes(key));
                // If user hasn't interacted and no stored selection, auto-select first 2
                const finalSelection = !userHasInteracted && filteredStored.length === 0
                    ? optionKeys.slice(0, 2)
                    : filteredStored;
                setSelectionsForCategory(newCategory, finalSelection);

                const filteredReversed: Record<string, boolean> = {};
                finalSelection.forEach(key => {
                    filteredReversed[key] = storedReversed?.[key] || false;
                });
                setReversedForCategory(newCategory, filteredReversed);
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to fetch differences.';
                setDiffError(errorMsg);
                setError?.(errorMsg);
            } finally {
                setIsDiffLoading(false);
            }
        }
    }, [selectedDiffCategory, selectedDifferences, reversedDifferences, filenamesPerCategory, differenceValues, activeTolerance, setError, selectionsByCategory, reversedByCategory, setSelectionsForCategory, setReversedForCategory, hasUserInteractedByCategory]);

    const handleDifferenceCheckboxChange = useCallback((diffFullName: string) => {
        if (!selectedDiffCategory) return;
        // Mark that user has interacted with this category
        setHasUserInteractedByCategory(prev => ({ ...prev, [selectedDiffCategory]: true }));
        setSelectedDifferences(prev => {
            const newSelection = prev.includes(diffFullName)
                ? prev.filter(d => d !== diffFullName)
                : [...prev, diffFullName];

            setSelectionsForCategory(selectedDiffCategory || '', newSelection);

            setReversedDifferences(prevRev => {
                const updated = { ...prevRev };
                if (!(diffFullName in updated)) updated[diffFullName] = false;
                Object.keys(updated).forEach(key => {
                    if (!newSelection.includes(key)) delete updated[key];
                });
                setReversedForCategory(selectedDiffCategory || '', updated);
                return updated;
            });

            return newSelection;
        });
    }, [selectedDiffCategory, setSelectionsForCategory, setReversedForCategory]);

    const handleReverseToggle = useCallback((diffFullName: string) => {
        if (!selectedDiffCategory) return;
        // Mark that user has interacted with this category
        setHasUserInteractedByCategory(prev => ({ ...prev, [selectedDiffCategory]: true }));
        setReversedDifferences(prev => {
            const updated = {
                ...prev,
                [diffFullName]: !prev[diffFullName]
            };
            setReversedForCategory(selectedDiffCategory, updated);
            return updated;
        });
    }, [selectedDiffCategory, setReversedForCategory]);

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
            setSelectionsForCategory(selectedDiffCategory || '', []);
            setReversedForCategory(selectedDiffCategory || '', {});
        } else {
            const allKeys = options.map(opt => opt.value);
            setSelectionsForCategory(selectedDiffCategory || '', allKeys);

            const allReversed: Record<string, boolean> = {};
            allKeys.forEach(key => (allReversed[key] = false));
            setReversedForCategory(selectedDiffCategory || '', allReversed);
        }
    }, [getDifferenceOptions, selectedDifferences, selectedDiffCategory, setSelectionsForCategory, setReversedForCategory]);

    const handleApplyTolerance = useCallback(async () => {
        // Parse the tolerance value
        const numericValue = parseFloat(customToleranceValue);
        const tol = customToleranceValue === "" || isNaN(numericValue) ? null : Math.abs(numericValue);
        
        // Don't do anything if:
        // 1. Value hasn't changed
        // 2. Input is empty and tolerance is already null
        if (tol === activeTolerance) return;
        if (customToleranceValue === "" && activeTolerance === null) return;

        setActiveTolerance(tol);

        // Refetch data with new tolerance, keep selections
        if (selectedDiffCategory && filenamesPerCategory[selectedDiffCategory]?.length > 1) {
            setIsDiffLoading(true);
            try {
                const diffs = await fetchAllDifferences(
                    { [selectedDiffCategory]: filenamesPerCategory[selectedDiffCategory] },
                    tol
                );
                setDifferenceValues(prev => ({ ...prev, [selectedDiffCategory]: diffs[selectedDiffCategory] }));
                setDiffError(null);

                const optionKeys = Object.keys(diffs[selectedDiffCategory] || {}).map(diffKey => `${selectedDiffCategory}.${diffKey}`);
                const currentSelection = selectionsByCategory[selectedDiffCategory] || selectedDifferences;
                const filteredSelection = currentSelection.filter(key => optionKeys.includes(key));
                setSelectionsForCategory(selectedDiffCategory, filteredSelection);

                const currentReversed = reversedByCategory[selectedDiffCategory] || reversedDifferences;
                const filteredReversed: Record<string, boolean> = {};
                filteredSelection.forEach(key => {
                    filteredReversed[key] = currentReversed[key] || false;
                });
                setReversedForCategory(selectedDiffCategory, filteredReversed);
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to fetch differences.';
                setDiffError(errorMsg);
                setError?.(errorMsg);
            } finally {
                setIsDiffLoading(false);
            }
        }
    }, [customToleranceValue, activeTolerance, selectedDiffCategory, filenamesPerCategory, setError, selectionsByCategory, reversedByCategory, selectedDifferences, reversedDifferences, setSelectionsForCategory, setReversedForCategory]);

    const handleResetTolerance = useCallback(async () => {
        // Clear any existing errors first
        setDiffError(null);
        setError?.(null);
        
        // Only refetch if tolerance was actually set
        if (activeTolerance === null && customToleranceValue === "") return;

        setCustomToleranceValue("");
        setActiveTolerance(null);

        // Refetch data for current category with no tolerance, but keep selections
        if (selectedDiffCategory && filenamesPerCategory[selectedDiffCategory]?.length > 1) {
            setIsDiffLoading(true);
            try {
                const diffs = await fetchAllDifferences(
                    { [selectedDiffCategory]: filenamesPerCategory[selectedDiffCategory] },
                    null
                );
                setDifferenceValues(prev => ({ ...prev, [selectedDiffCategory]: diffs[selectedDiffCategory] }));
                setDiffError(null);
                setError?.(null);

                const optionKeys = Object.keys(diffs[selectedDiffCategory] || {}).map(diffKey => `${selectedDiffCategory}.${diffKey}`);
                const currentSelection = selectionsByCategory[selectedDiffCategory] || selectedDifferences;
                const filteredSelection = currentSelection.filter(key => optionKeys.includes(key));
                setSelectionsForCategory(selectedDiffCategory, filteredSelection);

                const currentReversed = reversedByCategory[selectedDiffCategory] || reversedDifferences;
                const filteredReversed: Record<string, boolean> = {};
                filteredSelection.forEach(key => {
                    filteredReversed[key] = currentReversed[key] || false;
                });
                setReversedForCategory(selectedDiffCategory, filteredReversed);
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to fetch differences.';
                setDiffError(errorMsg);
                setError?.(errorMsg);
            } finally {
                setIsDiffLoading(false);
            }
        }
    }, [activeTolerance, customToleranceValue, selectedDiffCategory, filenamesPerCategory, setError, selectionsByCategory, reversedByCategory, selectedDifferences, reversedDifferences, setSelectionsForCategory, setReversedForCategory]);

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
