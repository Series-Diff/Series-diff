import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import type { TimeSeriesEntry } from '../../services/fetchTimeSeries';

interface SimplePoint {
  x: string;
  y: number;
}

interface Props {
  show: boolean;
  onHide: () => void;
  manualData: Record<string, TimeSeriesEntry[]>;
  chartData: Record<string, any[]>;
  onAddManualData: (newEntries: Record<string, SimplePoint[]>) => void;
  onUpdatePoint: (seriesKey: string, timestamp: string, newValue: number, idx: number) => void;
  onRemoveTimestamp: (fileId: string, timestamp: string, rowIdx: number) => void;
  onRemoveGroup: (fileId: string) => void;
  onClearAll: () => void;
  onOpenImport: () => void;
}

const ManualDataEdit: React.FC<Props> = ({
  show,
  onHide,
  manualData,
  onUpdatePoint,
  onRemoveTimestamp,
  onRemoveGroup,
  onClearAll,
  onOpenImport
}) => {
  const groups: Record<string, string[]> = {};
  Object.keys(manualData).forEach(key => {
    const fileId = key.split('.')[1] ?? key;
    if (!groups[fileId]) groups[fileId] = [];
    groups[fileId].push(key);
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Manual Measurements</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Button
              variant="outline-primary"
              size="sm"
              className="me-2"
              onClick={onOpenImport}
            >
              Add Manual Point
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onClearAll}
            >
              Remove all
            </Button>
          </div>
        </div>

        {Object.entries(groups).map(([fileId, seriesKeys]) => (
          <div key={fileId} className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6>{fileId}</h6>
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => onRemoveGroup(fileId)}
              >
                Remove series
              </Button>
            </div>

            <div className="table-responsive">
              <table className="table table-borderless table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Timestamp</th>
                    {seriesKeys.map(sk => (
                      <th key={sk}>{sk.split('.')[0] ?? sk}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                {Array.from(
                  new Set(seriesKeys.flatMap(k => manualData[k].map(p => p.x)))
                )
                  .sort()
                  .map(ts => {
                    const maxPoints = Math.max(
                      ...seriesKeys.map(sk => manualData[sk].filter(p => p.x === ts).length)
                    );

                    return Array.from({ length: maxPoints }).map((_, rowIdx) => (
                      <tr key={`${ts}-${rowIdx}`}>
                        <td>{ts}</td>
                        {seriesKeys.map(sk => {
                          const pts = manualData[sk].filter(p => p.x === ts);
                          const pt = pts[rowIdx];
                          return (
                            <td key={sk}>
                              {pt ? (
                                <input
                                  type="number"
                                  value={pt.y}
                                  onChange={e =>
                                    onUpdatePoint(
                                      sk,
                                      ts,
                                      Number(e.target.value),
                                      rowIdx
                                    )
                                  }
                                  className="form-control form-control-sm"
                                  style={{ width: '100px' }}
                                />
                              ) : (
                                '-'
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() =>
                              onRemoveTimestamp(fileId, ts, rowIdx)
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ));
                  })}
              </tbody>
            </table>
            </div>
          </div>
        ))}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManualDataEdit;
