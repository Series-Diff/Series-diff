import React, { useState } from 'react';
import { Accordion } from 'react-bootstrap';
import './Dropdown.css';

type DropdownProps = {
category: string;
files: string[];
onFileClick?: (filename: string) => void;
onRangeChange?: (category: string, min: number | '', max: number | '') => void;
};

const Dropdown: React.FC<DropdownProps> = ({ category, files, onFileClick, onRangeChange }) => {
const [min, setMin] = useState<number | ''>('');
const [max, setMax] = useState<number | ''>('');

const handleMinChange = (value: number | '') => {
setMin(value);
onRangeChange?.(category, value, max);
};

const handleMaxChange = (value: number | '') => {
    setMax(value);
    onRangeChange?.(category, min, value);
  };

  return (
    <Accordion className="file-accordion">
      <Accordion.Item eventKey="0">
        <Accordion.Header className="accordion-header">
          <span className="category-name">{category}</span>
        </Accordion.Header>

        <Accordion.Body className="accordion-content">

          <div className="accordion-layout">
            {files.map((file, index) => (
              <div
                key={index}
                className="file-label"
                onClick={() => onFileClick?.(file)}
              >
                {file}
              </div>
            ))}
          </div>

          {/* --- MIN/MAX NA KOŃCU, OSOBNE LINIE --- */}
          <div className="min-max-inputs" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              Min:
              <input
                type="number"
                value={min}
                onChange={(e) => handleMinChange(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '80px', marginLeft: '10px' }}
              />
            </label>

            <label>
              Max:
              <input
                type="number"
                value={max}
                onChange={(e) => handleMaxChange(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '80px', marginLeft: '10px' }}
              />
            </label>
          </div>

        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default Dropdown;