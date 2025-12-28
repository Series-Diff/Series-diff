import React from 'react';
import * as components from '../../../components';
import { Button, Form } from 'react-bootstrap';

interface StandardControlsProps {
    mode: 'standard';
    selectedCategory: string | null;
    secondaryCategory: string | null;
    filenamesPerCategory: Record<string, string[]>;
    handleDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSecondaryDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    showMovingAverage: boolean;
    handleToggleMovingAverage: () => void;
    isMaLoading: boolean;
    maWindow: string;
    setMaWindow: (value: string) => void;
    handleApplyMaWindow: () => void;
    syncColorsByFile: boolean;
    setSyncColorsByFile: React.Dispatch<React.SetStateAction<boolean>>;
        startDate: Date | null;
    endDate: Date | null;
    handleStartChange: (date: Date | null) => void;
    handleEndChange: (date: Date | null) => void;
    defaultMinDate: Date | null;
    defaultMaxDate: Date | null;
}

interface DifferenceControlsProps {
    mode: 'difference';
    filenamesPerCategory: Record<string, string[]>;
    selectedDiffCategory: string | null;
    handleDiffCategoryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    customToleranceValue: string;
    setCustomToleranceValue: (value: string) => void;
    handleApplyTolerance: () => void;
    handleResetTolerance: () => void;
    isDiffLoading: boolean;
}

interface CommonProps {
    isLoading: boolean;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleReset: () => void;
}

type ControlsPanelProps = CommonProps & (StandardControlsProps | DifferenceControlsProps);

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const { isLoading, handleFileUpload, handleReset, mode, filenamesPerCategory } = props;
    const hasCategories = Object.keys(filenamesPerCategory).length > 0;

    return (
        <div className="d-flex justify-content-between align-items-end w-100 ps-1">
            <div className="d-flex align-items-end gap-3">
                {hasCategories && mode === 'standard' && (
                    <>
                        <div className="d-flex flex-column gap-2">
                            
                            <div className="d-flex gap-3">
                                <components.Select
                                    id="category-select"
                                    label="Main Y-Axis"
                                    selected={(props as StandardControlsProps).selectedCategory || Object.keys(filenamesPerCategory)[0]}
                                    categories={Object.keys(filenamesPerCategory)}
                                    onChange={(props as StandardControlsProps).handleDropdownChange}
                                    disabledCategory={(props as StandardControlsProps).secondaryCategory ?? undefined}
                                />
                                <components.Select
                                    id="secondary-category-select"
                                    label="Second Y-Axis"
                                    selected={(props as StandardControlsProps).secondaryCategory || ""}
                                    categories={Object.keys(filenamesPerCategory)}
                                    onChange={(props as StandardControlsProps).handleSecondaryDropdownChange}
                                    disabledCategory={(props as StandardControlsProps).selectedCategory ?? undefined}
                                    allowNoneOption
                                />
                            </div>


                            <div className="d-flex gap-3">
                                <components.DateTimePicker
                                    label="Start time"
                                    value={(props as StandardControlsProps).startDate}
                                    onChange={(props as StandardControlsProps).handleStartChange}
                                    placeholder="Start date"
                                    minDate={(props as StandardControlsProps).defaultMinDate}
                                    maxDate={(props as StandardControlsProps).endDate ?? (props as StandardControlsProps).defaultMaxDate}
                                    openToDate={(props as StandardControlsProps).startDate ?? (props as StandardControlsProps).defaultMinDate}
                                />
                                <components.DateTimePicker
                                    label="End time"
                                    value={(props as StandardControlsProps).endDate}
                                    onChange={(props as StandardControlsProps).handleEndChange}
                                    placeholder="End date"
                                    minDate={(props as StandardControlsProps).startDate ?? (props as StandardControlsProps).defaultMinDate}
                                    maxDate={(props as StandardControlsProps).defaultMaxDate}
                                    openToDate={(props as StandardControlsProps).endDate ?? (props as StandardControlsProps).defaultMaxDate}
                                />
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2, ms-3">
                            <Form.Check
                                type="switch"
                                id="ma-toggle"
                                label={(props as StandardControlsProps).isMaLoading ? "Loading MA..." : "Show Moving Avg"}
                                checked={(props as StandardControlsProps).showMovingAverage}
                                onChange={(props as StandardControlsProps).handleToggleMovingAverage}
                                disabled={(props as StandardControlsProps).isMaLoading}
                            />
                            <Form.Control
                                type="text"
                                style={{ width: '80px' }}
                                size="sm"
                                value={(props as StandardControlsProps).maWindow}
                                onChange={(e) => (props as StandardControlsProps).setMaWindow(e.target.value)}
                                placeholder="e.g. 1d"
                                disabled={(props as StandardControlsProps).isMaLoading}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(props as StandardControlsProps).handleApplyMaWindow}
                                disabled={(props as StandardControlsProps).isMaLoading || !(props as StandardControlsProps).showMovingAverage}
                            >
                                Apply
                            </Button>
                        </div>
                        <div className="d-flex align-items-center ms-3">
                            <Form.Check
                                type="switch"
                                id="color-sync-toggle"
                                label="Sync Colors"
                                checked={(props as StandardControlsProps).syncColorsByFile}
                                onChange={() => (props as StandardControlsProps).setSyncColorsByFile(prev => !prev)}
                            />
                        </div>
                    </>
                )}

                {hasCategories && mode === 'difference' && (
                    <>
                        <components.Select
                            id="diff-category-select-controls"
                            label="Select Category"
                            selected={(props as DifferenceControlsProps).selectedDiffCategory || Object.keys(filenamesPerCategory)[0]}
                            categories={Object.keys(filenamesPerCategory)}
                            onChange={(props as DifferenceControlsProps).handleDiffCategoryChange}
                        />

                        <div className="d-flex align-items-center gap-2 ms-3">
                            <Form.Label 
                                className="mb-0 text-nowrap" 
                                title="Time tolerance for matching data points (in minutes). E.g., 5 = 5 minutes tolerance. Leave empty for auto."
                            >
                                Tolerance
                            </Form.Label>
                            <Form.Control
                                type="number"
                                value={(props as DifferenceControlsProps).customToleranceValue}
                                onChange={(e) => (props as DifferenceControlsProps).setCustomToleranceValue(e.target.value)}
                                className="w-auto"
                                style={{ maxWidth: '80px' }}
                                size="sm"
                                placeholder="auto"
                                disabled={(props as DifferenceControlsProps).isDiffLoading}
                                title="Enter tolerance in minutes (e.g., 5 for 5 minutes)"
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(props as DifferenceControlsProps).handleApplyTolerance}
                                disabled={(props as DifferenceControlsProps).isDiffLoading}
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={(props as DifferenceControlsProps).handleResetTolerance}
                                disabled={(props as DifferenceControlsProps).isDiffLoading}
                            >
                                Reset
                            </Button>
                        </div>
                    </>
                )}
            </div>
            <div className="d-flex align-items-end gap-3">
                <label htmlFor="file-upload"
                    className={`custom-file-upload btn btn-primary rounded p-2 px-3 text-center ${isLoading ? "disabled" : ""}`}>
                    {isLoading ? "Loading..." : "Upload files"}
                </label>
                <input id="file-upload" type="file" multiple accept=".json,.csv"
                    onChange={handleFileUpload} className="d-none" disabled={isLoading} />
                <Button onClick={handleReset}
                    className="custom-file-upload btn btn-primary rounded p-2 px-3 text-center"
                    disabled={isLoading}>
                    Reset data
                </Button>
            </div>
        </div>
    );
};

export default ControlsPanel;