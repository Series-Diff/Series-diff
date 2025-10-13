import React from "react";

/**
 * Sub-component for Y-axis range controls.
 * 
 * Renders inputs and buttons for custom min/max on primary and secondary Y-axes.
 * 
 * Props:
 * - customYMin, setCustomYMin, etc.: State and setters for primary axis.
 * - customY2Min, setCustomY2Min, etc.: For secondary axis.
 * - hasSecondary: Flag to show secondary controls.
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
    hasSecondary: boolean;
}

const ChartControls: React.FC<ChartControlsProps> = ({
    customYMin,
    setCustomYMin,
    customYMax,
    setCustomYMax,
    setCustomRange,
    customY2Min,
    setCustomY2Min,
    customY2Max,
    setCustomY2Max,
    setCustomRange2,
    hasSecondary,
}) => {
    return (
        <div style={{ margin: '20px', textAlign: 'center' }}>
            <label>
                Y Min:
                <input
                    type="number"
                    value={customYMin}
                    onChange={(e) => setCustomYMin(e.target.value)}
                    style={{ margin: '0 10px', width: '40px' }}
                />
            </label>
            <label>
                Y Max:
                <input
                    type="number"
                    value={customYMax}
                    onChange={(e) => setCustomYMax(e.target.value)}
                    style={{ margin: '0 10px', width: '40px' }}
                />
            </label>
            <button onClick={() => setCustomRange(true)} className="button">Apply</button>
            <button
                className="button"
                onClick={() => {
                    setCustomYMin('');
                    setCustomYMax('');
                    setCustomRange(false);
                }}
            >
                Reset
            </button>

            {hasSecondary && (
                <div style={{ marginTop: '20px' }}>
                    <label>
                        Second Y Min:
                        <input
                            type="number"
                            value={customY2Min}
                            onChange={(e) => setCustomY2Min(e.target.value)}
                            style={{ margin: '0 10px', width: '40px' }}
                        />
                    </label>
                    <label>
                        Second Y Max:
                        <input
                            type="number"
                            value={customY2Max}
                            onChange={(e) => setCustomY2Max(e.target.value)}
                            style={{ margin: '0 10px', width: '40px' }}
                        />
                    </label>
                    <button onClick={() => setCustomRange2(true)} className="button">Apply</button>
                    <button
                        className="button"
                        onClick={() => {
                            setCustomY2Min('');
                            setCustomY2Max('');
                            setCustomRange2(false);
                        }}
                    >
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChartControls;