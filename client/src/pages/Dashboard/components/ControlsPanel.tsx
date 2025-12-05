import React from 'react';
import * as components from '../../../components';
import { Button } from 'react-bootstrap';

interface ControlsPanelProps {
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
    isLoading: boolean;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleReset: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
    selectedCategory,
    secondaryCategory,
    filenamesPerCategory,
    handleDropdownChange,
    handleSecondaryDropdownChange,
    showMovingAverage,
    handleToggleMovingAverage,
    isMaLoading,
    maWindow,
    setMaWindow,
    handleApplyMaWindow,
    syncColorsByFile,
    setSyncColorsByFile,
    isLoading,
    handleFileUpload,
    handleReset,
}) => {
    return (
        <div className="d-flex justify-content-between align-items-center w-100 mb-3">
            <div className="d-flex align-items-center gap-3">
                {Object.keys(filenamesPerCategory).length > 0 && (
                    <>
                        <components.Select
                            id="category-select"
                            label="Main Y-Axis"
                            selected={selectedCategory || Object.keys(filenamesPerCategory)[0]}
                            categories={Object.keys(filenamesPerCategory)}
                            onChange={handleDropdownChange}
                            disabledCategory={secondaryCategory ?? undefined}
                        />
                        <components.Select
                            id="secondary-category-select"
                            label="Second Y-Axis"
                            selected={secondaryCategory || ""}
                            categories={Object.keys(filenamesPerCategory)}
                            onChange={handleSecondaryDropdownChange}
                            disabledCategory={selectedCategory ?? undefined}
                            allowNoneOption
                        />

                        <div className="d-flex align-items-center gap-2" style={{ marginLeft: '16px' }}>
                            <div className="form-check form-switch">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="ma-toggle"
                                    checked={showMovingAverage}
                                    onChange={handleToggleMovingAverage}
                                    disabled={isMaLoading}
                                />
                                <label className="form-check-label" htmlFor="ma-toggle">
                                    {isMaLoading ? "Loading MA..." : "Show Moving Avg"}
                                </label>
                            </div>

                            <input
                                type="text"
                                className="form-control"
                                style={{ width: '80px' }}
                                value={maWindow}
                                onChange={(e) => setMaWindow(e.target.value)}
                                placeholder="e.g. 1d"
                                disabled={isMaLoading}
                            />
                            <button
                                onClick={handleApplyMaWindow}
                                className="btn btn-secondary btn-sm"
                                disabled={isMaLoading || !showMovingAverage}
                            >
                                Apply
                            </button>
                        </div>
                        <div className="form-check form-switch" style={{ marginLeft: '16px' }}>
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="color-sync-toggle"
                                checked={syncColorsByFile}
                                onChange={() => setSyncColorsByFile(!syncColorsByFile)}
                            />
                            <label className="form-check-label" htmlFor="color-sync-toggle">
                                Sync Colors
                            </label>
                        </div>
                    </>
                )}
            </div>
            <div className="d-flex align-items-center gap-3">
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