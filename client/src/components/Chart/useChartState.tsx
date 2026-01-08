import { useEffect, useMemo, useState } from "react";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

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
    manualData?: Record<string, TimeSeriesEntry[]>
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

    const manualDataSafe = useMemo(() => manualData ?? {}, [manualData]);

    // Memoized allData to stabilize dependencies
    const allData = useMemo(
        () => ({
            ...primaryData,
            ...(secondaryData || {}),
            ...(tertiaryData || {}),
            ...manualDataSafe,
        }),
        [primaryData, secondaryData, tertiaryData, manualDataSafe]
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

    // Set initial X-range based on data
    // This hook allows for dynamic X-axis range right after loading data, without it you need to refresh the page first
    useEffect(() => {
        // Only attempt to set initial range when we have data
        if (Object.keys(allData).length === 0) return;
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
        if (xaxisRange[0] === minXString && xaxisRange[1] === maxXString) return;

        const fakeEvent = {
            'xaxis.range[0]': minXString,
            'xaxis.range[1]': maxXString,
        };

        handleRelayout(fakeEvent);
    }, [allData, xaxisRange]);

    // Relayout handler for zoom and range updates
    const handleRelayout = (event: any) => {
        if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
            const rangeStart = new Date(event['xaxis.range[0]']);
            const rangeEnd = new Date(event['xaxis.range[1]']);
            const diffMs = rangeEnd.getTime() - rangeStart.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            const nextRange: [string, string] = [event['xaxis.range[0]'], event['xaxis.range[1]']];
            if (xaxisRange[0] === nextRange[0] && xaxisRange[1] === nextRange[1]) {
                return; // No-op to prevent relayout-induced loops
            }

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
            setXaxisRange(nextRange);
        } else if (event['xaxis.autorange'] === true) {
            if (xaxisRange[0] === null && xaxisRange[1] === null) return; // already reset
            setXaxisRange([null, null]); // Resetting X-axis range
            setTickFormat('%d.%m.%Y'); // Restoring default format
            setShowMarkers(false); // Restoring default markers
        }
    };

    return {
        xaxisRange, tickFormat, showMarkers, customRange, setCustomRange, customYMin, setCustomYMin, customYMax, setCustomYMax,
        customRange2, setCustomRange2, customY2Min, setCustomY2Min, customY2Max, setCustomY2Max,
        customRange3, setCustomRange3, customY3Min, setCustomY3Min, customY3Max, setCustomY3Max,
        visibleMap, setVisibleMap, handleRelayout,
        primaryDataBounds, secondaryDataBounds, tertiaryDataBounds
    };
};