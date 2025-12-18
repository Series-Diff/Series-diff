import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateTimePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minWidth?: number;
  openToDate?: Date | null; // <--- To musi tu być
  minDate?: Date | null;
  maxDate?: Date | null;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = "Select date",
  minWidth = 180,
  openToDate,
  minDate,
  maxDate,
}) => {

  useEffect(() => {
     // Debug helper - can be removed later
     console.log(`[DateTimePicker] ${label} - openToDate wynosi:`, openToDate, 'minDate:', minDate, 'maxDate:', maxDate);
  }, [openToDate, label, minDate, maxDate]);

  return (
    <div className="d-flex flex-column" style={{ minWidth }}>
      <label className="mb-1">{label}</label>
      <DatePicker

        key={openToDate ? openToDate.toString() : "empty"}
        
        selected={value}
        onChange={onChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={1}
        dateFormat="yyyy-MM-dd HH:mm"
        placeholderText={placeholder}
        className="form-control"
        popperPlacement="bottom-start"
        
        minDate={minDate ?? undefined}
        maxDate={maxDate ?? undefined}
        openToDate={value ? undefined : (openToDate || undefined)}         
      />
    </div>
  );
};

export default DateTimePicker;