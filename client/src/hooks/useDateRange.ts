import { useEffect, useState, useMemo } from "react";

export function useDateRange(loadedData: any[] = []) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
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

  useEffect(() => {
    if (!dataBounds.min || !dataBounds.max) return;

    setStartDate(prev => prev ?? dataBounds.min);
    setEndDate(prev => prev ?? dataBounds.max);
  }, [dataBounds.min?.getTime(), dataBounds.max?.getTime()]);

  return {
    startDate,
    endDate,
    handleStartChange: setStartDate,
    handleEndChange: setEndDate,
    resetDates: () => {
      setStartDate(null);
      setEndDate(null);
    },
    defaultMinDate: dataBounds.min,
    defaultMaxDate: dataBounds.max,
  };
}
