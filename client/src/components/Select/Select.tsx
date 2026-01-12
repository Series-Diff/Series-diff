import React from 'react';
import { Form } from 'react-bootstrap';
import { useCompactMode, getSelectStyles } from '../../hooks/useCompactMode';


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
  const { isCompact } = useCompactMode();
  const styles = getSelectStyles(isCompact);

  const selectElement = (
    <Form.Select
      id={id}
      aria-label={ariaLabel || label || `Select ${id.replace(/-/g, ' ')}`}
      size={styles.size}
      style={{ width: styles.width }}
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
      <div className={`d-flex flex-column align-items-center ${styles.textClass}`}>
        <Form.Label htmlFor={id} className={`${styles.labelMargin} ${styles.labelClass}`}>{label}</Form.Label>
        {selectElement}
      </div>
    );
  }

  return selectElement;
};

export default Select;
