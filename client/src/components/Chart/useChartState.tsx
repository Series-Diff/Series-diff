import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

/**
 * Format date for Plotly without timezone conversion.
 * Plotly interprets dates without timezone suffix as local time.
 * Using toISOString() would convert to UTC (suffix "Z") causing timezone shift issues.
 */
const formatDateForPlotly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
};

/**
 * Custom hook for managing chart state.
 * 
 * Handles:
 * - X/Y axis ranges and custom settings.
 * - Tick formats and markers based on zoom level.
 * - Visibility map for traces.
 * - Initial X-range setup after data load.
 * - Data bounds for Y-axes (used for partial range input)
 */

export const useChartState = (
    primaryData: Record<string, TimeSeriesEntry[]>,
    secondaryData?: Record<string, TimeSeriesEntry[]>,
    tertiaryData?: Record<string, TimeSeriesEntry[]>,
    manualData: Record<string, TimeSeriesEntry[]> = {}
) => {
    const [xaxisRange, setXaxisRange] = useState<[string | null, string | null]>([null, null]);
    const [tickFormat, setTickFormat] = useState('%d.%m.%Y'); // Only day before zoom
    const [showMarkers, setShowMarkers] = useState(false);
    const [customRange, setCustomRange] = useState(false);
    const [customYMin, setCustomYMin] = useState<string>('');
    const [customYMax, setCustomYMax] = useState<string>('');
    const [customRange2, setCustomRange2] = useState(false);
    const [customY2Min, setCustomY2Min] = useState<string>('');
    const [customY2Max, setCustomY2Max] = useState<string>('');
    const [customRange3, setCustomRange3] = useState(false);
    const [customY3Min, setCustomY3Min] = useState<string>('');
    const [customY3Max, setCustomY3Max] = useState<string>('');
    const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

    // Memoized allData to stabilize dependencies
    const allData = useMemo(
        () => ({
            ...primaryData,
            ...(secondaryData || {}),
            ...(tertiaryData || {}),
            ...manualData,
        }),
        [primaryData, secondaryData, tertiaryData, manualData]
    );

    const averageStepHours = useMemo(() => {
        const allXValues = Object.values(allData).flat().map(d => new Date(d.x).getTime());
        if (allXValues.length < 2) return 0;

        // Szukamy min i max, aby obliczyć rozpiętość
        const minTime = Math.min(...allXValues);
        const maxTime = Math.max(...allXValues);
        const totalDurationHours = (maxTime - minTime) / (1000 * 60 * 60);

        // Średni odstęp = całkowity czas / liczbę punktów
        return totalDurationHours / allXValues.length;
    }, [allData]);

    // Calculate data bounds for primary Y-axis
    const primaryDataBounds = useMemo(() => {
        const allYValues = Object.values(primaryData).flat().map(d => d.y);
        if (allYValues.length === 0) return { min: 0, max: 100 };
        return {
            min: Math.min(...allYValues),
            max: Math.max(...allYValues)
        };
    }, [primaryData]);

    // Calculate data bounds for secondary Y-axis
    const secondaryDataBounds = useMemo(() => {
        if (!secondaryData) return { min: 0, max: 100 };
        const allYValues = Object.values(secondaryData).flat().map(d => d.y);
        if (allYValues.length === 0) return { min: 0, max: 100 };
        return {
            min: Math.min(...allYValues),
            max: Math.max(...allYValues)
        };
    }, [secondaryData]);

    // Calculate data bounds for tertiary Y-axis
    const tertiaryDataBounds = useMemo(() => {
        if (!tertiaryData) return { min: 0, max: 100 };
        const allYValues = Object.values(tertiaryData).flat().map(d => d.y);
        if (allYValues.length === 0) return { min: 0, max: 100 };
        return {
            min: Math.min(...allYValues),
            max: Math.max(...allYValues)
        };
    }, [tertiaryData]);

    // Use a ref to track current xaxis range timestamps for comparison (avoids stale closure)
    const xaxisRangeRef = useRef<[string | null, string | null]>([null, null]);
    const xaxisRangeTimestampRef = useRef<[number | null, number | null]>([null, null]);

    // Memoize relayout handler to avoid new reference on each render
    const handleRelayout = useCallback((event: any) => {
        // Handle different Plotly event formats for x-axis range:
        // 1. Individual properties: xaxis.range[0], xaxis.range[1] (from zoom, pan, scroll)
        // 2. Array property: xaxis.range (from rangeslider, rangeselector buttons)
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;
        
        if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
            rangeStart = new Date(event['xaxis.range[0]']);
            rangeEnd = new Date(event['xaxis.range[1]']);
        } else if (event['xaxis.range'] && Array.isArray(event['xaxis.range'])) {
            rangeStart = new Date(event['xaxis.range'][0]);
            rangeEnd = new Date(event['xaxis.range'][1]);
        }
        
        if (rangeStart && rangeEnd && !isNaN(rangeStart.getTime()) && !isNaN(rangeEnd.getTime())) {
            const startTs = rangeStart.getTime();
            const endTs = rangeEnd.getTime();
            const diffMs = endTs - startTs;
            const diffHours = diffMs / (1000 * 60 * 60);

            // Use timestamps for comparison (more reliable than string comparison)
            // Allow small tolerance (1 second) for floating point / rounding differences
            const tolerance = 1000;
            const currentStartTs = xaxisRangeTimestampRef.current[0];
            const currentEndTs = xaxisRangeTimestampRef.current[1];
            
            if (currentStartTs !== null && currentEndTs !== null &&
                Math.abs(currentStartTs - startTs) < tolerance &&
                Math.abs(currentEndTs - endTs) < tolerance) {
                return; // No-op to prevent relayout-induced loops
            }

            // Format dates for Plotly without UTC conversion to avoid timezone shift
            const nextRangeStart = formatDateForPlotly(rangeStart);
            const nextRangeEnd = formatDateForPlotly(rangeEnd);
            
            const estimatedPointsOnScreen = diffHours / (averageStepHours || 0.001);

            const shouldShowMarkers = diffHours < 3 || estimatedPointsOnScreen < 50;

            setShowMarkers(shouldShowMarkers);
            if (diffHours < 24 * 3) {
                setTickFormat('%d.%m %H:%M'); // Change format to day and hours
            } else if (diffHours < 24 * 5) { // Less than 5 days
                setTickFormat('%d.%m.%Y %H:%M');
            } else {
                setTickFormat('%d.%m.%Y');
            }
            
            // Update both state and refs
            xaxisRangeRef.current = [nextRangeStart, nextRangeEnd];
            xaxisRangeTimestampRef.current = [startTs, endTs];
            setXaxisRange([nextRangeStart, nextRangeEnd]);
        } else if (event['xaxis.autorange'] === true) {
            // Use ref for comparison
            if (xaxisRangeRef.current[0] === null && xaxisRangeRef.current[1] === null) {
                return; // Already in autorange
            }
            
            xaxisRangeRef.current = [null, null];
            xaxisRangeTimestampRef.current = [null, null];
            setXaxisRange([null, null]); // Resetting X-axis range
            setTickFormat('%d.%m.%Y'); // Restoring default format
            setShowMarkers(false); // Restoring default markers
        }
    }, [averageStepHours]);

    // Keep xaxisRange state in sync with refs
    useEffect(() => {
        xaxisRangeRef.current = xaxisRange;
        if (xaxisRange[0] && xaxisRange[1]) {
            xaxisRangeTimestampRef.current = [
                new Date(xaxisRange[0]).getTime(),
                new Date(xaxisRange[1]).getTime()
            ];
        } else {
            xaxisRangeTimestampRef.current = [null, null];
        }
    }, [xaxisRange]);

    // Only run initial X-range setup when allData transitions from empty to non-empty
    const prevAllDataCount = useRef(0);
    useEffect(() => {
        const keys = Object.keys(allData);
        // Only run when allData transitions from empty to non-empty
        if (prevAllDataCount.current === 0 && keys.length > 0) {
            const allXStrings = Object.values(allData).flat().map(d => d.x);
            if (allXStrings.length === 0) return;

            const stringsWithTimestamps = allXStrings.map(str => ({
                str,
                ts: new Date(str).getTime()
            }));
            const minTs = Math.min(...stringsWithTimestamps.map(item => item.ts));
            const maxTs = Math.max(...stringsWithTimestamps.map(item => item.ts));
            
            // Use timestamps for comparison to avoid string format mismatches
            const currentStartTs = xaxisRangeTimestampRef.current[0];
            const currentEndTs = xaxisRangeTimestampRef.current[1];
            const tolerance = 1000; // 1 second tolerance
            if (currentStartTs !== null && currentEndTs !== null &&
                Math.abs(currentStartTs - minTs) < tolerance &&
                Math.abs(currentEndTs - maxTs) < tolerance) {
                return; // Already aligned with data
            }

            // Format dates for Plotly using local time (avoid UTC conversion)
            const minDate = new Date(minTs);
            const maxDate = new Date(maxTs);
            const fakeEvent = {
                'xaxis.range[0]': formatDateForPlotly(minDate),
                'xaxis.range[1]': formatDateForPlotly(maxDate),
            };

            handleRelayout(fakeEvent);
        }
        prevAllDataCount.current = keys.length;
    }, [allData, handleRelayout]);


    return {
        xaxisRange, tickFormat, showMarkers, customRange, setCustomRange, customYMin, setCustomYMin, customYMax, setCustomYMax,
        customRange2, setCustomRange2, customY2Min, setCustomY2Min, customY2Max, setCustomY2Max,
        customRange3, setCustomRange3, customY3Min, setCustomY3Min, customY3Max, setCustomY3Max,
        visibleMap, setVisibleMap, handleRelayout,
        primaryDataBounds, secondaryDataBounds, tertiaryDataBounds
    };
};