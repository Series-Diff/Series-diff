import { useEffect, useState, useMemo, useRef } from "react";
import { TimeSeriesEntry } from "../services/fetchTimeSeries";

// localStorage keys for persistence
const STORAGE_KEY_IGNORE_TIME_RANGE = 'dashboard_ignoreTimeRange';
const STORAGE_KEY_START_DATE = 'dashboard_startDate';
const STORAGE_KEY_END_DATE = 'dashboard_endDate';

// Helper to parse date from localStorage
const parseDateFromStorage = (key: string): Date | null => {
  const stored = localStorage.getItem(key);
  if (stored) {
    const date = new Date(stored);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

export function useDateRange(
  loadedData: any[] = [],
  manualData: Record<string, TimeSeriesEntry[]> = {},
  onError?: (message: string) => void
) {
  // Initialize dates from localStorage
  const [startDate, setStartDate] = useState<Date | null>(() => parseDateFromStorage(STORAGE_KEY_START_DATE));
  const [endDate, setEndDate] = useState<Date | null>(() => parseDateFromStorage(STORAGE_KEY_END_DATE));
  const [pendingStartDate, setPendingStartDate] = useState<Date | null>(() => parseDateFromStorage(STORAGE_KEY_START_DATE));
  const [pendingEndDate, setPendingEndDate] = useState<Date | null>(() => parseDateFromStorage(STORAGE_KEY_END_DATE));
  // Initialize ignoreTimeRange from localStorage (default to true)
  const [ignoreTimeRange, setIgnoreTimeRange] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_IGNORE_TIME_RANGE);
    return stored === null ? true : stored === 'true';
  });

  // Persist ignoreTimeRange to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_IGNORE_TIME_RANGE, String(ignoreTimeRange));
  }, [ignoreTimeRange]);

  // Persist date range to localStorage when applied
  useEffect(() => {
    if (startDate) {
      localStorage.setItem(STORAGE_KEY_START_DATE, startDate.toISOString());
    } else {
      localStorage.removeItem(STORAGE_KEY_START_DATE);
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      localStorage.setItem(STORAGE_KEY_END_DATE, endDate.toISOString());
    } else {
      localStorage.removeItem(STORAGE_KEY_END_DATE);
    }
  }, [endDate]);

  type Bounds = { min: Date | null; max: Date | null; errorMessage?: string };

  const dataBounds: Bounds = useMemo(() => {
    try {
      let minTime = Infinity;
      let maxTime = -Infinity;
      let hasData = false;

      if (loadedData?.length) {
        for (const file of loadedData) {
          const entries = file.entries ?? [];
          for (const entry of entries) {
            const time = new Date(entry.x).getTime();
            if (!isNaN(time)) {
              minTime = Math.min(minTime, time);
              maxTime = Math.max(maxTime, time);
              hasData = true;
            }
          }
        }
      }

      if (Object.keys(manualData).length > 0) {
        for (const entries of Object.values(manualData)) {
          for (const entry of entries) {
            const time = new Date(entry.x).getTime();
            if (!isNaN(time)) {
              minTime = Math.min(minTime, time);
              maxTime = Math.max(maxTime, time);
              hasData = true;
            }
          }
        }
      }

      if (!hasData) return { min: null, max: null };

      return {
        min: new Date(minTime),
        max: new Date(maxTime),
      };
    } catch (err: any) {
      return {
        min: null,
        max: null,
        errorMessage: "Date range calculation error: please adjust the selected range or disable time filtering.",
      };
    }
  }, [loadedData, manualData]);

  const prevBoundsRef = useRef<{ min: Date | null; max: Date | null }>({ min: null, max: null });

  // Extract simple, statically-checkable dependencies for the effect
  const minDate = dataBounds.min;
  const maxDate = dataBounds.max;

  // Surface memo errors without setting state during render
  useEffect(() => {
    if (dataBounds.errorMessage) {
      onError?.(dataBounds.errorMessage);
    }
  }, [dataBounds.errorMessage, onError]);

  useEffect(() => {
    if (!minDate || !maxDate) {
      prevBoundsRef.current = { min: null, max: null };
      return;
    }

    const prevMin = prevBoundsRef.current.min;
    const prevMax = prevBoundsRef.current.max;
    if (prevMin === null && prevMax === null) {
      // First time we have data bounds - try to restore from localStorage
      const storedStartStr = localStorage.getItem(STORAGE_KEY_START_DATE);
      const storedEndStr = localStorage.getItem(STORAGE_KEY_END_DATE);
      
      let initialStart = minDate;
      let initialEnd = maxDate;
      
      // Restore and clamp stored dates to current data bounds
      if (storedStartStr) {
        const storedStart = new Date(storedStartStr);
        if (!isNaN(storedStart.getTime())) {
          // Clamp to data bounds
          initialStart = storedStart < minDate ? minDate : (storedStart > maxDate ? maxDate : storedStart);
        }
      }
      if (storedEndStr) {
        const storedEnd = new Date(storedEndStr);
        if (!isNaN(storedEnd.getTime())) {
          // Clamp to data bounds
          initialEnd = storedEnd > maxDate ? maxDate : (storedEnd < minDate ? minDate : storedEnd);
        }
      }
      
      // Ensure start <= end
      if (initialStart > initialEnd) {
        initialStart = minDate;
        initialEnd = maxDate;
      }
      
      // Always set clamped values (override any pre-loaded localStorage values that may be out of bounds)
      setStartDate(initialStart);
      setEndDate(initialEnd);
      setPendingStartDate(initialStart);
      setPendingEndDate(initialEnd);
      prevBoundsRef.current = { min: minDate, max: maxDate };
      return;
    }

    const boundsChanged =
      (prevMin && minDate && prevMin.getTime() !== minDate.getTime()) ||
      (prevMax && maxDate && prevMax.getTime() !== maxDate.getTime());

    if (boundsChanged) {
      const nextStart = minDate;
      const nextEnd = maxDate;
      setStartDate(prev =>
        prev === null || (prevMin && prev?.getTime() === prevMin.getTime())
          ? nextStart
          : prev
      );
      setEndDate(prev =>
        prev === null || (prevMax && prev?.getTime() === prevMax.getTime())
          ? nextEnd
          : prev
      );
      setPendingStartDate(prev =>
        prev === null || (prevMin && prev?.getTime() === prevMin.getTime())
          ? nextStart
          : prev
      );
      setPendingEndDate(prev =>
        prev === null || (prevMax && prev?.getTime() === prevMax.getTime())
          ? nextEnd
          : prev
      );
      prevBoundsRef.current = { min: minDate, max: maxDate };
    }
  }, [minDate, maxDate]);

  return {
    startDate,
    endDate,
    pendingStartDate,
    pendingEndDate,
    ignoreTimeRange,
    setIgnoreTimeRange,
    handleStartChange: setPendingStartDate,
    handleEndChange: setPendingEndDate,
    setPendingStartDate,
    setPendingEndDate,
    applyPendingDates: () => {
      setStartDate(pendingStartDate);
      setEndDate(pendingEndDate);
    },
    resetDates: () => {
      setStartDate(null);
      setEndDate(null);
      setPendingStartDate(null);
      setPendingEndDate(null);
      setIgnoreTimeRange(true);
    },
    defaultMinDate: dataBounds.min,
    defaultMaxDate: dataBounds.max,
  };
}
