import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

/**
 * Format a Date to an ISO-like string preserving the original time values.
 * This is used internally for Plotly chart axis synchronization.
 * It does NOT convert timezone - just formats the Date object's local time components.
 */
function toLocalISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

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
    manualData: Record<string, TimeSeriesEntry[]> = {},
    onXaxisRangeChange?: (start: Date | null, end: Date | null) => void,
    externalXaxisRange?: [Date | null, Date | null]
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

            // Use local ISO string to preserve timezone (avoid UTC conversion)
            const nextRangeStart = toLocalISOString(rangeStart);
            const nextRangeEnd = toLocalISOString(rangeEnd);
            
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
            
            // Notify parent of range change (for date picker sync)
            onXaxisRangeChange?.(rangeStart, rangeEnd);
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
            // Notify parent of autorange (null values = full range)
            onXaxisRangeChange?.(null, null);
        }
    }, [averageStepHours, onXaxisRangeChange]);

    // Keep xaxisRange state in sync with refs (for external consumers)
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

    // Sync external x-axis range from date picker to chart
    const prevExternalRangeRef = useRef<[Date | null, Date | null]>([null, null]);
    useEffect(() => {
        if (!externalXaxisRange) return;
        
        const [externalStart, externalEnd] = externalXaxisRange;
        const [prevStart, prevEnd] = prevExternalRangeRef.current;
        
        // Check if external range has changed (with tolerance)
        const tolerance = 1000; // 1 second tolerance
        const startChanged = !externalStart !== !prevStart || 
            (externalStart && prevStart && Math.abs(externalStart.getTime() - prevStart.getTime()) >= tolerance);
        const endChanged = !externalEnd !== !prevEnd ||
            (externalEnd && prevEnd && Math.abs(externalEnd.getTime() - prevEnd.getTime()) >= tolerance);
        
        if (!startChanged && !endChanged) return;
        
        prevExternalRangeRef.current = externalXaxisRange;
        
        if (externalStart && externalEnd) {
            const startTs = externalStart.getTime();
            const endTs = externalEnd.getTime();
            
            // Avoid relayout loop if already at this range (within tolerance)
            const currentStartTs = xaxisRangeTimestampRef.current[0];
            const currentEndTs = xaxisRangeTimestampRef.current[1];
            
            if (currentStartTs !== null && currentEndTs !== null &&
                Math.abs(currentStartTs - startTs) < tolerance &&
                Math.abs(currentEndTs - endTs) < tolerance) {
                return;
            }
            
            // Use local ISO string to preserve timezone (avoid UTC conversion)
            const startStr = toLocalISOString(externalStart);
            const endStr = toLocalISOString(externalEnd);
            
            const fakeEvent = {
                'xaxis.range[0]': startStr,
                'xaxis.range[1]': endStr,
            };
            handleRelayout(fakeEvent);
        } else {
            // Reset to autorange if both are null
            if (xaxisRangeRef.current[0] === null && xaxisRangeRef.current[1] === null) return;
            handleRelayout({ 'xaxis.autorange': true });
        }
    }, [externalXaxisRange, handleRelayout]);

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
            const minXString = stringsWithTimestamps.find(item => item.ts === minTs)?.str || allXStrings[0];
            const maxXString = stringsWithTimestamps.find(item => item.ts === maxTs)?.str || allXStrings[allXStrings.length - 1];

            // Avoid relayout loop when range is already aligned with data
            if (xaxisRangeRef.current[0] === minXString && xaxisRangeRef.current[1] === maxXString) return;

            const fakeEvent = {
                'xaxis.range[0]': minXString,
                'xaxis.range[1]': maxXString,
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