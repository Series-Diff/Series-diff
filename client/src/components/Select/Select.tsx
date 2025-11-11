import React from 'react';
import { Form } from 'react-bootstrap';


type SelectProps = {
  id: string;
  label: string;
  selected: string;
  categories: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabledCategory?: string;
  allowNoneOption?: boolean;
};

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  selected,
  categories,
  onChange,
  disabledCategory,
  allowNoneOption = false,
}) => {
  return (
    <div className="d-flex flex-column align-items-center mb-3">
      <Form.Label htmlFor={id} className="mb-2">{label}</Form.Label>
      <Form.Select
        id={id}
        aria-label={label}
        style={{width: '224px'}}
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
    </div>
  );
};

export default Select;
