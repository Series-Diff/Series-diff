import { useEffect, useState, useMemo, useRef } from "react";

export function useDateRange(loadedData: any[] = []) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ignoreTimeRange, setIgnoreTimeRange] = useState(false);

  const dataBounds = useMemo(() => {
    if (!loadedData?.length) return { min: null, max: null };
    const allDates = loadedData.flatMap(file =>
      (file.entries ?? [])
        .map((e: any) => new Date(e.x ))
        .filter((d: { getTime: () => number; }) => !isNaN(d.getTime()))
    );

    if (!allDates.length) return { min: null, max: null };

    return {
      min: new Date(Math.min(...allDates.map(d => d.getTime()))),
      max: new Date(Math.max(...allDates.map(d => d.getTime()))),
    };
  }, [loadedData]);

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
