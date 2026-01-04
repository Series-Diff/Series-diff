import { TimeSeriesEntry } from "@/services/fetchTimeSeries";
import { Data } from "plotly.js";

const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const MA_Suffix = / \(MA.*\)$/;

const getBaseKey = (name: string, syncByFile: boolean, syncByGroup: boolean): string => {
    // 1. Najpierw usuń sufiks średniej kroczącej, jeśli istnieje
    let tempName = name.replace(MA_Suffix, '');

    const parts = tempName.split('.');

    if (syncByGroup) {
        // Zwraca tylko "Grupa" (pierwszy człon przed kropką)
        return parts[0];
    }

    if (syncByFile) {
        // Zwraca wszystko po pierwszej kropce (sama nazwa pliku)
        return parts.length > 1 ? parts.slice(1).join('.') : parts[0];
    }

    // Fallback, jeśli nie było prefiksu kategorii
    return tempName;
};

const isMA = (name: string): boolean => {
    return MA_Suffix.test(name);
};

const getGroupName = (key: string) => key.split('.')[0];

export const getColorMap = (
    allNames: string[],
    syncColorsByFile: boolean,
    syncColorsByGroup: boolean
): Map<string, string> => {
    const colorMap = new Map<string, string>();
    let colorIndex = 0;

    allNames.forEach(name => {
        const baseKey = getBaseKey(name, syncColorsByFile, syncColorsByGroup);
        if (!colorMap.has(baseKey)) {
            colorMap.set(baseKey, colors[colorIndex % colors.length]);
            colorIndex++;
        }
    });
    return colorMap;
};

/**
 * Utility function to build Plotly traces from data.
 * * Generates traces for primary and secondary data series, applying visibility and marker modes.
 * Maps moving average series to the same color as their source series, using a dashed line style.
 */
export const buildTraces = (
    primaryData: Record<string, TimeSeriesEntry[]>,
    secondaryData: Record<string, TimeSeriesEntry[]> | undefined,
    tertiaryData: Record<string, TimeSeriesEntry[]> | undefined,
    manualData: Record<string, TimeSeriesEntry[]>,
    visibleMap: Record<string, boolean>,
    showMarkers: boolean,
    syncColorsByFile: boolean,
    syncColorsByGroup: boolean,
    colorMap: Map<string, string>
): Data[] => {

    let colorIndex = 0;

    // 1. Zbieramy aktywne grupy, żeby wiedzieć co filtrować
    const activePrimaryGroups = new Set(Object.keys(primaryData).map(getGroupName));
    const activeSecondaryGroups = new Set(Object.keys(secondaryData || {}).map(getGroupName));
    const activeTeriaryGroups = new Set(Object.keys(tertiaryData || {}).map(getGroupName));

    const validManualKeys = Object.keys(manualData).filter(key => {
        const group = getGroupName(key);
        return activePrimaryGroups.has(group) || activeSecondaryGroups.has(group);
    });

    const allKeys = [
        ...Object.keys(primaryData),
        ...(secondaryData ? Object.keys(secondaryData) : []),
        ...(tertiaryData ? Object.keys(tertiaryData) : []),
        ...validManualKeys
    ];

    allKeys.forEach(name => {
        const baseKey = getBaseKey(name, syncColorsByFile, syncColorsByGroup);
        if (!colorMap.has(baseKey)) {
            colorMap.set(baseKey, colors[colorIndex % colors.length]);
            colorIndex++;
        }
    });

    const createTrace = (
        name: string,
        series: TimeSeriesEntry[],
        yaxis: 'y1' | 'y2' | 'y3',
        isManual: boolean = false
    ): Data => {
        const baseKey = getBaseKey(name, syncColorsByFile, syncColorsByGroup);
        const color = colorMap.get(baseKey) || '#000000';
        const isSeriesMA = isMA(name);

        return {
            x: series.map(d => d.x),
            y: series.map(d => d.y),
            type: 'scattergl' as const,
            mode: isManual ? 'markers' : (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers' | 'markers',
            name,
            line: {
                color: color,
                dash: isSeriesMA ? 'dash' : 'solid',
                width: isManual ? 0 : 2,
            },
            marker: {
                size: isManual ? 10 : 5,
                color: color,
                symbol: isManual ? 'x' : 'circle',
                opacity: isManual ? 1 : 1
            },
            yaxis: yaxis,
            visible: visibleMap[name] === false ? 'legendonly' : true,
            hovertemplate: `<b>${name}</b><br>Value: %{y:.2f}`,
        };
    };

    const primaryTraces: Data[] = Object.entries(primaryData).map(([name, series]) =>
        createTrace(name, series, 'y1', false)
    );

    const secondaryTraces: Data[] = secondaryData
        ? Object.entries(secondaryData).map(([name, series]) =>
            createTrace(name, series, 'y2', false)
        )
        : [];

    const tertiaryTraces: Data[] = tertiaryData
        ? Object.entries(tertiaryData).map(([name, series]) =>
            createTrace(name, series, 'y3', false)
        )
        : [];

    const manualTraces: Data[] = [];
    Object.entries(manualData).forEach(([name, series]) => {
        const group = getGroupName(name);

        if (activePrimaryGroups.has(group)) {
            manualTraces.push(createTrace(name, series, 'y1', true));
        }
        else if (activeSecondaryGroups.has(group)) {
            manualTraces.push(createTrace(name, series, 'y2', true));
        }
        else if (activeTeriaryGroups.has(group)) {
            manualTraces.push(createTrace(name, series, 'y3', true));
        }
    });

    return [...primaryTraces, ...secondaryTraces, ...tertiaryTraces, ...manualTraces];
};