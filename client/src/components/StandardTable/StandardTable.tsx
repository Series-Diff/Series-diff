import React from "react";


interface StandardTableProps {
    data: Record<string, Record<string, number>>; // Metric data in format: file1 -> (file2 -> value)
    category: string; // Category name
    metric: string; // Metric name
}


const StandardTable: React.FC<StandardTableProps> = ({data, category, metric}) => {
    const filenames = Object.keys(data); // List of filenames in the category

    // If no data — show message
    if (filenames.length === 0) {
        return (
            <div className="alert alert-secondary text-center" role="alert">
                No {metric} data available for <strong>{category}</strong>.
            </div>
        );
    }

    return (
        <div className="card shadow-sm mt-3" id="pdf-content-metrics-vertical">
            <div className="card-header bg-light text-center">
                <h5 className="mb-0">{metric} Matrix ({category})</h5>
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
                                            title={value.toFixed(3)} // Show exact value on hover
                                            style={{
                                                backgroundColor,
                                                color: "#000",
                                                fontWeight: f1 === f2 ? "bold" : "normal", // Wyróżnij przekątną
                                            }}
                                        >
                                            {value.toFixed(3)}
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
    );
}

export default StandardTable;