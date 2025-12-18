import React from 'react';
import { Form } from 'react-bootstrap';

type SelectProps = {
  id: string;
  label?: string;
  selected: string;
  categories: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabledCategory?: string;
  allowNoneOption?: boolean;
  ariaLabel?: string;
};

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  selected,
  categories,
  onChange,
  disabledCategory,
  allowNoneOption = false,
  ariaLabel,
}) => {
  const selectElement = (
    <Form.Select
      id={id}
      aria-label={ariaLabel || label || `Select ${id.replace(/-/g, ' ')}`}
      style={{ width: '224px' }}
      value={selected}
      onChange={onChange}
    >
      {allowNoneOption && <option value="">-- None --</option>}
      {categories.map((cat) => (
        <option key={cat} value={cat} disabled={cat === disabledCategory}>
          {cat}
        </option>
      ))}
    </Form.Select>
  );

  if (label) {
    return (
      <div className="d-flex flex-column align-items-center">
        <Form.Label htmlFor={id} className="mb-2">{label}</Form.Label>
        {selectElement}
      </div>
    );
  }

  return selectElement;
};

export default Select;