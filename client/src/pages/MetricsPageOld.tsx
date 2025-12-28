// src/MetricsPageOld.tsx
import React, { useState, useEffect, useCallback } from 'react';
import MyChart from '../components/Chart/Chart';
import './MetricsPageOld.css';
import { fetchAllDifferences } from '../services/fetchAllDifferences';
import { extractFilenamesPerCategory } from '../services/extractFilenamesPerCategory';
import { fetchTimeSeriesData, TimeSeriesEntry } from '../services/fetchTimeSeries';
import Select from '../components/Select/Select';
import Dropdown from "@/components/Dropdown/Dropdown";
import {Button, Form} from "react-bootstrap";

function MetricsPageOld() {
    const [allChartData, setAllChartData] = useState<Record<string, TimeSeriesEntry[]>>({});
    const [filenamesPerCategory, setFilenamesPerCategory] = useState<Record<string, string[]>>({});
    const [differenceValues, setDifferenceValues] = useState<Record<string, Record<string, TimeSeriesEntry[]>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedDifferences, setSelectedDifferences] = useState<string[]>([]);
    const [reversedDifferences, setReversedDifferences] = useState<Record<string, boolean>>({});

    const [activeTolerance, setActiveTolerance] = useState<number | null>(null);
    const [customToleranceValue, setCustomToleranceValue] = useState("");

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const chartData = await fetchTimeSeriesData();
            setAllChartData(chartData);

            const names = extractFilenamesPerCategory(chartData);
            setFilenamesPerCategory(names);

            setDifferenceValues({});

            if (Object.keys(names).length > 0) {
                setSelectedCategory(Object.keys(names)[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
       const fetchDifferencesForCategory = async (category: string, Tolerance: number | null) => {
    const filesForCategory = filenamesPerCategory[category];
    if (!category || differenceValues[category] || !filesForCategory?.length) return;

    if (filesForCategory.length < 2) {
        setSelectedDifferences([]);
        setReversedDifferences({});
        return;
    }

    setIsLoading(true);
    try {
        const diffs = await fetchAllDifferences({ [category]: filesForCategory }, Tolerance);
        setDifferenceValues(prev => ({ ...prev, [category]: diffs[category] }));

        const defaultSelection = Object.keys(diffs[category]).slice(0, 2).map(diffKey => `${category}.${diffKey}`);
        setSelectedDifferences(defaultSelection);

        const resetReversed: Record<string, boolean> = {};
        defaultSelection.forEach(key => (resetReversed[key] = false));
        setReversedDifferences(resetReversed);
    } catch (err: any) {
        setError(err.message || 'Failed to fetch differences.');
    } finally {
        setIsLoading(false);
    }
};


        if (selectedCategory) {
            fetchDifferencesForCategory(selectedCategory, activeTolerance);
        }
    }, [selectedCategory, differenceValues, filenamesPerCategory, activeTolerance]);

        const handleCategoryChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = event.target.value;
        setSelectedCategory(newCategory);

        if (filenamesPerCategory[newCategory]?.length < 2) {
    setSelectedDifferences([]);
    setReversedDifferences({});
    return;
}

        if (!differenceValues[newCategory] && filenamesPerCategory[newCategory]) {
            setIsLoading(true);
            try {
                const diffs = await fetchAllDifferences({ [newCategory]: filenamesPerCategory[newCategory] }, activeTolerance);
                setDifferenceValues(prev => ({ ...prev, [newCategory]: diffs[newCategory] }));

                const defaultSelection = Object.keys(diffs[newCategory]).slice(0, 2).map(diffKey => `${newCategory}.${diffKey}`);
                setSelectedDifferences(defaultSelection);

                const resetReversed: Record<string, boolean> = {};
                defaultSelection.forEach(key => (resetReversed[key] = false));
                setReversedDifferences(resetReversed);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch differences.');
            } finally {
                setIsLoading(false);
            }
        } else if (differenceValues[newCategory]) {
            const defaultSelection = Object.keys(differenceValues[newCategory]).slice(0, 2).map(diffKey => `${newCategory}.${diffKey}`);
            setSelectedDifferences(defaultSelection);

            const resetReversed: Record<string, boolean> = {};
            defaultSelection.forEach(key => (resetReversed[key] = false));
            setReversedDifferences(resetReversed);
        } else {
            setSelectedDifferences([]);
            setReversedDifferences({});
        }
    };


    const handleDifferenceCheckboxChange = (diffFullName: string) => {
        setSelectedDifferences(prev => {
            const newSelection = prev.includes(diffFullName)
                ? prev.filter(d => d !== diffFullName)
                : [...prev, diffFullName];

            setReversedDifferences(prevRev => {
                const updated = { ...prevRev };
                if (!(diffFullName in updated)) updated[diffFullName] = false;
                Object.keys(updated).forEach(key => {
                    if (!newSelection.includes(key)) delete updated[key];
                });
                return updated;
            });

            return newSelection;
        });
    };

    const handleReverseToggle = (diffFullName: string) => {
        setReversedDifferences(prev => ({
            ...prev,
            [diffFullName]: !prev[diffFullName]
        }));
    };

    const handleSelectAllToggle = () => {
        const options = getDifferenceOptions();
        const allSelected = options.every(opt => selectedDifferences.includes(opt.value));

        if (allSelected) {
            setSelectedDifferences([]);
            setReversedDifferences({});
        } else {
            const allKeys = options.map(opt => opt.value);
            setSelectedDifferences(allKeys);

            const allReversed: Record<string, boolean> = {};
            allKeys.forEach(key => (allReversed[key] = false));
            setReversedDifferences(allReversed);
        }
    };

