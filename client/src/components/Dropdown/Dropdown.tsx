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

return ( <Accordion className="file-accordion">
<Accordion.Item eventKey="0">
<Accordion.Header className="accordion-header">
<div className="accordion-header-content" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}> <span className="category-name">{category}</span> <span className="min-max-inputs">
Min: <input
type="number"
value={min}
onChange={(e) => handleMinChange(e.target.value === '' ? '' : Number(e.target.value))}
style={{ width: '60px', marginRight: '8px' }}
/>
Max: <input
type="number"
value={max}
onChange={(e) => handleMaxChange(e.target.value === '' ? '' : Number(e.target.value))}
style={{ width: '60px' }}
/> </span> </div>
</Accordion.Header>
<Accordion.Body className="accordion-content"> <div className="accordion-layout">
{files.map((file, index) => (
<div
key={index}
className="file-label"
onClick={() => onFileClick?.(file)}
>
{file} </div>
))} </div>
</Accordion.Body>
</Accordion.Item> </Accordion>
);
};

export default Dropdown;
