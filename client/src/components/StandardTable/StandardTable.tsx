import React from "react";
import { Alert, Spinner, Card, Table } from "react-bootstrap";

interface StandardTableProps {
    data: Record<string, Record<string, number>>; // Metric data in format: file1 -> (file2 -> value)
    category: string; // Category name
    metric: string; // Metric name
    error?: string;
    isLoading?: boolean;
}

const StandardTable: React.FC<StandardTableProps> = ({ data, category, metric, error, isLoading = false }) => {
    const filenames = Object.keys(data); // List of filenames in the category
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
                    <Alert variant="danger" className="mb-0">
                        <strong>Error calculating {metric}:</strong> {message}
                    </Alert>
                </Card.Body>
            </Card>
        );
    }

    // If no data — show message
    if (filenames.length === 0) {
        return (
            <Alert variant="warning" className="text-center mb-0">
                No {metric} data available for <strong>{category}</strong>.
            </Alert>
        );
    }

    return (
        <Card className="shadow-sm" id="pdf-content-metrics-vertical">
            <Card.Header className="bg-light text-center">
                <h5 className="mb-0">{metric} Matrix ({category})</h5>
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
    );
};

export default StandardTable;