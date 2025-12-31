import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  placeholder = "Select date",
  minWidth = 180,
  openToDate,
  minDate,
  maxDate,
}) => {

  useEffect(() => {
  }, [openToDate, label, minDate, maxDate]);

  return (
    <div className="d-flex align-items-center" style={{ minWidth }}>
      <label className="mb-0 me-2" style={{ whiteSpace: 'nowrap' }}>{label}</label>
      <div style={{ flex: 1 }}>
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
    </div>
  );
};

export default DateTimePicker;