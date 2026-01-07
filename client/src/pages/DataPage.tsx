// src/pages/DataPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchTimeSeriesData, TimeSeriesResponse } from '../services/fetchTimeSeries';
import { DataTable } from '../components/DataTable/DataTable';
import { Container, Col } from 'react-bootstrap';

type MetaEntry = {
  originalFilename: string;
  columnMappings: Record<string, string>;
};

const DataPage: React.FC = () => {
  const [chartData, setChartData] = useState<TimeSeriesResponse>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const allSeries = await fetchTimeSeriesData();
      setChartData(allSeries);

      // Automatycznie wybierz pierwszy plik
      const firstFile = Object.keys(allSeries)
        .map(name => name.split('.')[1])
        .filter((value, index, self) => value && self.indexOf(value) === index)[0];

      if (firstFile) {
        setSelectedTable(firstFile);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  type TransformedEntry = {
    x: string;
    [groupName: string]: string | number;
  };

  const transformDataForTable = (
    chartData: TimeSeriesResponse,
    file: string
  ): TransformedEntry[] => {
    const merged: Record<string, TransformedEntry> = {};

    Object.entries(chartData).forEach(([seriesKey, entries]) => {
      const [group, seriesFile] = seriesKey.split('.');

      if (seriesFile !== file) return;

      entries.forEach(entry => {
        if (!merged[entry.x]) {
          merged[entry.x] = { x: entry.x };
        }
        merged[entry.x][group] = entry.y;
      });
    });

    return Object.values(merged).sort(
      (a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()
    );
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedData = selectedTable
    ? transformDataForTable(chartData, selectedTable)
    : [];

  const metadata: Record<string, MetaEntry> = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('timeseries_meta');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to read timeseries metadata:', e);
      return {};
    }
  }, []);

  const hasData = Object.keys(chartData).length > 0;

  // Wyciągnij unikalne nazwy plików
  const uniqueFiles = Array.from(
    new Set(
      Object.keys(chartData).map(name => name.split('.')[1])
    )
  ).filter(Boolean);

  return (
    <Container fluid className="d-flex flex-grow-1 gap-3 h-100 p-0">
      {/* Lewa część - lista plików (sidebar) */}
      <Col xs="auto" style={{ width: "280px", minWidth: "280px" }}>
        <div className="section-container d-flex flex-column gap-3" style={{ height: "calc(100vh - var(--nav-height) - 2 * var(--section-margin))" }}>
          <h3 className="mb-0 text-center">Available Files</h3>
          {error && <p className="text-danger text-center mb-0">Error: {error}</p>}
          {isLoading ? (
            <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted gap-2">
              <div className="spinner-border spinner-border-sm" role="status" aria-label="Loading files" />
              <span>Loading data...</span>
            </div>
          ) : uniqueFiles.length === 0 && !error ? (
            <div className="d-flex align-items-center justify-content-center flex-grow-1">
              <p className="text-center text-muted mb-0">No data loaded.</p>
            </div>
          ) : (
            <div className="list-group flex-grow-1 overflow-auto">
              {uniqueFiles.map(file => (
                <button
                  key={file}
                  onClick={() => setSelectedTable(file)}
                  className={`list-group-item list-group-item-action text-truncate ${selectedTable === file ? "active" : ""}`}
                  title={file}
                >
                  {file}
                </button>
              ))}
            </div>
          )}
        </div>
      </Col>

      {/* Prawa część - DataTable */}
      <Col className="section-container d-flex flex-column gap-3 w-100 overflow-hidden" style={{ height: "calc(100vh - var(--nav-height) - 2 * var(--section-margin))" }}>
        {isLoading && (
          <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted gap-2">
            <div className="spinner-border spinner-border-sm" role="status" aria-label="Loading data" />
            <span>Loading data...</span>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="d-flex align-items-center justify-content-center flex-grow-1 text-center text-muted">
            <div>
              <i className="bi bi-database display-1"></i>
              <p className="mb-1">No data loaded.</p>
              <small>Upload or fetch data to view tables.</small>
            </div>
          </div>
        )}

        {!isLoading && hasData && !selectedTable && (
          <div className="d-flex align-items-center justify-content-center flex-grow-1 text-center text-muted">
            <div>
              <i className="bi bi-file-earmark-text display-1"></i>
              <p className="mb-1">No file selected.</p>
              <small>Select a file from the list to view its data.</small>
            </div>
          </div>
        )}

        {!isLoading && hasData && selectedTable && (
          <DataTable
            data={selectedData}
            title={selectedTable}
            titleFormatter={(t) => {
              const original = metadata[t]?.originalFilename || `${t}.csv`;
              return `${t} (${original})`;
            }}
            columnLabelFormatter={(col) => {
              if (col === 'x') {
                const originalDateCol = metadata[selectedTable]?.columnMappings?.['Date'];
                if (originalDateCol && originalDateCol !== 'Date') {
                  return `Date (${originalDateCol})`;
                }
                return 'Date';
              }
              const originalCol = metadata[selectedTable]?.columnMappings?.[col];
              if (originalCol && originalCol !== col) {
                return `${col} (${originalCol})`;
              }
              return col;
            }}
          />
        )}
      </Col>
    </Container>
  );
};

export default DataPage;