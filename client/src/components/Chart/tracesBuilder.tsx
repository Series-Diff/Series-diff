import { TimeSeriesEntry } from "@/services/fetchTimeSeries";
import { Data } from "plotly.js";

const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const MA_Suffix = / \(MA.*\)$/;

const getBaseKey = (name: string, syncByFile: boolean, syncByGroup: boolean): string => {
    let tempName = name.replace(MA_Suffix, '');

    const parts = tempName.split('.');

    if (syncByGroup) {
        return parts[0];
    }

    if (syncByFile) {
        return parts.length > 1 ? parts.slice(1).join('.') : parts[0];
    }

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

    const activePrimaryGroups = new Set(Object.keys(primaryData).map(getGroupName));
    const activeSecondaryGroups = new Set(Object.keys(secondaryData || {}).map(getGroupName));
    const activeTeriaryGroups = new Set(Object.keys(tertiaryData || {}).map(getGroupName));

    const validManualKeys = Object.keys(manualData).filter(key => {
        const group = getGroupName(key);
        return activePrimaryGroups.has(group) || activeSecondaryGroups.has(group) || activeTeriaryGroups.has(group);
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
        const parts = name.split('.');
        const groupName = parts[0];
        const displayName = parts.length > 1 ? parts.slice(1).join('.') : name;
        const baseKey = getBaseKey(name, syncColorsByFile, syncColorsByGroup);
        const color = colorMap.get(baseKey) || '#000000';
        const isSeriesMA = isMA(name);

        return {
            x: series.map(d => d.x),
            y: series.map(d => d.y),
            type: 'scattergl' as const,
            mode: isManual ? 'markers' : (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers' | 'markers',
            name: displayName,
            uid: name,
            legendgroup: groupName,
            legendgrouptitle: {
                text: `<b>${groupName}</b>`,
            },
            showlegend: !isSeriesMA,
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
            hovertemplate: `<br>Value: %{y:.2f}`,
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