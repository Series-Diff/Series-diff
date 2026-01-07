import { useEffect, useState, useMemo, useRef } from "react";
import { TimeSeriesEntry } from "../services/fetchTimeSeries";

export function useDateRange(loadedData: any[] = [], manualData: Record<string, TimeSeriesEntry[]> = {}) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ignoreTimeRange, setIgnoreTimeRange] = useState(false);

  const dataBounds = useMemo(() => {
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
  }, [loadedData, manualData]);

  const prevBoundsRef = useRef<{ min: Date | null; max: Date | null }>({ min: null, max: null });

  useEffect(() => {
    if (!dataBounds.min || !dataBounds.max) {
      prevBoundsRef.current = { min: null, max: null };
      return;
    }

    const prevMin = prevBoundsRef.current.min;
    const prevMax = prevBoundsRef.current.max;
    if (prevMin === null && prevMax === null) {
      setStartDate(prev => prev ?? dataBounds.min);
      setEndDate(prev => prev ?? dataBounds.max);
      prevBoundsRef.current = { min: dataBounds.min, max: dataBounds.max };
      return;
    }

    const boundsChanged =
      (prevMin && dataBounds.min && prevMin.getTime() !== dataBounds.min.getTime()) ||
      (prevMax && dataBounds.max && prevMax.getTime() !== dataBounds.max.getTime());

    if (boundsChanged) {
      setStartDate(prev =>
        prev === null || (prevMin && prev?.getTime() === prevMin.getTime())
          ? dataBounds.min
          : prev
      );
      setEndDate(prev =>
        prev === null || (prevMax && prev?.getTime() === prevMax.getTime())
          ? dataBounds.max
          : prev
      );
      prevBoundsRef.current = { min: dataBounds.min, max: dataBounds.max };
    }
  }, [dataBounds.min?.getTime(), dataBounds.max?.getTime()]);

  return {
    startDate,
    endDate,
    ignoreTimeRange,
    setIgnoreTimeRange,
    handleStartChange: setStartDate,
    handleEndChange: setEndDate,
    resetDates: () => {
      setStartDate(null);
      setEndDate(null);
      setIgnoreTimeRange(false);
    },
    defaultMinDate: dataBounds.min,
    defaultMaxDate: dataBounds.max,
  };
}
