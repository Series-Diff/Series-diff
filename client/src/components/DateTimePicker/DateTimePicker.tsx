import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useCompactMode, getControlsPanelStyles } from '../../hooks/useCompactMode';
interface DateTimePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minWidth?: number;
  openToDate?: Date | null;
  minDate?: Date | null;
  maxDate?: Date | null;
}
const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = "DD.MM.YYYY HH:MM",
  minWidth,
  openToDate,
  minDate,
  maxDate,
}) => {
  const { isCompact } = useCompactMode();
  const styles = getControlsPanelStyles(isCompact);
  const effectiveMinWidth = minWidth ?? styles.datePickerMinWidth;
  // Regex patterns for date parsing
  const DATE_TIME_PATTERN = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2})/;
  const DATE_ONLY_PATTERN = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  useEffect(() => {
    // Re-render when these props change
  }, [value, openToDate, label, minDate, maxDate]);
  const parseAndSetDate = (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      // Empty input: reset to openToDate (date range start) if available, otherwise null
      onChange(openToDate || null);
      return true;
    }
    // Parse dd.MM.yyyy HH:mm format
    const dateTimeParts = trimmed.match(DATE_TIME_PATTERN);
    if (dateTimeParts) {
      const [, day, month, year, hours, minutes] = dateTimeParts;
      // Note: No explicit range validation (e.g., hours 0-23) needed.
      // JavaScript Date automatically normalizes invalid values:
      // - 24:00 becomes next day 00:00
      // - 32.01 becomes 01.02 of next month
      // This auto-correction is acceptable behavior for this use case.
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );

      if (!isNaN(date.getTime())) {
        onChange(date);
        return true;
      }
    }
    // Parse dd.MM.yyyy format (date only, default time to 00:00)
    const dateOnlyParts = trimmed.match(DATE_ONLY_PATTERN);
    if (dateOnlyParts) {
      const [, day, month, year] = dateOnlyParts;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        0,
        0
      );

      if (!isNaN(date.getTime())) {
        onChange(date);
        return true;
      }
    }

    return false;
  };
  const handleChange = (date: Date | null) => {
    // Always allow picker selection - it should override manual input
    onChange(date);
  };
  // Note: react-datepicker's onChangeRaw can receive KeyboardEvent, MouseEvent, or undefined.
  // Using optional parameter and explicit undefined check to handle all cases safely.
  const handleChangeRaw = (e?: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
    if (!e) return;
    // Allow typing freely; commit happens on Enter or blur
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    parseAndSetDate(e.target.value);
    // Invalid input keeps current value (prevents clearing the field)
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      if (target && target.value !== undefined) {
        if (parseAndSetDate(target.value)) {
          target.blur();
        }
      }
      // Invalid input on Enter: keeps current value
    }
  };
  return (
    <div className={`d-flex align-items-center ${styles.textClass}`} style={{ minWidth: effectiveMinWidth }}>
      <label className={`mb-0 me-2 text-nowrap ${styles.textClass}`}>{label}</label>
      <div style={{ flex: 1 }}>
        <DatePicker
          selected={value}
          onChange={handleChange}
          onChangeRaw={handleChangeRaw}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="dd.MM.yyyy HH:mm"
          placeholderText={placeholder}
          className={`form-control ${isCompact ? 'form-control-sm small' : ''}`}
          popperPlacement="bottom-start"
          minDate={minDate ?? undefined}
          maxDate={maxDate ?? undefined}
          openToDate={value ? undefined : (openToDate || undefined)}
        />
      </div>
    </div>
  );
};
export default DateTimePicker;