import React from "react";

interface CorrelationTableProps {
  data: Record<string, Record<string, number>>;
  category: string;
}

const CorrelationTable: React.FC<CorrelationTableProps> = ({ data, category }) => {
  const filenames = Object.keys(data);

  if (filenames.length === 0) {
    return (
      <div className="alert alert-secondary text-center" role="alert">
        No correlation data available for <strong>{category}</strong>.
      </div>
    );
  }

  return (
    <div className="card shadow-sm mt-3">
      <div className="card-header bg-light text-center">
        <h5 className="mb-0">Cross-Correlation Matrix ({category})</h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-bordered table-striped mb-0 align-middle text-center">
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
                    const colorIntensity = Math.abs(value);
                    const backgroundColor = `rgba(${
                      value > 0 ? "0,128,0" : "255,0,0"
                    }, ${colorIntensity})`;

                    return (
                      <td
                        key={`${f1}-${f2}`}
                        title={value.toFixed(3)}
                        style={{
                          backgroundColor,
                          color: "#000",
                          fontWeight: f1 === f2 ? "bold" : "normal",
                        }}
                      >
                        {value.toFixed(2)}
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
};

export default CorrelationTable;
