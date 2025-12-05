// src/components/CorrelationTable/CorrelationTable.tsx
import React from "react";

interface CorrelationTableProps {
  data: Record<string, Record<string, number>>; // Dane korelacji w formacie: plik1 -> (plik2 -> wartość)
  category: string; // Nazwa kategorii
  onCellClick?: (file1: string, file2: string) => void; // Funkcja wywoływana po kliknięciu komórki
  clickable?: boolean; // Czy komórki tabeli mają być klikalne
  metric: string; // Metric name
}

const CorrelationTable: React.FC<CorrelationTableProps> = ({ data, category, onCellClick, clickable = true , metric}) => {
  const filenames = Object.keys(data); // Lista nazw plików z danej kategorii

  // Jeśli brak danych — wyświetl komunikat
  if (filenames.length === 0) {
    return (
      <div className="alert alert-secondary text-center" role="alert">
        No correlation data available for <strong>{category}</strong>.
      </div>
    );
  }

  return (
    <div className="card shadow-sm mt-3" id='pdf-content-metrics-vertical'>
      <div className="card-header bg-light text-center">
        <h5 className="mb-0">{metric} Matrix ({category})</h5>
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
                        {value.toFixed(2)} {/* Zaokrąglona wartość korelacji */}
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