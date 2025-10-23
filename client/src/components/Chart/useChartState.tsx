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
 */

export const useChartState = (
    primaryData: Record<string, TimeSeriesEntry[]>,
    secondaryData?: Record<string, TimeSeriesEntry[]>
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
    const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

    // Memoized allData to stabilize dependencies
    const allData = useMemo(() => ({ ...primaryData, ...(secondaryData || {}) }), [primaryData, secondaryData]);

    // Set initial X-range based on data
    // This hook allows for dynamic X-axis range right after loading data, without it you need to refresh the page first
    useEffect(() => {
        const allXValues = Object.values(allData).flat().map(d => new Date(d.x));
        if (allXValues.length === 0) return;
        const minDate = new Date(Math.min(...allXValues.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allXValues.map(d => d.getTime())));

        const fakeEvent = {
            'xaxis.range[0]': minDate.toISOString(),
            'xaxis.range[1]': maxDate.toISOString(),
        };

        handleRelayout(fakeEvent);
    }, [allData]);

    // Relayout handler for zoom and range updates
    const handleRelayout = (event: any) => {
        if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
            const rangeStart = new Date(event['xaxis.range[0]']);
            const rangeEnd = new Date(event['xaxis.range[1]']);
            const diffMs = rangeEnd.getTime() - rangeStart.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 24 * 3) {
                setTickFormat('%d.%m %H:%M'); // Change format to day and hours
                setShowMarkers(diffHours < 3); // If less than 3h, show markers
            } else if (diffHours < 24 * 5) { // Less than 5 days
                setTickFormat('%d.%m.%Y %H:%M');
                setShowMarkers(false);
            } else {
                setTickFormat('%d.%m.%Y');
                setShowMarkers(false);
            }
            setXaxisRange([event['xaxis.range[0]'], event['xaxis.range[1]']]);
        } else if (event['xaxis.autorange'] === true) {
            setXaxisRange([null, null]); // Resetting X-axis range
            setTickFormat('%d.%m.%Y'); // Restoring default format
            setShowMarkers(false); // Restoring default markers
        }
    };

    return {
        xaxisRange, tickFormat, showMarkers, customRange, setCustomRange, customYMin, setCustomYMin, customYMax, setCustomYMax,
        customRange2, setCustomRange2, customY2Min, setCustomY2Min, customY2Max, setCustomY2Max, visibleMap, setVisibleMap, handleRelayout,
    };
};