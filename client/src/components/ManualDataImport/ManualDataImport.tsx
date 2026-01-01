import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

interface SimplePoint {
  x: string;
  y: number;
}

interface Props {
  show: boolean;
  onHide: () => void;
  onHideToEdit?: () => void;
  existingData: Record<string, SimplePoint[]>;
  onAddData: (newEntries: Record<string, SimplePoint[]>) => void;
}

const ManualDataImport: React.FC<Props> = ({ show, onHide, onHideToEdit, existingData, onAddData }) => {
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    Object.keys(existingData).forEach(key => {
      const group = key.split('.')[0];
      if (group) groups.add(group);
    });
    return Array.from(groups);
  }, [existingData]);

  const [date, setDate] = useState('');
  const [seriesName, setSeriesName] = useState('Actual');
  const [values, setValues] = useState<Record<string, string>>({});
  const [hasAddedData, setHasAddedData] = useState(false);

  useEffect(() => {
    if (show) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setDate(now.toISOString().slice(0, 16));
      setValues({});
      setHasAddedData(false);
    }
  }, [show]);

  const handleValueChange = (group: string, val: string) => {
    setValues(prev => ({ ...prev, [group]: val }));
  };

  const trySubmitData = (): boolean => {
    if (!date || !seriesName.trim()) return false;

    const newEntries: Record<string, SimplePoint[]> = {};
    let hasData = false;

    availableGroups.forEach(group => {
      const val = values[group];
      if (val && !isNaN(parseFloat(val))) {
        const key = `${group}.${seriesName}`;
        newEntries[key] = [{
          x: date, 
          y: parseFloat(val)
        }];
        hasData = true;
      }
    });

    if (hasData) {
      onAddData(newEntries);
      setValues({});
      return true;
    }

    return false;
  };

  const handleAddAndNext = () => {
    if (trySubmitData()) {
      setHasAddedData(true);
    }
  };

  const handleAddAndFinish = () => {
    const hasData = Object.values(values).some(v => v && !isNaN(parseFloat(v)));
    if (hasData) {
      trySubmitData();
    }
    // Zawsze zamykaj
    if (onHideToEdit) onHideToEdit();
    else onHide();
  };

  const isFormValid = date && seriesName.trim();

  return (
    <Modal show={show} onHide={onHideToEdit || onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Manual Point</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Series Name</Form.Label>
            <Form.Control
              type="text"
              value={seriesName}
              onChange={e => setSeriesName(e.target.value)}
            />
          </Form.Group>

          <hr />
          <h6>Values for groups:</h6>
          {availableGroups.length === 0 && <p className="text-muted">No loaded groups.</p>}
          {availableGroups.map(group => (
            <Form.Group as={Row} key={group} className="mb-2 align-items-center">
              <Form.Label column sm="4">{group}</Form.Label>
              <Col sm="8">
                <Form.Control
                  type="number"
                  placeholder="Value"
                  value={values[group] || ''}
                  onChange={e => handleValueChange(group, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAndNext();
                    }
                  }}
                />
              </Col>
            </Form.Group>
          ))}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {onHideToEdit && hasAddedData && (
          <Button variant="secondary" onClick={onHideToEdit}>
            Back
          </Button>
        )}
        <Button 
          variant="primary" 
          onClick={handleAddAndNext} 
          disabled={!isFormValid}
        >
          Next
        </Button>

        <Button 
          variant="success" 
          onClick={handleAddAndFinish}
        >
          Finish
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default ManualDataImport;