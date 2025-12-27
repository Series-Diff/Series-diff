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
  const [rowsNumber, setRowsNumber] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(Math.min(5, Math.max(1, data.length)));

  const totalPages = React.useMemo(() => Math.ceil((data?.length || 0) / rowsNumber), [data, rowsNumber]);
  
  const rows = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsNumber;
    const endIndex = startIndex + rowsNumber;
    return showPagination ? data?.slice(startIndex, endIndex) || [] : data || [];
  }, [data, currentPage, rowsNumber, showPagination]);
  
  const columns = React.useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  // Reset to page 1 when rows per page or data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [rowsNumber, data.length]);

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
      <div className="mt-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center">
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
          <small className="text-muted">
            Showing {data.length > 0 ? (currentPage - 1) * rowsNumber + 1 : 0} to {Math.min(currentPage * rowsNumber, data.length)} of {data.length} rows
          </small>
        </div>
        
        {totalPages > 1 && (
          <nav aria-label="Table pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  «
                </button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </button>
              </li>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and 2 pages around current
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 2) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <li className="page-item disabled">
                          <span className="page-link">…</span>
                        </li>
                      )}
                      <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(page)}
                          aria-label={`Page ${page}`}
                          aria-current={currentPage === page ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  ›
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  »
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};