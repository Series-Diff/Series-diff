import React, { useState } from "react";
import { Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import MetricInfoModal from "../MetricInfoModal/MetricInfoModal";
import { getMetricDescription, hasMetricDescription } from "../../constants/metricsDescriptions";


interface StandardTableProps {
    data: Record<string, Record<string, number>>; // Metric data in format: file1 -> (file2 -> value)
    category: string; // Category name
    metric: string; // Metric name
    metricKey?: string; // Metric key for description lookup
    showInfoIcon?: boolean; // Whether to show the info icon (default: true)
    customInfo?: { name: string; description: string; }; // Custom info for plugins
}


const StandardTable: React.FC<StandardTableProps> = ({data, category, metric, metricKey, showInfoIcon = true, customInfo}) => {
    const filenames = Object.keys(data); // List of filenames in the category
    const [showModal, setShowModal] = useState(false);
    const metricDescription = metricKey ? getMetricDescription(metricKey) : undefined;
    
    // Use customInfo for plugins or metricDescription for standard metrics
    const infoToShow = customInfo || metricDescription;
    const hasInfo = customInfo || (metricKey && hasMetricDescription(metricKey));

    // If no data — show message
    if (filenames.length === 0) {
        return (
            <div className="alert alert-secondary text-center" role="alert">
                No {metric} data available for <strong>{category}</strong>.
            </div>
        );
    }

    return (
        <>
            <div className="card shadow-sm" id="pdf-content-metrics-vertical">
                <div className="card-header bg-light text-center position-relative">
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
                        >
                        <InfoCircle size={20} />
                        </Button>
                    )}
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        {/* Metric matrix table */}
                        <table className="table table-bordered mb-0 align-middle text-center">
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
                                        const backgroundColor = `rgba(${value === 0 ? "204,204,204" : "255,255,255"})`;

                                        return (
                                            <td
                                                key={`${f1}-${f2}`}
                                                title={typeof value === 'number' ? value.toFixed(3) : String(value)}// Show exact value on hover
                                                style={{
                                                    backgroundColor,
                                                    color: "#000",
                                                    fontWeight: f1 === f2 ? "bold" : "normal", // Wyróżnij przekątną
                                                }}
                                            >
                                                {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {infoToShow && (
                <MetricInfoModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    metricInfo={infoToShow}
                />
            )}
        </>
    );
}

export default StandardTable;