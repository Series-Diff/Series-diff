import React from "react";
import { Form, Button } from 'react-bootstrap';

/**
 * Sub-component for Y-axis range controls.
 * Renders inputs and buttons for custom min/max on primary and secondary Y-axes using React-Bootstrap for consistent styling.
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
    customYMin, setCustomYMin, customYMax, setCustomYMax, setCustomRange, customY2Min, setCustomY2Min,
    customY2Max, setCustomY2Max, setCustomRange2, hasSecondary,
}) => {
    return (
        <div className="text-center mt-4">
            <Form className="d-flex justify-content-center align-items-center mb-3">
                <Form.Label className="me-2 m-0 text-center">Y Min:</Form.Label>
                <Form.Control type="number" value={customYMin} onChange={(e) => setCustomYMin(e.target.value)} className="me-2" style={{ width: '60px' }} />
                <Form.Label className="me-2 m-0 text-center">Y Max:</Form.Label>
                <Form.Control type="number" value={customYMax} onChange={(e) => setCustomYMax(e.target.value)} className="me-2" style={{ width: '60px' }} />
                <Button variant="primary" onClick={() => setCustomRange(true)} className="me-2">Apply</Button>
                <Button variant="secondary" onClick={() => { setCustomYMin(''); setCustomYMax(''); setCustomRange(false); }}>Reset</Button>
            </Form>

            {hasSecondary && (
                <Form className="d-flex justify-content-center align-items-center mb-3">
                    <Form.Label className="me-2 m-0 text-center">Second Y Min:</Form.Label>
                    <Form.Control type="number" value={customY2Min} onChange={(e) => setCustomY2Min(e.target.value)} className="me-2" style={{ width: '60px' }} />
                    <Form.Label className="me-2 m-0 text-center">Second Y Max:</Form.Label>
                    <Form.Control type="number" value={customY2Max} onChange={(e) => setCustomY2Max(e.target.value)} className="me-2" style={{ width: '60px' }} />
                    <Button variant="primary" onClick={() => setCustomRange2(true)} className="me-2">Apply</Button>
                    <Button variant="secondary" onClick={() => { setCustomY2Min(''); setCustomY2Max(''); setCustomRange2(false); }}>Reset</Button>
                </Form>
            )}
        </div>
    );
};

export default ChartControls;