import { useEffect, useState, useMemo, useRef } from "react";
import { TimeSeriesEntry } from "../services/fetchTimeSeries";

export function useDateRange(
  loadedData: any[] = [],
  manualData: Record<string, TimeSeriesEntry[]> = {},
  onError?: (message: string) => void
) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pendingStartDate, setPendingStartDate] = useState<Date | null>(null);
  const [pendingEndDate, setPendingEndDate] = useState<Date | null>(null);
  const [ignoreTimeRange, setIgnoreTimeRange] = useState(true);

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
      const initialStart = minDate;
      const initialEnd = maxDate;
      setStartDate(prev => prev ?? initialStart);
      setEndDate(prev => prev ?? initialEnd);
      setPendingStartDate(prev => prev ?? initialStart);
      setPendingEndDate(prev => prev ?? initialEnd);
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
