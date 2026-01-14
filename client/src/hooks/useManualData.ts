import { useState, useEffect } from 'react';
import { TimeSeriesEntry } from '../services/fetchTimeSeries';

const STORAGE_KEY = 'manual_chart_data';

export const useManualData = () => {
  const [manualData, setManualData] = useState<Record<string, TimeSeriesEntry[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading manual data:", error);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualData));
  }, [manualData]);

  const addManualData = (newEntries: Record<string, any[]>) => {
    setManualData(prev => {
      const updated = { ...prev };
      Object.keys(newEntries).forEach(key => {
        const existingPoints = updated[key] || [];
        updated[key] = [...existingPoints, ...newEntries[key]].sort((a, b) => 
          new Date(a.x).getTime() - new Date(b.x).getTime()
        );
      });
      return updated;
    });
  };

  const clearManualData = () => {
    setManualData({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeByFileId = (fileId: string) => {
    setManualData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if ((key.split('.')[1] ?? key) === fileId) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  const removeTimestampFromGroup = (fileId: string, timestamp: string, rowIdx?: number) => {
    setManualData(prev => {
      const updated: Record<string, TimeSeriesEntry[]> = { ...prev };
      
      Object.keys(prev).forEach(key => {
        if ((key.split('.')[1] ?? key) === fileId) {
          let series = [...(prev[key] || [])];

          if (rowIdx !== undefined) {
            const pointsWithTimestamp = series.filter(p => p.x === timestamp);
            
            if (rowIdx < pointsWithTimestamp.length) {
              let matchCount = -1;
              const indexToRemove = series.findIndex(p => {
                if (p.x === timestamp) {
                  matchCount++;
                  return matchCount === rowIdx;
                }
                return false;
              });

              if (indexToRemove !== -1) {
                series.splice(indexToRemove, 1);
              }
            }
          } else {
            series = series.filter(p => p.x !== timestamp);
          }

          if (series.length > 0) updated[key] = series;
          else delete updated[key];
        }
      });
      
      return updated;
    });
  };

const updateManualPoint = (
  seriesKey: string,
  timestamp: string,
  newValue: number,
  idx: number
) => {
  setManualData(prev => {
    const series = prev[seriesKey];
    if (!series) return prev;
    if (idx < 0 || idx >= series.length) return prev;

    return {
      ...prev,
      [seriesKey]: series.map((point, i) =>
        i === idx ? { ...point, y: newValue } : point
      ),
    };
  });
};


  return {
    manualData,
    addManualData,
    clearManualData,
    removeByFileId,
    removeTimestampFromGroup,
    updateManualPoint
  };
};