const handleApplyTolerance = async () => {
    const numericValue = parseFloat(customToleranceValue);
    const tol = customToleranceValue === "" || isNaN(numericValue) ? null : Math.abs(numericValue);
    setActiveTolerance(tol);

    if (selectedCategory && filenamesPerCategory[selectedCategory]?.length > 1) {
        setIsLoading(true);
        try {
            const diffs = await fetchAllDifferences({ [selectedCategory]: filenamesPerCategory[selectedCategory] }, tol);
            setDifferenceValues(prev => ({ ...prev, [selectedCategory]: diffs[selectedCategory] }));

            const defaultSelection = Object.keys(diffs[selectedCategory]).slice(0, 2).map(diffKey => `${selectedCategory}.${diffKey}`);
            setSelectedDifferences(defaultSelection);

            const resetReversed: Record<string, boolean> = {};
            defaultSelection.forEach(key => (resetReversed[key] = false));
            setReversedDifferences(resetReversed);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch differences.');
        } finally {
            setIsLoading(false);
        }
    }
};


    const handleResetTolerance = () => {
        setCustomToleranceValue("");
        setActiveTolerance(null);

        setDifferenceValues({});
        setSelectedDifferences([]);
        setReversedDifferences({});
    };


    const chartPrimaryData: Record<string, TimeSeriesEntry[]> = {};
    selectedDifferences.forEach(diffFullName => {
        const [categoryName, diffKey] = diffFullName.split('.');
        const diffData = differenceValues[categoryName]?.[diffKey];
        const isReversed = reversedDifferences[diffFullName];

        if (diffData) {
            chartPrimaryData[`Difference: ${diffKey}${isReversed ? " (reversed)" : ""}`] = isReversed
                ? diffData.map(entry => ({ ...entry, y: -entry.y }))
                : diffData;
        }
    });

    const getDifferenceOptions = () => {
        if (!selectedCategory || !differenceValues[selectedCategory]) return [];
        return Object.keys(differenceValues[selectedCategory]).map(diffKey => ({
            value: `${selectedCategory}.${diffKey}`,
            label: diffKey
        }));
    };

    const chartTitle =
        selectedDifferences.length > 0
            ? `Difference Series (${selectedDifferences.length} selected)`
            : "Select Difference Series to Compare";

    return (
        <div>
            <h1>Difference chart</h1>


        <div className="d-flex" style={{ gap: "16px" }}>

            <div className="flex-grow-1">
                <div className="section-container chart-section p-0">
                    {isLoading && <p className="text-center p-4">Loading data and differences...</p>}
                    {!isLoading && !error && Object.keys(chartPrimaryData).length === 0 && (
                        <p className="text-center p-4">Select a category and one or more difference series to visualize.</p>
                    )}
                    {!isLoading && !error && Object.keys(chartPrimaryData).length > 0 && (
                        <MyChart primaryData={chartPrimaryData} title={chartTitle} />
                    )}
                    {error && <p className="text-danger text-center">Error: {error}</p>}
                </div>
            </div>
            <div className="section-container group-menu d-flex flex-column align-items-center rounded" style={{ minWidth: 350 }}>
                <h4>Difference Selection</h4>
                <Select
                    id="category-select-metrics"
                    label="Select Category"
                    selected={selectedCategory || ""}
                    categories={Object.keys(filenamesPerCategory)}
                    onChange={handleCategoryChange}
                />
                <div
                    className="difference-checkboxes mt-2"
                    style={{
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "8px",
                        maxHeight: "400px",
                        overflowY: "auto",
                        background: "#f9f9f9",
                        width: "100%"
                    }}
                >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <Form.Label className="me-2 m-0 text-center">Tolerance</Form.Label>
                        <Form.Control type="number" value={customToleranceValue} onChange={(e) => setCustomToleranceValue(e.target.value)} className="me-2" style={{ width: '60px' }} />

                        <Button variant="primary" onClick={handleApplyTolerance} className="me-2">Apply</Button>
                        <Button variant="primary" onClick={handleResetTolerance} className="me-2">Reset</Button>
                        </div>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>{selectedDifferences.length} selected</span>
                    <Button
                      variant="primary"
                      onClick={handleSelectAllToggle}
                      className="me-2"
                    >
                      {getDifferenceOptions().every(opt => selectedDifferences.includes(opt.value))
                        ? "Deselect All"
                        : "Select All"}
                    </Button>


                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                                <th style={{ width: "20%", textAlign: "center" }}>Show</th>
                                <th style={{ width: "20%", textAlign: "center" }}>Reverse</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getDifferenceOptions().map(opt => (
                                <tr key={opt.value} style={{ borderBottom: "1px solid #eee" }}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedDifferences.includes(opt.value)}
                                            onChange={() => handleDifferenceCheckboxChange(opt.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            disabled={!selectedDifferences.includes(opt.value)}
                                            checked={!!reversedDifferences[opt.value]}
                                            onChange={() => handleReverseToggle(opt.value)}
                                        />
                                    </td>

                                    <td>{opt.label}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>
    );
}

export default MetricsPageOld;
