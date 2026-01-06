import React from 'react';
import * as components from '../../../components';
import { Button, Form, InputGroup } from 'react-bootstrap';

export type LayoutMode = 'stacked' | 'overlay';
type ColorSyncMode = 'default' | 'group' | 'file';

interface StandardControlsProps {
    mode: 'standard';
    selectedCategory: string | null;
    secondaryCategory: string | null;
    filenamesPerCategory: Record<string, string[]>;
    handleDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSecondaryDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    showMovingAverage?: boolean;
    handleToggleMovingAverage?: () => void;
    isMaLoading: boolean;
    maWindow: string;
    setMaWindow: (value: string) => void;
    handleApplyMaWindow: () => void;
    colorSyncMode: ColorSyncMode;
    setColorSyncMode: React.Dispatch<React.SetStateAction<ColorSyncMode>>;
    layoutMode: LayoutMode;
    setLayoutMode: (mode: LayoutMode) => void;
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

    const allCategories = Object.keys(filenamesPerCategory);
    const { selectedCategory, secondaryCategory, tertiaryCategory } = props as StandardControlsProps;

    return (
        <div className="d-flex justify-content-between align-items-center w-100 ps-1">
            <div className="d-flex align-items-center gap-3">
                {hasCategories && mode === 'standard' && (
                    <>
                        <div className="d-flex align-items-center gap-2 bg-white border rounded shadow-sm px-3 py-2 me-3">
                        <components.Select
                            id="category-select"
                            label="Primary Y-Axis"
                            selected={(props as StandardControlsProps).selectedCategory || Object.keys(filenamesPerCategory)[0]}
                            categories={Object.keys(filenamesPerCategory)}
                            onChange={(props as StandardControlsProps).handleDropdownChange}
                            disabledCategory={(props as StandardControlsProps).secondaryCategory ?? undefined}
                        />
                        <components.Select
                            id="secondary-category-select"
                            label="Secondary Y-Axis"
                            selected={(props as StandardControlsProps).secondaryCategory || ""}
                            categories={Object.keys(filenamesPerCategory)}
                            onChange={(props as StandardControlsProps).handleSecondaryDropdownChange}
                            allowNoneOption
                        />
                        <components.Select
                        id="tertiary-category-select"
                        label="Tertiary Y-Axis"
                        selected={tertiaryCategory || ""}
                        categories={allCategories.filter(cat => cat !== selectedCategory && cat !== secondaryCategory)}
                        onChange={(props as StandardControlsProps).handleTertiaryDropdownChange}
                        allowNoneOption
                        />
                    </div>
                {(props as StandardControlsProps).showMovingAverage !== undefined && (props as StandardControlsProps).handleToggleMovingAverage && (

                    <div className="d-flex align-items-center gap-3 bg-white border rounded shadow-sm px-3 py-2">
                            <div className="d-flex align-items-center gap-2">
                                <Form.Check
                                type="switch"
                                id="ma-toggle"
                                label={(props as StandardControlsProps).isMaLoading ? "Loading MA..." : "Moving Avg"}
                                checked={(props as StandardControlsProps).showMovingAverage}
                                onChange={(props as StandardControlsProps).handleToggleMovingAverage}
                                disabled={(props as StandardControlsProps).isMaLoading}
                                className="mb-0 text-nowrap"
                            />
                            {(props as StandardControlsProps).showMovingAverage && (
                                <InputGroup size="sm" style={{ width: '120px' }}>
                                    <Form.Control
                                        placeholder="e.g. 1d"
                                        value={(props as StandardControlsProps).maWindow}
                                        onChange={(e) => (props as StandardControlsProps).setMaWindow(e.target.value)}
                                        disabled={(props as StandardControlsProps).isMaLoading}
                                        onKeyDown={(e) => e.key === 'Enter' && (props as StandardControlsProps).handleApplyMaWindow()}
                                    />
                            <Button
                                variant="outline-secondary"
                                onClick={(props as StandardControlsProps).handleApplyMaWindow}
                                disabled={(props as StandardControlsProps).isMaLoading || !(props as StandardControlsProps).showMovingAverage}
                            >
                                Set
                            </Button>
                                </InputGroup>
                                )}
                        </div>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#dee2e6' }}></div>
                        <div className="d-flex align-items-center gap-2">
                            <Form.Label className="mb-0 text-nowrap">Color Sync:</Form.Label>
                            <Form.Select
                                size="sm"
                                value={(props as StandardControlsProps).colorSyncMode}
                                onChange={(e) => (props as StandardControlsProps).setColorSyncMode(e.target.value as ColorSyncMode)}
                                style={{ width: 'auto', minWidth: '100px' }}
                            >
                                <option value="default">Default</option>
                                <option value="group">By Group</option>
                                <option value="file">By File</option>
                            </Form.Select>
                        </div>

                            <div style={{ width: '1px', height: '24px', backgroundColor: '#dee2e6' }}></div>

                            <div className="d-flex align-items-center gap-2">
                                <Form.Label className="mb-0 text-nowrap">Layout:</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={(props as StandardControlsProps).layoutMode}
                                    onChange={(e) => (props as StandardControlsProps).setLayoutMode(e.target.value as LayoutMode)}
                                    style={{ width: 'auto', minWidth: '100px' }}
                                >
                                    <option value="overlay">Overlay</option>
                                    <option value="stacked">Stacked</option>
                                </Form.Select>
                            </div>
                        </div>
                )}
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