import React, { useEffect } from "react";
import {Form, Button, InputGroup} from 'react-bootstrap';

/**
 * Sub-component for Y-axis range controls.
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
    primaryDataBounds: { min: number; max: number };
    secondaryDataBounds: { min: number; max: number };
    tertiaryDataBounds: { min: number; max: number }
}

const ChartControls: React.FC<ChartControlsProps> = ({
                                                         customYMin, setCustomYMin, customYMax, setCustomYMax, setCustomRange, customY2Min, setCustomY2Min,
                                                         customY2Max, setCustomY2Max, setCustomRange2, customY3Min, setCustomY3Min, customY3Max, setCustomY3Max, setCustomRange3, hasSecondary, hasTertiary, primaryDataBounds, secondaryDataBounds, tertiaryDataBounds
                                                     }) => {


    // Y1
    useEffect(() => {
        if (primaryDataBounds.min === 0 && primaryDataBounds.max === 100) {
            return;
        }

        if (primaryDataBounds.min !== undefined) {
            if (customYMin === '' || customYMin === '0') {
                setCustomYMin(primaryDataBounds.min.toFixed(0));
            }
        }

        if (primaryDataBounds.max !== undefined) {
            if (customYMax === '' || customYMax === '100') {
                setCustomYMax(primaryDataBounds.max.toFixed(0));
            }
        }
    }, [primaryDataBounds, customYMin, customYMax, setCustomYMin, setCustomYMax]);

    // Y2
    useEffect(() => {
        if (hasSecondary) {
            if (customY2Min === '' && secondaryDataBounds.min !== undefined) setCustomY2Min(secondaryDataBounds.min.toFixed(0));
            if (customY2Max === '' && secondaryDataBounds.max !== undefined) setCustomY2Max(secondaryDataBounds.max.toFixed(0));
        }
    }, [secondaryDataBounds, hasSecondary, setCustomY2Min, setCustomY2Max]);

    // Y3
    useEffect(() => {
        if (hasTertiary) {
            if (customY3Min === '' && tertiaryDataBounds.min !== undefined) setCustomY3Min(tertiaryDataBounds.min.toFixed(0));
            if (customY3Max === '' && tertiaryDataBounds.max !== undefined) setCustomY3Max(tertiaryDataBounds.max.toFixed(0));
        }
    }, [tertiaryDataBounds, hasTertiary, setCustomY3Min, setCustomY3Max]);


    const handleApplyPrimary = () => {
        // Jeśli input jest pusty, bierzemy zaokrągloną wartość z bounds
        // Math.round() jest użyte tutaj dla bezpieczeństwa, gdybyśmy operowali na number
        let minVal = customYMin !== '' ? parseFloat(customYMin) : Math.round(primaryDataBounds.min);
        let maxVal = customYMax !== '' ? parseFloat(customYMax) : Math.round(primaryDataBounds.max);

        if (isNaN(minVal)) minVal = Math.round(primaryDataBounds.min);
        if (isNaN(maxVal)) maxVal = Math.round(primaryDataBounds.max);

        if (maxVal < minVal) {
            [minVal, maxVal] = [maxVal, minVal];
        }

        // Zapisujemy jako stringi (jeśli były obliczane z bounds, to usuwamy ew. części dziesiętne)
        setCustomYMin(Number.isInteger(minVal) ? minVal.toString() : minVal.toFixed(0));
        setCustomYMax(Number.isInteger(maxVal) ? maxVal.toString() : maxVal.toFixed(0));
        setCustomRange(true);
    };

    const handleApplySecondary = () => {
        let minVal = customY2Min !== '' ? parseFloat(customY2Min) : Math.round(secondaryDataBounds.min);
        let maxVal = customY2Max !== '' ? parseFloat(customY2Max) : Math.round(secondaryDataBounds.max);

        if (isNaN(minVal)) minVal = Math.round(secondaryDataBounds.min);
        if (isNaN(maxVal)) maxVal = Math.round(secondaryDataBounds.max);

        if (maxVal < minVal) {
            [minVal, maxVal] = [maxVal, minVal];
        }

        setCustomY2Min(Number.isInteger(minVal) ? minVal.toString() : minVal.toFixed(0));
        setCustomY2Max(Number.isInteger(maxVal) ? maxVal.toString() : maxVal.toFixed(0));
        setCustomRange2(true);
    };

    const handleApplyTertiary = () => {
        let minVal = customY3Min !== '' ? parseFloat(customY3Min) : Math.round(tertiaryDataBounds.min);
        let maxVal = customY3Max !== '' ? parseFloat(customY3Max) : Math.round(tertiaryDataBounds.max);

        if (isNaN(minVal)) minVal = Math.round(tertiaryDataBounds.min);
        if (isNaN(maxVal)) maxVal = Math.round(tertiaryDataBounds.max);

        if (maxVal < minVal) {
            [minVal, maxVal] = [maxVal, minVal];
        }

        setCustomY3Min(Number.isInteger(minVal) ? minVal.toString() : minVal.toFixed(0));
        setCustomY3Max(Number.isInteger(maxVal) ? maxVal.toString() : maxVal.toFixed(0));
        setCustomRange3(true);
    };

    return (
        <div className="d-flex align-items-center flex-wrap gap-5">
            {/* Primary Y-axis controls */}
            <div className="d-flex align-items-center gap-2">
                <InputGroup size="sm">
                    <InputGroup.Text>Y1</InputGroup.Text>
                    <Form.Control
                        type="number"
                        value={customYMin}
                        onChange={(e) => setCustomYMin(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder={primaryDataBounds.min.toFixed(0)}
                    />
                    <InputGroup.Text>-</InputGroup.Text>
                    <Form.Control
                        type="number"
                        value={customYMax}
                        onChange={(e) => setCustomYMax(e.target.value)}
                        style={{ width: '70px' }}
                        size="sm"
                        placeholder={primaryDataBounds.max.toFixed(0)}
                    />
                    <Button variant="outline-primary" onClick={handleApplyPrimary}>Set</Button>
                    {(customYMin || customYMax) && (
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => { setCustomYMin(''); setCustomYMax(''); setCustomRange(false); }}
                        >
                            Reset
                        </Button>
                    )}
                </InputGroup>
            </div>

            {/* Secondary Y-axis controls */}
            {hasSecondary && (
                <div className="d-flex align-items-center gap-2">
                    <InputGroup size="sm">
                        <InputGroup.Text>Y2</InputGroup.Text>
                        <Form.Control
                            type="number"
                            value={customY2Min}
                            onChange={(e) => setCustomY2Min(e.target.value)}
                            style={{ width: '70px' }}
                            size="sm"
                            placeholder={secondaryDataBounds.min.toFixed(0)}
                        />
                        <InputGroup.Text>-</InputGroup.Text>
                        <Form.Control
                            type="number"
                            value={customY2Max}
                            onChange={(e) => setCustomY2Max(e.target.value)}
                            style={{ width: '70px' }}
                            size="sm"
                            placeholder={secondaryDataBounds.max.toFixed(0)}
                        />
                        <Button variant="outline-primary" onClick={handleApplySecondary}>Set</Button>
                        {(customY2Min || customY2Max) && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => { setCustomY2Min(''); setCustomY2Max(''); setCustomRange2(false); }}
                            >
                                Reset
                            </Button>
                        )}
                    </InputGroup>
                </div>
            )}

            {/* Tertiary Y-axis controls */}
            {hasTertiary && (
                <div className="d-flex align-items-center gap-2">
                    <InputGroup size="sm">
                        <InputGroup.Text>Y3</InputGroup.Text>
                        <Form.Control
                            type="number"
                            value={customY3Min}
                            onChange={(e) => setCustomY3Min(e.target.value)}
                            style={{ width: '70px' }}
                            size="sm"
                            placeholder={tertiaryDataBounds.min.toFixed(0)}
                        />
                        <InputGroup.Text>-</InputGroup.Text>
                        <Form.Control
                            type="number"
                            value={customY3Max}
                            onChange={(e) => setCustomY3Max(e.target.value)}
                            style={{ width: '70px' }}
                            size="sm"
                            placeholder={tertiaryDataBounds.max.toFixed(0)}
                        />
                        <Button variant="outline-primary" onClick={handleApplyTertiary}>Set</Button>
                        {(customY3Min || customY3Max) && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => { setCustomY3Min(''); setCustomY3Max(''); setCustomRange3(false); }}
                            >
                                Reset
                            </Button>
                        )}
                    </InputGroup>
                </div>
            )}
        </div>
    );
};

export default ChartControls;