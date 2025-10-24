// src/components/ScatterPlotModal/ScatterPlotModal.tsx
import React from "react";
import Plot from "react-plotly.js";
import { Modal, Button } from "react-bootstrap";
import { TimeSeriesEntry } from "../../services/fetchTimeSeries";

interface ScatterPlotModalProps {
  show: boolean;                // Czy modal ma być widoczny
  onHide: () => void;           // Funkcja zamykająca modal
  file1: string | null;         // Nazwa pierwszego pliku
  file2: string | null;         // Nazwa drugiego pliku
  data1?: TimeSeriesEntry[];    // Dane pierwszej serii czasowej
  data2?: TimeSeriesEntry[];    // Dane drugiej serii czasowej
}

const ScatterPlotModal: React.FC<ScatterPlotModalProps> = ({
  show,
  onHide,
  file1,
  file2,
  data1,
  data2,
}) => {

  // Jeśli brak danych lub nazw plików – nie renderuj komponentu
  if (!data1 || !data2 || !file1 || !file2) return null;

  // Dopasowanie długości serii (na wypadek gdyby różniły się ilością próbek)
  const minLength = Math.min(data1.length, data2.length);
  const x = data1.slice(0, minLength).map((d) => d.y);
  const y = data2.slice(0, minLength).map((d) => d.y);


  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Scatter Plot: <strong>{file1}</strong> vs <strong>{file2}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Wykres rozrzutu utworzony przy pomocy Plotly */}
        <Plot
          data={[
            {
              x,
              y,
              mode: "markers",
              type: "scatter",
              marker: { size: 6, color: "blue" },
            },
          ]}
          layout={{
            title: `Scatter plot: ${file1} vs ${file2}`,
            xaxis: { title: file1 },
            yaxis: { title: file2 },
            autosize: true,
          }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler={true}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ScatterPlotModal;
