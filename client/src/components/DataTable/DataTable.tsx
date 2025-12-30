// src/components/DataTable/DataTable.tsx
import React from 'react';
import { Dropdown } from 'react-bootstrap';

export interface DataTableProps {
  data: Record<string, any>[];
  title: string;
  rowsOptions?: number[];
  showPagination?: boolean;
}


export const DataTable: React.FC<DataTableProps> = ({ data, title, rowsOptions = [5, 10, 20, 50, 100], showPagination = true }) => {
  const [rowsNumber, setRowsNumber] = React.useState<number>(Math.min(5, Math.max(1, data.length)));

  React.useEffect(() => {
    setRowsNumber(Math.min(5, Math.max(1, data.length)));
  }, [data.length]);

  const rows = React.useMemo(() => data?.slice(0, showPagination ? rowsNumber : 5) || [], [data, rowsNumber, showPagination]);
  const columns = React.useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  const columnHeaderNames: Record<string, string> = {
    x: 'Date',
    y: 'Value'
  };

  const renderCellContent = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted">null</span>;
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'object') {
      try {
        const json = JSON.stringify(value);
        const max = 60;
        if (json.length > max) {
          return <span title={json} className="text-truncate" style={{ maxWidth: 300, display: 'inline-block', verticalAlign: 'middle' }}>{json.slice(0, max)}…</span>;
        }
        return <span title={json}>{json}</span>;
      } catch {
        return <span className="text-danger">[Object]</span>;
      }
    }
    return String(value);
  };

  const getRowKey = (entry: Record<string, any>, idx: number) => {
    if (entry && (entry as any).id !== undefined) return String((entry as any).id);
    if (entry && (entry as any).x !== undefined && (typeof (entry as any).x === 'string' || typeof (entry as any).x === 'number')) return String((entry as any).x) + '-' + idx;
    return String(idx);
  };

  return (
    <div className="w-100">
      <h3 className="mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div>No data to display</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-borderless table-hover align-middle" aria-label={`${title} data table`}>
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
                <tr key={getRowKey(entry, index)}>
                  {columns.map((col) => (
                    <td key={col} style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
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
      {showPagination && (
        <div className="mt-4 d-flex align-items-center">
          <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-rows" size="sm" className="me-2">
              {rowsNumber} rows
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {rowsOptions.map(opt => (
                <Dropdown.Item as="button" key={opt} onClick={() => setRowsNumber(opt)}>
                  {opt}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <small className="text-muted">Showing first {Math.min(rowsNumber, data.length)} rows of {data.length} total.</small>
        </div>
      )}
    </div>
  );
};