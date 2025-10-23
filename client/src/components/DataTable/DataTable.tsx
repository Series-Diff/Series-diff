// src/components/DataTable/DataTable.tsx
import React from 'react';
import { Dropdown } from 'react-bootstrap';

export interface DataTableProps {
  data: Record<string, any>[];
  title: string;
}


export const DataTable: React.FC<DataTableProps> = ({ data, title }) => {
  const [rowsNumber, setRowsNumber] = React.useState<number>(10);
  const rows = data?.slice(0, rowsNumber) || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const columnHeaderNames: Record<string, string> = {
    x: 'Date',
    y: 'Value'
  };

  const renderCellContent = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted">null</span>;
    }
    // Jeśli to obiekt (ale nie null), pokaż placeholder
    if (typeof value === 'object') {
      return Array.isArray(value) ? <span className="text-danger">[Array]</span> : <span className="text-danger">[Object]</span>;
    }
    // Jeśli wartość jest booleanem, przekonwertuj na string
    if (typeof value === 'boolean') {
        return value.toString();
    }
    // W przeciwnym razie zwróć wartość jako string
    return value;
  };


  return (
    <div className="w-100">
      <h3 className="mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div>No data to display</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-borderless table-hover align-middle">
            <thead className="table-light">
              <tr>
                {columns.map((col) => (
                  <th key={col} scope="col">
                    {columnHeaderNames[col] || col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr key={index}>
                  {columns.map((col) => (
                    <td key={col}>
                      {renderCellContent((entry as any)[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination controls */}
      <div className="mt-4">
        <Dropdown>
          <Dropdown.Toggle variant="light" id="dropdown-basic" size="sm" className="me-2">
            {rowsNumber} rows
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item href="#" onClick={() => setRowsNumber(10)}>
              10
            </Dropdown.Item>
            <Dropdown.Item href="#" onClick={() => setRowsNumber(20)}>
              20
            </Dropdown.Item>
            <Dropdown.Item href="#" onClick={() => setRowsNumber(50)}>
              50
            </Dropdown.Item>
            <Dropdown.Item href="#" onClick={() => setRowsNumber(100)}>
              100
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        <small className="text-muted">Showing first {rowsNumber} rows of {data.length} total.</small>
      </div>
    </div>
  );
};