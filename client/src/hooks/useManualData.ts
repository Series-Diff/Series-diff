import { useState, useEffect } from 'react';
import { TimeSeriesEntry } from '../services/fetchTimeSeries';

const STORAGE_KEY = 'manual_chart_data';

export const useManualData = () => {
  const [manualData, setManualData] = useState<Record<string, TimeSeriesEntry[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Błąd ładowania danych ręcznych:", error);
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

  return {
    manualData,
    addManualData,
    clearManualData
  };
};