import React from 'react';
import * as components from '../../../components';
import { Button, Form, InputGroup } from 'react-bootstrap';

export type LayoutMode = 'stacked' | 'overlay';
export type ColorSyncMode = 'default' | 'group' | 'file';

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
    const standardProps = props as StandardControlsProps;
    const diffProps = props as DifferenceControlsProps;

    return (
        <div className="d-flex justify-content-between align-items-center w-100 ps-1">
            <div className="d-flex align-items-center gap-3">
                {hasCategories && mode === 'standard' && (
                    <>
                        <div className="d-flex align-items-center gap-2 bg-white border rounded shadow-sm px-3 py-2 me-3">
                            <components.Select
                                id="category-select"
                                label="Primary Y-Axis"
                                selected={standardProps.selectedCategory || allCategories[0]}
                                categories={allCategories.filter(cat =>
                                    cat !== standardProps.secondaryCategory &&
                                    cat !== standardProps.tertiaryCategory
                                )}
                                onChange={standardProps.handleDropdownChange}
                            />
                            <components.Select
                                id="secondary-category-select"
                                label="Secondary Y-Axis"
                                selected={standardProps.secondaryCategory || ""}
                                categories={allCategories.filter(cat =>
                                    cat !== standardProps.selectedCategory &&
                                    cat !== standardProps.tertiaryCategory
                                )}
                                onChange={standardProps.handleSecondaryDropdownChange}
                                allowNoneOption
                            />
                            <components.Select
                                id="tertiary-category-select"
                                label="Tertiary Y-Axis"
                                selected={standardProps.tertiaryCategory || ""}
                                categories={allCategories.filter(cat => cat !== standardProps.selectedCategory && cat !== standardProps.secondaryCategory)}
                                onChange={standardProps.handleTertiaryDropdownChange}
                                allowNoneOption
                            />
                        </div>

                        {standardProps.showMovingAverage !== undefined && standardProps.handleToggleMovingAverage && (
                            <div className="d-flex align-items-center gap-3 bg-white border rounded shadow-sm px-3 py-2">
                                <div className="d-flex align-items-center gap-2">
                                    <Form.Check
                                        type="switch"
                                        id="ma-toggle"
                                        label={standardProps.isMaLoading ? "Loading MA..." : "Moving Avg"}
                                        checked={standardProps.showMovingAverage}
                                        onChange={standardProps.handleToggleMovingAverage}
                                        disabled={standardProps.isMaLoading}
                                        className="mb-0 text-nowrap"
                                    />
                                    {standardProps.showMovingAverage && (
                                        <InputGroup size="sm" style={{ width: '120px' }}>
                                            <Form.Control
                                                placeholder="e.g. 1d"
                                                value={standardProps.maWindow}
                                                onChange={(e) => standardProps.setMaWindow(e.target.value)}
                                                disabled={standardProps.isMaLoading}
                                                onKeyDown={(e) => e.key === 'Enter' && standardProps.handleApplyMaWindow()}
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                onClick={standardProps.handleApplyMaWindow}
                                                disabled={standardProps.isMaLoading || !standardProps.showMovingAverage}
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
                                        value={standardProps.colorSyncMode}
                                        onChange={(e) => standardProps.setColorSyncMode(e.target.value as ColorSyncMode)}
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
                                        value={standardProps.layoutMode}
                                        onChange={(e) => standardProps.setLayoutMode(e.target.value as LayoutMode)}
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
                            selected={diffProps.selectedDiffCategory || allCategories[0]}
                            categories={allCategories}
                            onChange={diffProps.handleDiffCategoryChange}
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
                                value={diffProps.customToleranceValue}
                                onChange={(e) => diffProps.setCustomToleranceValue(e.target.value)}
                                className="w-auto"
                                style={{ maxWidth: '80px' }}
                                size="sm"
                                placeholder="auto"
                                disabled={diffProps.isDiffLoading}
                                title="Enter tolerance in minutes (e.g., 5 for 5 minutes)"
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={diffProps.handleApplyTolerance}
                                disabled={diffProps.isDiffLoading}
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={diffProps.handleResetTolerance}
                                disabled={diffProps.isDiffLoading}
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