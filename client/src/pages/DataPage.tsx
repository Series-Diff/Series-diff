// src/pages/DataPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchTimeSeriesData, TimeSeriesResponse } from '../services/fetchTimeSeries';
import { DataTable } from '../components/DataTable/DataTable';

const DataPage: React.FC = () => {
  const [chartData, setChartData] = useState<TimeSeriesResponse>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
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

  // Wyciągnij unikalne nazwy plików
  const uniqueFiles = Array.from(
    new Set(
      Object.keys(chartData).map(name => name.split('.')[1])
    )
  ).filter(Boolean);

  return (
    <div className="h-100 px-0">
      {error && <p className="text-danger text-center">Error: {error}</p>}
      <div
        className="row g-3 h-100 mx-0"
        style={{
          minHeight: "calc(100vh - var(--nav-height) - 2 * var(--section-margin))"
        }}>
        {/* Lewa część - lista plików */}
        <div className="col-3 px-2">
          <div className="section-container d-flex flex-column h-100">
            <h3 className="mb-3">Available Files</h3>
            {uniqueFiles.length === 0 && !error ? (
              <div className="d-flex align-items-center justify-content-center flex-grow-1">
                <p className="text-center text-muted">Loading data...</p>
              </div>
            ) : (
              <div className="list-group flex-grow-1" style={{ overflow: "auto" }}>
                {uniqueFiles.map(file => (
                  <button key={file} onClick={() => setSelectedTable(file)} className={`list-group-item list-group-item-action ${selectedTable === file ? "active" : ""}`}>
                    {file}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prawa część - DataTable */}
        <div className="col-9 px-2">
          <div className="section-container d-flex flex-column h-100">
            {selectedTable ? (
              <DataTable data={selectedData} title={selectedTable} />
            ) : (
              <div className="d-flex align-items-center justify-content-center flex-grow-1">
                <div className="text-center text-muted">
                  <i className="bi bi-file-earmark-text display-1 mb-3"></i>
                  <p>No file selected.</p>
                  <small>Select a file from the list to view its data</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPage;