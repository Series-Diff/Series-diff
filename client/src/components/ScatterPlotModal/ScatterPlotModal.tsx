// src/components/ScatterPlotModal/ScatterPlotModal.tsx
import React from "react";
import Plot from "react-plotly.js";
import { Modal, Button, Spinner } from "react-bootstrap";

// Definicja punktu z backendu
export interface ScatterPoint {
  x: number;
  y: number;
  time: string;
}

interface ScatterPlotModalProps {
  show: boolean;
  onHide: () => void;
  file1: string | null;
  file2: string | null;
  points: ScatterPoint[]; // Gotowe punkty zamiast surowych serii
  isLoading: boolean;     // Dodajemy stan ładowania
}

const ScatterPlotModal: React.FC<ScatterPlotModalProps> = ({
  show,
  onHide,
  file1,
  file2,
  points,
  isLoading
}) => {
  if (!file1 || !file2) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Scatter Plot: <strong>{file1}</strong> vs <strong>{file2}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ minHeight: "450px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isLoading ? (
          <div className="w-100 h-100 d-flex justify-content-center align-items-center" style={{ minHeight: "450px" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Loading aligned data...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="text-center p-5 w-100">Brak wspólnych punktów (sprawdź tolerancję).</div>
        ) : (
          <Plot
        data={[
          {
            x: points.map(p => p.x),
            y: points.map(p => p.y),
            mode: "markers",
            type: "scatter",
            marker: { size: 6, color: "blue", opacity: 0.6 },
            text: points.map(p => {
          return `${file1}: ${p.x}<br>${file2}: ${p.y}<br>Time: ${new Date(p.time).toLocaleString()}`;
            }),
            hovertemplate: "%{text}<extra></extra>",
          },
        ]}
        layout={{
          title: { text: `Correlation View (Aligned)` },
          xaxis: { title: { text: file1 } },
          yaxis: { title: { text: file2 } },
          autosize: true,
          margin: { l: 50, r: 30, b: 50, t: 50 },
        }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler={true}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ScatterPlotModal;