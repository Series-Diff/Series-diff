import React from 'react';
import * as components from '../../../components';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { useCompactMode, getControlsPanelStyles } from '../../../hooks/useCompactMode';

export type LayoutMode = 'stacked' | 'overlay';
export type ColorSyncMode = 'default' | 'group' | 'file';

interface StandardControlsProps {
    mode: 'standard';
    selectedCategory: string | null;
    secondaryCategory: string | null;
    tertiaryCategory: string | null;
    filenamesPerCategory: Record<string, string[]>;
    handleDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleSecondaryDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    handleTertiaryDropdownChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
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

    const isMaFeatureAvailable = standardProps.showMovingAverage !== undefined && standardProps.handleToggleMovingAverage;

    const { isCompact } = useCompactMode();
    const styles = getControlsPanelStyles(isCompact);

    return (
        <div className="d-flex justify-content-between align-items-center w-100 ps-1">
            <div className="d-flex align-items-center gap-2">
                {hasCategories && mode === 'standard' && (
                    <>
                        <div 
                            className={`d-flex align-items-center ${styles.containerGap} bg-white border rounded shadow-sm ${styles.containerPadding} ${styles.textClass}`}
                            style={{ minHeight: styles.containerMinHeight }}
                        >
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

                        <div
                            className={`d-flex flex-column justify-content-center ${styles.containerGap} bg-white border rounded shadow-sm ${styles.containerPadding} ${styles.textClass}`}
                            style={{ minHeight: styles.containerMinHeight }}
                        >
                            {isMaFeatureAvailable && (
                                <div className={`d-flex align-items-center ${styles.containerGap}`}>
                                    <Form.Check
                                        type="switch"
                                        id="ma-toggle"
                                        label={standardProps.isMaLoading ? "Loading..." : "Moving Avg"}
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
                            )}

                            <div className={`d-flex align-items-center ${styles.containerGap}`}>
                                <div className={`d-flex align-items-center ${styles.selectGap}`}>
                                    <Form.Label className={`mb-0 text-nowrap text-muted ${styles.textClass}`}>Color:</Form.Label>
                                    <Form.Select
                                        size={styles.buttonSize}
                                        className={styles.textClass}
                                        value={standardProps.colorSyncMode}
                                        onChange={(e) => standardProps.setColorSyncMode(e.target.value as ColorSyncMode)}
                                    >
                                        <option value="default">Default</option>
                                        <option value="group">By Group</option>
                                        <option value="file">By File</option>
                                    </Form.Select>
                                </div>

                                <div className={`d-flex align-items-center ${styles.selectGap}`}>
                                    <Form.Label className={`mb-0 text-nowrap text-muted ${styles.textClass}`}>Layout:</Form.Label>
                                    <Form.Select
                                        size={styles.buttonSize}
                                        className={styles.textClass}
                                        value={standardProps.layoutMode}
                                        onChange={(e) => standardProps.setLayoutMode(e.target.value as LayoutMode)}
                                    >
                                        <option value="overlay">Overlay</option>
                                        <option value="stacked">Stacked</option>
                                    </Form.Select>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {hasCategories && mode === 'difference' && (
                    <>
                        <div 
                            className={`d-flex align-items-center ${styles.containerGap} bg-white border rounded shadow-sm ${styles.containerPadding} ${styles.textClass}`}
                            style={{ minHeight: styles.containerMinHeight }}
                        >
                            <components.Select
                                id="diff-category-select-controls"
                                label="Select Category"
                                selected={diffProps.selectedDiffCategory || allCategories[0]}
                                categories={allCategories}
                                onChange={diffProps.handleDiffCategoryChange}
                            />
                        </div>

                        <div className={`d-flex align-items-center ${styles.containerGap} bg-white border rounded shadow-sm ${styles.containerPadding} ${styles.textClass}`}>
                            <Form.Label
                                className={`mb-0 text-nowrap ${styles.textClass}`}
                                title="Time tolerance for matching data points (in minutes). E.g., 5 = 5 minutes tolerance. Leave empty for auto."
                            >
                                Tolerance
                            </Form.Label>
                            <Form.Control
                                type="number"
                                value={diffProps.customToleranceValue}
                                onChange={(e) => diffProps.setCustomToleranceValue(e.target.value)}
                                className="w-auto"
                                style={{ maxWidth: styles.inputMaxWidth }}
                                size={styles.buttonSize}
                                placeholder="auto"
                                disabled={diffProps.isDiffLoading}
                                title="Enter tolerance in minutes (e.g., 5 for 5 minutes)"
                            />
                            <Button
                                variant="secondary"
                                size={styles.buttonSize}
                                onClick={diffProps.handleApplyTolerance}
                                disabled={diffProps.isDiffLoading}
                                className={styles.textClass}
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size={styles.buttonSize}
                                onClick={diffProps.handleResetTolerance}
                                disabled={diffProps.isDiffLoading}
                                className={styles.textClass}
                            >
                                Reset
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <div className={`d-flex align-items-end ${styles.containerGap}`}>
                <Button
                    as="label"
                    htmlFor="file-upload"
                    variant="primary"
                    size={styles.buttonSize}
                    className="mb-0 text-nowrap"
                    disabled={isLoading}
                >
                    {isLoading ? "Loading..." : "Upload files"}
                </Button>
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    className="d-none"
                    disabled={isLoading}
                />
                <Button
                    onClick={handleReset}
                    variant="outline-danger"
                    size={styles.buttonSize}
                    disabled={isLoading}
                    className="text-nowrap"
                >
                    Reset data
                </Button>
            </div>
        </div>
    );
};

export default ControlsPanel;