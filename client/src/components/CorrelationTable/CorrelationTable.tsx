import React, { useState } from "react";
import { Alert, Spinner, Card, Table, Button } from "react-bootstrap";
import { InfoCircle } from 'react-bootstrap-icons';
import MetricInfoModal from "../MetricInfoModal/MetricInfoModal";
import { getMetricDescription, hasMetricDescription } from "../../constants/metricsDescriptions";

interface CorrelationTableProps {
  data: Record<string, Record<string, number>>;
  category: string;
  onCellClick?: (file1: string, file2: string) => void;
  clickable?: boolean;
  metric: string;
  metricKey?: string;
  showInfoIcon?: boolean;
  error?: string;
  isLoading?: boolean;
  onRetry?: () => void;
}

const CorrelationTable: React.FC<CorrelationTableProps> = ({ data, category, onCellClick, clickable = true, metric, metricKey, showInfoIcon = true, error, isLoading = false, onRetry }) => {
  const filenames = Object.keys(data);
  const [showModal, setShowModal] = useState(false);
  const metricDescription = metricKey ? getMetricDescription(metricKey) : undefined;
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
        No correlation data available for <strong>{category}</strong>.
      </Alert>
    );
  }

  return (
    <>
      <Card className="shadow-sm" id='pdf-content-metrics-vertical'>
        <Card.Header className="bg-light text-center position-relative">
          <h5 className="mb-0">
            {metric} Matrix ({category})
          </h5>
          {showInfoIcon && metricKey && hasMetricDescription(metricKey) && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowModal(true)}
              className="p-0 position-absolute top-50 end-0 translate-middle-y me-3"
              title="Metric information"
              aria-label="Show metric information"
            >
              <InfoCircle size={20} />
            </Button>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            {/* Tabela macierzy korelacji */}
            <Table bordered className="mb-0 align-middle text-center">
              <thead className="table-light">
                <tr>
                  <th scope="col">File</th>
                  {/* Nagłówki kolumn z nazwami plików */}
                  {filenames.map((f) => (
                    <th key={`header-${f}`} scope="col">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Wiersze macierzy korelacji */}
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
                          title={safeValue.toFixed(3)} // Pokazuj dokładną wartość po najechaniu
                          onClick={() => {
                            if (clickable && onCellClick) {
                              onCellClick(f1, f2);
                            }
                          }}
                          style={{
                            backgroundColor,
                            color: "#000",
                            fontWeight: f1 === f2 ? "bold" : "normal", // Wyróżnij przekątną
                            cursor: clickable ? "pointer" : "default", // Zmień kursor, jeśli klikalne
                          }}
                        >
                          {safeValue.toFixed(2)} {/* Zaokrąglona wartość korelacji */}
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

      {metricDescription && (
        <MetricInfoModal
          show={showModal}
          onHide={() => setShowModal(false)}
          metricInfo={metricDescription}
        />
      )}
    </>
  );
};

export default CorrelationTable;