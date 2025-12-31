// src/components/CorrelationTable/CorrelationTable.tsx
import React from "react";
import { Alert, Spinner, Card, Table } from "react-bootstrap";

interface CorrelationTableProps {
  data: Record<string, Record<string, number>>; // Dane korelacji w formacie: plik1 -> (plik2 -> wartość)
  category: string; // Nazwa kategorii
  onCellClick?: (file1: string, file2: string) => void; // Funkcja wywoływana po kliknięciu komórki
  clickable?: boolean; // Czy komórki tabeli mają być klikalne
  metric: string; // Metric name
  error?: string;
  isLoading?: boolean;
}

const CorrelationTable: React.FC<CorrelationTableProps> = ({ data, category, onCellClick, clickable = true, metric, error, isLoading = false }) => {
  const filenames = Object.keys(data); // Lista nazw plików z danej kategorii
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
    const message = error || 'Correlation data is all zeros, which indicates a calculation error.';
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

  // Jeśli brak danych — wyświetl komunikat
  if (filenames.length === 0) {
    return (
      <Alert variant="warning" className="text-center mb-0">
        No correlation data available for <strong>{category}</strong>.
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
                    const colorIntensity = Math.abs(safeValue);
                    const backgroundColor = `rgba(${safeValue > 0 ? "0,128,0" : "255,0,0"}, ${colorIntensity})`;

                    return (
                      <td
                        key={`${f1}-${f2}`}
                        title={safeValue.toFixed(3)}
                        onClick={() => {
                          if (clickable && onCellClick) {
                            onCellClick(f1, f2);
                          }
                        }}
                        style={{
                          backgroundColor,
                          color: "#000",
                          fontWeight: f1 === f2 ? "bold" : "normal",
                          cursor: clickable ? "pointer" : "default",
                        }}
                      >
                        {safeValue.toFixed(2)}
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

export default CorrelationTable;