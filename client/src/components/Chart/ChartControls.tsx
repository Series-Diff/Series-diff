import React from "react";
import { Form, Button } from 'react-bootstrap';

/**
 * Sub-component for Y-axis range controls.
 * Renders inputs and buttons for custom min/max on primary and secondary Y-axes using React-Bootstrap for consistent styling.
 * Supports partial input - if only min or max is provided, the other value is taken from data bounds.
 */
interface ChartControlsProps {
    customYMin: string;
    setCustomYMin: React.Dispatch<React.SetStateAction<string>>;
    customYMax: string;
    setCustomYMax: React.Dispatch<React.SetStateAction<string>>;
    setCustomRange: React.Dispatch<React.SetStateAction<boolean>>;
    customY2Min: string;
    setCustomY2Min: React.Dispatch<React.SetStateAction<string>>;
    customY2Max: string;
    setCustomY2Max: React.Dispatch<React.SetStateAction<string>>;
    setCustomRange2: React.Dispatch<React.SetStateAction<boolean>>;
    customY3Min: string;
    setCustomY3Min: React.Dispatch<React.SetStateAction<string>>;
    customY3Max: string;
    setCustomY3Max: React.Dispatch<React.SetStateAction<string>>;
    setCustomRange3: React.Dispatch<React.SetStateAction<boolean>>;
    hasSecondary: boolean;
    hasTertiary: boolean;
    // Data bounds for filling in missing values
    primaryDataBounds: { min: number; max: number };
    secondaryDataBounds: { min: number; max: number };
    tertiaryDataBounds: { min: number; max: number }
}

const ChartControls: React.FC<ChartControlsProps> = ({
    customYMin, setCustomYMin, customYMax, setCustomYMax, setCustomRange, customY2Min, setCustomY2Min,
    customY2Max, setCustomY2Max, setCustomRange2, customY3Min, setCustomY3Min, customY3Max, setCustomY3Max, setCustomRange3, hasSecondary, hasTertiary, primaryDataBounds, secondaryDataBounds, tertiaryDataBounds
}) => {
    // Apply range - if only one value provided, use data bounds for the other
    // If max < min, swap the values
    const handleApplyPrimary = () => {
        if (customYMin !== '' || customYMax !== '') {
            // Fill in missing value from data bounds
            let minVal = customYMin !== '' ? parseFloat(customYMin) : primaryDataBounds.min;
            let maxVal = customYMax !== '' ? parseFloat(customYMax) : primaryDataBounds.max;
            
            // Swap if max < min
            if (maxVal < minVal) {
                [minVal, maxVal] = [maxVal, minVal];
            }
            
            setCustomYMin(minVal.toString());
            setCustomYMax(maxVal.toString());
            setCustomRange(true);
        }
    };

    const handleApplySecondary = () => {
        if (customY2Min !== '' || customY2Max !== '') {
            // Fill in missing value from data bounds
            let minVal = customY2Min !== '' ? parseFloat(customY2Min) : secondaryDataBounds.min;
            let maxVal = customY2Max !== '' ? parseFloat(customY2Max) : secondaryDataBounds.max;
            
            // Swap if max < min
            if (maxVal < minVal) {
                [minVal, maxVal] = [maxVal, minVal];
            }
            
            setCustomY2Min(minVal.toString());
            setCustomY2Max(maxVal.toString());
            setCustomRange2(true);
        }
    };

    const handleApplyTertiary = () => {
        if (customY3Min !== '' || customY3Max !== '') {
            // Fill in missing value from data bounds
            let minVal = customY3Min !== '' ? parseFloat(customY3Min) : tertiaryDataBounds.min;
            let maxVal = customY3Max !== '' ? parseFloat(customY3Max) : tertiaryDataBounds.max;

            // Swap if max < min
            if (maxVal < minVal) {
                [minVal, maxVal] = [maxVal, minVal];
            }

            setCustomY3Min(minVal.toString());
            setCustomY3Max(maxVal.toString());
            setCustomRange3(true);
        }
    };

    // Enable Apply if at least one value is provided
    const canApplyPrimary = customYMin !== '' || customYMax !== '';
    const canApplySecondary = customY2Min !== '' || customY2Max !== '';
    const canApplyTertiary = customY3Min !== '' || customY3Max !== '';

    return (
        <div className="d-flex justify-content-center align-items-center flex-wrap gap-5">
            {/* Primary Y-axis controls */}
            <div className="d-flex align-items-center gap-2">
                <Form.Label className="mb-0 text-nowrap fw-medium">Main Y:</Form.Label>
                <Form.Control
                    type="number"
                    value={customYMin}
                    onChange={(e) => setCustomYMin(e.target.value)}
                    style={{ width: '70px' }}
                    size="sm"
                    placeholder="min"
                />
                <Form.Control
                    type="number"
                    value={customYMax}
                    onChange={(e) => setCustomYMax(e.target.value)}
                    style={{ width: '70px' }}
                    size="sm"
                    placeholder="max"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyPrimary}
                    disabled={!canApplyPrimary}
                    title="Apply Y-axis range (missing value will use data bounds)"
                >
                    Apply
                </Button>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => { setCustomYMin(''); setCustomYMax(''); setCustomRange(false); }}
                >
                    Reset
                </Button>
            </div>

            {/* Secondary Y-axis controls */}
            {hasSecondary && (
                <div className="d-flex align-items-center gap-2">
                    <Form.Label className="mb-0 text-nowrap fw-medium">Secondary Y:</Form.Label>
                    <Form.Control
                        type="number"
                        value={customY2Min}
                        onChange={(e) => setCustomY2Min(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder="min"
                    />
                    <Form.Control
                        type="number"
                        value={customY2Max}
                        onChange={(e) => setCustomY2Max(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder="max"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleApplySecondary}
                        disabled={!canApplySecondary}
                        title="Apply Y2-axis range (missing value will use data bounds)"
                    >
                        Apply
                    </Button>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => { setCustomY2Min(''); setCustomY2Max(''); setCustomRange2(false); }}
                    >
                        Reset
                    </Button>
                </div>
            )}
            {/* Secondary Y-axis controls */}
            {hasTertiary && (
                <div className="d-flex align-items-center gap-2">
                    <Form.Label className="mb-0 text-nowrap fw-medium">Tertiary Y:</Form.Label>
                    <Form.Control
                        type="number"
                        value={customY3Min}
                        onChange={(e) => setCustomY3Min(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder="min"
                    />
                    <Form.Control
                        type="number"
                        value={customY3Max}
                        onChange={(e) => setCustomY3Max(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder="max"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyTertiary}
                        disabled={!canApplyTertiary}
                        title="Apply Y3-axis range (missing value will use data bounds)"
                    >
                        Apply
                    </Button>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => { setCustomY3Min(''); setCustomY3Max(''); setCustomRange3(false); }}
                    >
                        Reset
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ChartControls;