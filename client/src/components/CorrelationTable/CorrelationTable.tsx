// src/components/CorrelationTable/CorrelationTable.tsx
import React, { useState } from "react";
import { Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import MetricInfoModal from "../MetricInfoModal/MetricInfoModal";
import { getMetricDescription, hasMetricDescription } from "../../constants/metricsDescriptions";

interface CorrelationTableProps {
  data: Record<string, Record<string, number>>; // Dane korelacji w formacie: plik1 -> (plik2 -> wartość)
  category: string; // Nazwa kategorii
  onCellClick?: (file1: string, file2: string) => void; // Funkcja wywoływana po kliknięciu komórki
  clickable?: boolean; // Czy komórki tabeli mają być klikalne
  metric: string; // Metric name
  metricKey?: string; // Metric key for description lookup
  showInfoIcon?: boolean; // Whether to show the info icon (default: true)
}

const CorrelationTable: React.FC<CorrelationTableProps> = ({ data, category, onCellClick, clickable = true , metric, metricKey, showInfoIcon = true}) => {
  const filenames = Object.keys(data); // Lista nazw plików z danej kategorii
  const [showModal, setShowModal] = useState(false);
  const metricDescription = metricKey ? getMetricDescription(metricKey) : undefined;

  // Jeśli brak danych — wyświetl komunikat
  if (filenames.length === 0) {
    return (
      <div className="alert alert-secondary text-center" role="alert">
        No correlation data available for <strong>{category}</strong>.
      </div>
    );
  }

  return (
    <>
      <div className="card shadow-sm" id='pdf-content-metrics-vertical'>
        <div className="card-header bg-light text-center position-relative">
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
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            {/* Tabela macierzy korelacji */}
            <table className="table table-bordered mb-0 align-middle text-center">
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
                      const colorIntensity = Math.abs(value);
                      const backgroundColor = `rgba(${value > 0 ? "0,128,0" : "255,0,0"}, ${colorIntensity})`;

                      return (
                        <td
                          key={`${f1}-${f2}`}
                          title={value.toFixed(3)} // Pokazuj dokładną wartość po najechaniu
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
                          {value.toFixed(3)} {/* Zaokrąglona wartość korelacji */}
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