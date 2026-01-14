import React, { useState } from "react";
import { Alert, Spinner, Card, Table, Button } from "react-bootstrap";
import { InfoCircle } from 'react-bootstrap-icons';
import MetricInfoModal from "../MetricInfoModal/MetricInfoModal";
import { getMetricDescription, hasMetricDescription, BasicMetricInfo } from "../../constants/metricsDescriptions";

/**
 * Color mode for matrix cells
 * - 'correlation': Green for positive, red for negative, intensity based on absolute value
 * - 'standard': Gray for zero, white for non-zero values
 */
type ColorMode = 'correlation' | 'standard';

interface MetricMatrixProps {
    data: Record<string, Record<string, number>>;
    category: string;
    metric: string;
    metricKey?: string;
    customInfo?: BasicMetricInfo;
    showInfoIcon?: boolean;
    error?: string;
    isLoading?: boolean;
    onRetry?: () => void;
    onCellClick?: (file1: string, file2: string) => void;
    clickable?: boolean;
    colorMode?: ColorMode;
    valuePrecision?: number;
}

/**
 * Get cell background color based on color mode and value
 */
const getCellBackgroundColor = (value: number, colorMode: ColorMode): string => {
    if (colorMode === 'correlation') {
        const intensity = Math.abs(value);
        return `rgba(${value >= 0 ? "0,128,0" : "255,0,0"}, ${intensity})`;
    }
    // Standard mode: gray for zero, white for non-zero
    return value === 0 ? 'var(--bs-secondary-bg)' : 'var(--bs-white)';
};

/**
 * Unified matrix component for displaying metric/correlation data
 * Supports both standard metrics (MAE, RMSE, DTW, etc.) and correlation metrics (Pearson, Cosine)
 */
const MetricMatrix: React.FC<MetricMatrixProps> = ({
    data,
    category,
    metric,
    metricKey,
    customInfo,
    showInfoIcon = true,
    error,
    isLoading = false,
    onRetry,
    onCellClick,
    clickable = false,
    colorMode = 'standard',
    valuePrecision = 3,
}) => {
    const filenames = Object.keys(data);
    const [showModal, setShowModal] = useState(false);
    
    const metricDescription = metricKey ? getMetricDescription(metricKey) : undefined;
    const infoToShow = customInfo || metricDescription;
    const hasInfo = customInfo || (metricKey && hasMetricDescription(metricKey));
    
    const isAllZeroMatrix = filenames.length > 0 && filenames.every((f1) =>
        filenames.every((f2) => (data[f1]?.[f2] ?? 0) === 0)
    );

    const headerTitle = `${metric} Matrix (${category})`;

    // Loading state
    if (isLoading) {
        return (
            <Card className="shadow-sm" id="pdf-content-metrics-vertical" data-component="MetricMatrix">
                <Card.Header className="bg-light text-center">
                    <h5 className="mb-0">{headerTitle}</h5>
                </Card.Header>
                <Card.Body className="p-3 text-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span className="text-muted">Loading {metric}...</span>
                </Card.Body>
            </Card>
        );
    }

    // Error state (including all-zero matrix which indicates calculation error)
    if (error || isAllZeroMatrix) {
        const message = error || `${metric} data is all zeros, which indicates a calculation error.`;
        return (
            <Card className="shadow-sm" id="pdf-content-metrics-vertical" data-component="MetricMatrix">
                <Card.Header className="bg-light text-center">
                    <h5 className="mb-0">{headerTitle}</h5>
                </Card.Header>
                <Card.Body className="p-3">
                    <Alert variant="danger" className="mb-0 d-flex align-items-center justify-content-center text-center">
                        <div className="d-flex flex-column flex-sm-row align-items-center gap-2">
                            <span><strong>Error calculating {metric}:</strong> {message}</span>
                            {onRetry && error && (
                                <Button variant="outline-danger" size="sm" onClick={onRetry} className="flex-shrink-0">
                                    Retry
                                </Button>
                            )}
                        </div>
                    </Alert>
                </Card.Body>
            </Card>
        );
    }

    // Empty data state
    if (filenames.length === 0) {
        return (
            <Alert variant="warning" className="text-center mb-0" data-component="MetricMatrix">
                No {metric} data available for <strong>{category}</strong>.
            </Alert>
        );
    }

    // Normal state - render matrix table
    return (
        <>
            <Card className="shadow-sm" id="pdf-content-metrics-vertical" data-component="MetricMatrix">
                <Card.Header className="bg-light text-center position-relative">
                    <h5 className="mb-0">{headerTitle}</h5>
                    {showInfoIcon && hasInfo && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowModal(true)}
                            className="p-0 position-absolute top-50 end-0 translate-middle-y me-3"
                            title={`${metric} information`}
                            aria-label={`Show ${metric} information`}
                        >
                            <InfoCircle size={20} />
                        </Button>
                    )}
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table bordered className="mb-0 align-middle text-center">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">File</th>
                                    {filenames.map((f) => (
                                        <th key={`header-${f}`} scope="col">
                                            {f}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filenames.map((f1) => (
                                    <tr key={`row-${f1}`}>
                                        <th scope="row" className="bg-light text-dark fw-semibold">
                                            {f1}
                                        </th>
                                        {filenames.map((f2) => {
                                            const value = data[f1]?.[f2] ?? 0;
                                            const safeValue = Number.isFinite(value) ? value : 0;
                                            const backgroundColor = getCellBackgroundColor(safeValue, colorMode);
                                            const isDiagonal = f1 === f2;
                                            const isClickable = clickable && onCellClick;

                                            return (
                                                <td
                                                    key={`${f1}-${f2}`}
                                                    title={safeValue.toFixed(valuePrecision)}
                                                    onClick={() => {
                                                        if (isClickable) {
                                                            onCellClick(f1, f2);
                                                        }
                                                    }}
                                                    style={{
                                                        backgroundColor,
                                                        color: "#000",
                                                        fontWeight: isDiagonal ? "bold" : "normal",
                                                        cursor: isClickable ? "pointer" : "default",
                                                    }}
                                                >
                                                    {safeValue.toFixed(valuePrecision)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {infoToShow && (
                <MetricInfoModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    metricInfo={infoToShow}
                />
            )}
        </>
    );
};

export default MetricMatrix;
