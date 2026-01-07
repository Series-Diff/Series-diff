// src/components/DataTable/DataTable.tsx
import React from 'react';
import { Dropdown } from 'react-bootstrap';

export interface DataTableProps {
  data: Array<Record<string, unknown>>;
  title: string;
  rowsOptions?: number[];
  showPagination?: boolean;
  showRowsPerPageDropdown?: boolean;
  showRowInfo?: boolean;
  rowsPerPage?: number;
  titleFormatter?: (title: string) => string;
  columnLabelFormatter?: (columnKey: string) => string;
  titleAlignment?: 'left' | 'center';
}


export const DataTable: React.FC<DataTableProps> = ({
  data,
  title,
  rowsOptions = [5, 10, 20, 50, 100],
  showPagination = true,
  showRowsPerPageDropdown = true,
  showRowInfo = true,
  rowsPerPage = 10,
  titleFormatter,
  columnLabelFormatter,
  titleAlignment = 'center',
}) => {
  const [rowsNumber, setRowsNumber] = React.useState<number>(rowsPerPage);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const totalPages = React.useMemo(() => Math.ceil((data?.length || 0) / rowsNumber), [data, rowsNumber]);
  
  const rows = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsNumber;
    const endIndex = startIndex + rowsNumber;
    return showPagination ? data?.slice(startIndex, endIndex) || [] : data?.slice(0, rowsNumber) || [];
  }, [data, currentPage, rowsNumber, showPagination]);
  
  const columns = React.useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  // Reset to page 1 when rows per page or data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [rowsNumber, data]);

  const columnHeaderNames: Record<string, string> = {
    x: 'Date',
    y: 'Value'
  };

  const renderCellContent = (value: unknown): React.ReactNode => {
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

  const getRowKey = (entry: Record<string, unknown>, idx: number): string => {
    if (entry && 'id' in entry && entry.id !== undefined) return String(entry.id);
    if (entry && 'x' in entry && entry.x !== undefined && (typeof entry.x === 'string' || typeof entry.x === 'number')) return String(entry.x) + '-' + idx;
    return String(idx);
  };

  const formatColumnLabel = (col: string) => {
    if (columnLabelFormatter) return columnLabelFormatter(col);
    return columnHeaderNames[col] || col;
  };

  const formatTitle = titleFormatter ? titleFormatter(title) : title;

  return (
    <div className="d-flex flex-column gap-3 h-100">
      {/* Header */}
      <div className={`d-flex align-items-center ${titleAlignment === 'left' ? 'justify-content-start' : 'justify-content-center'}`}>
        <h3 className={`mb-0 ${titleAlignment === 'left' ? '' : 'text-center'}`}>{formatTitle}</h3>
      </div>

      {/* Body - Table with horizontal scroll */}
      {rows.length === 0 ? (
        <div className="d-flex align-items-center justify-content-center flex-grow-1">
          <p className="text-muted mb-0">No data to display</p>
        </div>
      ) : (
        <div className="flex-grow-1 overflow-auto">
          <table className="table table-borderless table-hover align-middle mb-0" aria-label={`${formatTitle} data table`}>
            <thead className="table-light sticky-top">
              <tr>
                {columns.map((col) => (
                  <th key={col} scope="col" className="text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                    {formatColumnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr key={getRowKey(entry, index)}>
                  {columns.map((col) => (
                    <td key={col} className="text-nowrap" style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                      {renderCellContent(entry[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer - Pagination controls */}
      {showPagination && rows.length > 0 && (
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 border-top pt-3">
        <div className="d-flex align-items-center gap-2">
          {showRowsPerPageDropdown && (
          <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-rows" size="sm">
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
          )}
          {showRowInfo && (
          <small className="text-muted">
            Showing {data.length > 0 ? (currentPage - 1) * rowsNumber + 1 : 0} to {Math.min(currentPage * rowsNumber, data.length)} of {data.length} rows
          </small>
          )}
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
      )}
    </div>
  );
};