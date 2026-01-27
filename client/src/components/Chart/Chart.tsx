import React, {useMemo} from "react";
import Plot from "react-plotly.js";
import {useChartState} from "./useChartState";
import {useChartInteractions} from "./useChartInteractions";
import {buildTraces, getColorMap, isMA} from "./tracesBuilder";
import ChartControls from "./ChartControls";
import {TimeSeriesEntry} from "@/services/fetchTimeSeries";
import {Layout} from "plotly.js";

interface MyChartProps {
    primaryData: Record<string, TimeSeriesEntry[]>;
    secondaryData?: Record<string, TimeSeriesEntry[]>;
    tertiaryData?: Record<string, TimeSeriesEntry[]>;
    manualData?: Record<string, TimeSeriesEntry[]>;
    title?: string;
    syncColorsByFile?: boolean;
    syncColorsByGroup?: boolean;
    layoutMode?: 'stacked' | 'overlay';
    toggleChartMode?: () => void;
    isInDifferenceMode?: boolean;
    canShowDifferenceChart?: boolean;
    onVisibleRangeChange?: (start: Date | null, end: Date | null) => void;
    visibleDateRange?: [Date | null, Date | null];
}

const MyChart: React.FC<MyChartProps> = ({
                                             primaryData,
                                             secondaryData,
                                             tertiaryData,
                                             manualData,
                                             title,
                                             syncColorsByFile = true,
                                             syncColorsByGroup = false,
                                             layoutMode = 'overlay',
                                             toggleChartMode,
                                             isInDifferenceMode,
                                             canShowDifferenceChart,
                                         }) => {

    const manualDataSafe = useMemo(() => manualData ?? {}, [manualData]);

    const {
        xaxisRange, tickFormat, showMarkers,
        customRange, setCustomRange, customYMin, setCustomYMin, customYMax, setCustomYMax,
        customRange2, setCustomRange2, customY2Min, setCustomY2Min, customY2Max, setCustomY2Max,
        customRange3, setCustomRange3, customY3Min, setCustomY3Min, customY3Max, setCustomY3Max,
        visibleMap, setVisibleMap, handleRelayout,
        primaryDataBounds, secondaryDataBounds, tertiaryDataBounds
    } = useChartState(primaryData, secondaryData, tertiaryData, manualDataSafe);

    const {handleLegendClick, containerRef} = useChartInteractions(setVisibleMap);

    const allKeys = useMemo(() => [
        ...Object.keys(primaryData),
        ...(secondaryData ? Object.keys(secondaryData) : []),
        ...(tertiaryData ? Object.keys(tertiaryData) : []),
        ...Object.keys(manualDataSafe)
    ], [primaryData, secondaryData, tertiaryData, manualDataSafe]);

    const colorMap = useMemo(() =>
            getColorMap(allKeys, syncColorsByFile, syncColorsByGroup),
        [allKeys, syncColorsByFile, syncColorsByGroup]
    );

    const uiRevision = useMemo(() => {
        return `${allKeys.join(',')}-${layoutMode}-${syncColorsByGroup ? 'group' : 'file'}`;
    }, [allKeys, layoutMode, syncColorsByGroup]);

    const getAxisColor = (dataRecord?: Record<string, any>) => {
        if (!syncColorsByGroup || !dataRecord) return undefined;
        const firstKey = Object.keys(dataRecord)[0];
        if (!firstKey) return undefined;
        return colorMap.get(firstKey.split('.')[0]);
    };

    const traces = buildTraces(
        primaryData,
        secondaryData,
        tertiaryData,
        manualDataSafe,
        visibleMap,
        showMarkers,
        syncColorsByFile,
        syncColorsByGroup,
        colorMap
    );

    const isStacked = layoutMode === 'stacked';

    const getStackedDomains = () => {
        if (tertiaryData && secondaryData) {
            return {y1: [0.70, 1.00], y2: [0.35, 0.65], y3: [0.00, 0.30]};
        }
        if (secondaryData) {
            return {y1: [0.55, 1.00], y2: [0.00, 0.45], y3: [0, 0]};
        }
        return {y1: [0, 1], y2: [0, 0], y3: [0, 0]};
    };

    const stackedDomains = getStackedDomains();

    const maxItemsInGroup = useMemo(() => {
        const counts: Record<string, number> = {};
        allKeys.forEach(key => {
            if (isMA(key)) return;

            const group = key.split('.')[0];
            counts[group] = (counts[group] || 0) + 1;
        });
        return Math.max(...Object.values(counts), 0);
    }, [allKeys]);

    const MANY_ITEMS_THRESHOLD = 3;
    const isLegendCrowded = maxItemsInGroup > MANY_ITEMS_THRESHOLD;
    const dynamicRightMargin = isLegendCrowded ? 200 : 20;

    const chartLayout: Partial<Layout> = {
        margin: {
            l: 60, // lewy (na osie Y)
            r: dynamicRightMargin, // prawy
            t: isLegendCrowded ? 30 : 50, // górny (tytuł)
            b: 40  // dolny (oś X)
        },
        title: {text: title},
        uirevision: uiRevision,
        plot_bgcolor: 'white',
        hovermode: "x unified",
        hoverlabel: {
            bgcolor: "rgba(255, 255, 255, 0.9)",
            font: {size: 12},
            align: "left"
        },
        dragmode: 'pan',
        autosize: true,
        height: undefined,

        grid: isStacked ? {
            rows: (tertiaryData && secondaryData) ? 3 : (secondaryData ? 2 : 1),
            columns: 1,
            pattern: 'independent'
        } : undefined,

legend: isLegendCrowded ? {
            orientation: "v",
            y: 1,
            x: 1.15,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.5)',
            traceorder: "grouped",
            groupclick: "toggleitem" as any
        } : {
            orientation: "h",
            y: 1.3,
            x: 0,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.5)',
            traceorder: "grouped",
            groupclick: "toggleitem" as any

        },

        xaxis: {
            // title: {text: 'Time'},
            type: 'date',
            tickformat: tickFormat,
            fixedrange: false,
            showspikes: true,
            spikemode: 'across',
            spikesnap: "cursor",
            spikedash: "solid",
            spikethickness: 1,
            domain: isStacked
                ? [0, 1]
                : (tertiaryData ? [0.05, 1] : [0, 1]),
            anchor: (isStacked ? (tertiaryData ? 'y3' : (secondaryData ? 'y2' : 'y')) : undefined) as any,
            range: xaxisRange[0] && xaxisRange[1] ? xaxisRange : undefined,
            rangeselector: {
                buttons: [
                    {count: 1, label: "1d", step: "day", stepmode: "backward"},
                    {count: 7, label: "1w", step: "day", stepmode: "backward"},
                    {count: 1, label: "1m", step: "month", stepmode: "backward"},
                    {step: "all"}
                ],
                x: 0,
                xanchor: 'left',
                y: isLegendCrowded ? 1.1 : 1.35,
                yanchor: 'top'
            },
            rangeslider: {
                visible: !isStacked,
                thickness: 0.05,
                bgcolor: '#f8f9fa',
                bordercolor: '#ced4da',
                borderwidth: 1
            },
        },

        yaxis: {
            title: {
                text: Object.keys(primaryData)[0]?.split('.')[0] || 'Y-Axis',
                font: {color: getAxisColor(primaryData)}
            },
            tickfont: {color: getAxisColor(primaryData)},
            automargin: true,
            zeroline: false,
            showspikes: true,
            spikemode: 'across',
            spikedash: "solid",
            spikethickness: 1,
            side: 'left',
            fixedrange: true,
            domain: isStacked ? stackedDomains.y1 : undefined,
            autorange: !(customRange && customYMin !== '' && customYMax !== ''),
            range: customRange && customYMin !== '' && customYMax !== ''
                ? [parseFloat(customYMin), parseFloat(customYMax)] : undefined,
        },

        yaxis2: {
            title: {
                text: secondaryData ? Object.keys(secondaryData)[0]?.split('.')[0] || 'Second Y-Axis' : '',
                font: {color: getAxisColor(secondaryData)}
            },
            tickfont: {color: getAxisColor(secondaryData)},
            automargin: true,
            showgrid: isStacked,
            zeroline: false,
            showspikes: true,
            spikemode: 'across',
            spikedash: "solid",
            spikethickness: 1,
            fixedrange: true,
            side: isStacked ? 'left' : 'right',
            overlaying: isStacked ? undefined : 'y',
            domain: isStacked ? stackedDomains.y2 : undefined,
            autorange: !(customRange2 && customY2Min !== '' && customY2Max !== ''),
            range: customRange2 && customY2Min !== '' && customY2Max !== ''
                ? [parseFloat(customY2Min), parseFloat(customY2Max)] : undefined,
        },

        yaxis3: {
            title: {
                text: tertiaryData ? Object.keys(tertiaryData)[0]?.split('.')[0] || 'Third Y-Axis' : '',
                font: {color: getAxisColor(tertiaryData)}
            },
            tickfont: {color: getAxisColor(tertiaryData)},
            automargin: true,
            showgrid: isStacked,
            zeroline: false,
            showspikes: true,
            spikemode: 'across',
            spikedash: "solid",
            spikethickness: 1,
            side: 'left',
            fixedrange: true,
            overlaying: isStacked ? undefined : 'y',
            domain: isStacked ? stackedDomains.y3 : undefined,
            anchor: isStacked ? 'x' : 'free',
            position: isStacked ? undefined : 0,
            autorange: !(customRange3 && customY3Min !== '' && customY3Max !== ''),
            range: customRange3 && customY3Min !== '' && customY3Max !== ''
                ? [parseFloat(customY3Min), parseFloat(customY3Max)] : undefined,
        }
    };

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ minHeight: '100%' }}>
            <div
                id='pdf-content-chart'
                ref={containerRef}
                style={{
                    width: "100%",
                    flex: "1 1 auto",
                    minHeight: "350px",
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >                <Plot
                key={uiRevision}
                data={traces}
                layout={chartLayout}
                useResizeHandler={true}
                style={{width: '100%', height: '100%', flex: 1}}
                config={{
                    autosizable: true,
                    responsive: true,
                    scrollZoom: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['select2d', 'lasso2d']
                }}
                onRelayout={handleRelayout}
                onLegendClick={handleLegendClick}
            />
            </div>
            <ChartControls
                customYMin={customYMin} setCustomYMin={setCustomYMin}
                customYMax={customYMax} setCustomYMax={setCustomYMax}
                setCustomRange={setCustomRange}
                customY2Min={customY2Min} setCustomY2Min={setCustomY2Min}
                customY2Max={customY2Max} setCustomY2Max={setCustomY2Max}
                setCustomRange2={setCustomRange2}
                customY3Min={customY3Min} setCustomY3Min={setCustomY3Min}
                customY3Max={customY3Max} setCustomY3Max={setCustomY3Max}
                setCustomRange3={setCustomRange3}
                hasSecondary={!!secondaryData}
                hasTertiary={!!tertiaryData}
                primaryDataBounds={primaryDataBounds}
                secondaryDataBounds={secondaryDataBounds}
                tertiaryDataBounds={tertiaryDataBounds}
                toggleChartMode={toggleChartMode}
                isInDifferenceMode={isInDifferenceMode}
                hasData={Object.keys(primaryData).length > 0}
                canShowDifferenceChart={canShowDifferenceChart}
            />
        </div>
    );
};

export default React.memo(MyChart);