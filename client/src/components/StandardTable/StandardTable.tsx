import React, { useState } from "react";
import { Alert, Spinner, Card, Table, Button } from "react-bootstrap";
import { InfoCircle } from 'react-bootstrap-icons';
import MetricInfoModal from "../MetricInfoModal/MetricInfoModal";
import { getMetricDescription, hasMetricDescription, BasicMetricInfo } from "../../constants/metricsDescriptions";


interface StandardTableProps {
    data: Record<string, Record<string, number>>;
    category: string;
    metric: string;
    metricKey?: string;
    showInfoIcon?: boolean;
    customInfo?: BasicMetricInfo;
    error?: string;
    isLoading?: boolean;
    onRetry?: () => void;
}


const StandardTable: React.FC<StandardTableProps> = ({ data, category, metric, metricKey, showInfoIcon = true, customInfo, error, isLoading = false, onRetry }) => {
    const filenames = Object.keys(data);
    const [showModal, setShowModal] = useState(false);
    const metricDescription = metricKey ? getMetricDescription(metricKey) : undefined;
    const infoToShow = customInfo || metricDescription;
    const hasInfo = customInfo || (metricKey && hasMetricDescription(metricKey));
    const isAllZeroMatrix = filenames.length > 0 && filenames.every((f1) =>
        filenames.every((f2) => (data[f1]?.[f2] ?? 0) === 0)
    );

    if (isLoading) {
        return (
            <Card className="shadow-sm" id="pdf-content-metrics-vertical">
                <Card.Header className="bg-light text-center">
                    <h5 className="mb-0">{metric} Matrix ({category})</h5>
                </Card.Header>
                <Card.Body className="p-3 text-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span className="text-muted">Loading {metric}...</span>
                </Card.Body>
            </Card>
        );
    }

    if (error || isAllZeroMatrix) {
        const message = error || 'Metric data is all zeros, which indicates a calculation error.';
        return (
            <Card className="shadow-sm" id="pdf-content-metrics-vertical">
                <Card.Header className="bg-light text-center">
                    <h5 className="mb-0">{metric} Matrix ({category})</h5>
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

    if (filenames.length === 0) {
        return (
            <Alert variant="warning" className="text-center mb-0">
                No {metric} data available for <strong>{category}</strong>.
            </Alert>
        );
    }

    return (
        <>
            <Card className="shadow-sm" id="pdf-content-metrics-vertical">
                <Card.Header className="bg-light text-center position-relative">
                    <h5 className="mb-0">
                        {metric} Matrix ({category})
                    </h5>
                    {showInfoIcon && hasInfo && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowModal(true)}
                            className="p-0 position-absolute top-50 end-0 translate-middle-y me-3"
                            title="Statistics information"
                            aria-label="Show metric information"
                        >
                            <InfoCircle size={20} />
                        </Button>
                    )}
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        {/* Metric matrix table */}
                        <Table bordered className="mb-0 align-middle text-center">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">File</th>
                                    {/* Column headers with filenames */}
                                    {filenames.map((f) => (
                                        <th key={`header-${f}`} scope="col">
                                            {f}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Metric matrix rows */}
                                {filenames.map((f1) => (
                                    <tr key={`row-${f1}`}>
                                        <th scope="row" className="bg-light text-dark fw-semibold">
                                            {f1}
                                        </th>
                                        {filenames.map((f2) => {
                                            const value = data[f1]?.[f2] ?? 0;
                                            const safeValue = Number.isFinite(value) ? value : 0;
                                            const backgroundColor = `rgba(${safeValue === 0 ? "204,204,204" : "255,255,255"})`;

                                            return (
                                                <td
                                                    key={`${f1}-${f2}`}
                                                    title={safeValue.toFixed(3)} // Show exact value on hover
                                                    style={{
                                                        backgroundColor,
                                                        color: "#000",
                                                        fontWeight: f1 === f2 ? "bold" : "normal", // Wyróżnij przekątną
                                                    }}
                                                >
                                                    {safeValue.toFixed(3)}
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

export default StandardTable;