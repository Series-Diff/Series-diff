import React from "react";
import Plot from "react-plotly.js";
import { useChartState } from "./useChartState";
import { useChartInteractions } from "./useChartInteractions";
import { buildTraces, getColorMap } from "./tracesBuilder";
import ChartControls from "./ChartControls";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

interface MyChartProps {
    primaryData: Record<string, TimeSeriesEntry[]>;
    secondaryData?: Record<string, TimeSeriesEntry[]>;
    tertiaryData?: Record<string, TimeSeriesEntry[]>;
    manualData?: Record<string, TimeSeriesEntry[]>;
    title?: string;
    syncColorsByFile?: boolean;
    syncColorsByGroup?: boolean;
}

const MyChart: React.FC<MyChartProps> = ({
                                             primaryData,
                                             secondaryData,
                                             tertiaryData,
                                             manualData = {},
                                             title,
                                             syncColorsByFile = true,
                                             syncColorsByGroup = false
                                         }) => {
    // Extract state and setters from hook
    const {
        xaxisRange,
        tickFormat,
        showMarkers,
        customRange, setCustomRange,
        customYMin, setCustomYMin,
        customYMax, setCustomYMax,
        customRange2, setCustomRange2,
        customY2Min, setCustomY2Min,
        customY2Max, setCustomY2Max,
        customRange3, setCustomRange3,
        customY3Min, setCustomY3Min,
        customY3Max, setCustomY3Max,
        visibleMap, setVisibleMap,
        handleRelayout,
        primaryDataBounds,
        secondaryDataBounds,
        tertiaryDataBounds
    } = useChartState(primaryData, secondaryData, tertiaryData, manualData);

    // Extract interaction handlers from hook
    const { handleLegendClick, containerRef } = useChartInteractions(setVisibleMap);

    const allKeys = React.useMemo(() => [
        ...Object.keys(primaryData),
        ...(secondaryData ? Object.keys(secondaryData) : []),
        ...(tertiaryData ? Object.keys(tertiaryData) : []),
        ...Object.keys(manualData)
    ], [primaryData, secondaryData, tertiaryData, manualData]);

    const colorMap = React.useMemo(() =>
            getColorMap(allKeys, syncColorsByFile, syncColorsByGroup),
        [allKeys, syncColorsByFile, syncColorsByGroup]
    );

    const getAxisColor = (dataRecord?: Record<string, any>) => {
        if (!syncColorsByGroup || !dataRecord) return undefined;
        const firstKey = Object.keys(dataRecord)[0];
        if (!firstKey) return undefined;

        // Kluczem w mapie przy syncColorsByGroup jest pierwszy człon nazwy (część przed kropką)
        const groupKey = firstKey.split('.')[0];
        return colorMap.get(groupKey);
    };

    // Build traces using utility function
    const traces = buildTraces(
        primaryData,
        secondaryData,
        tertiaryData,
        manualData,
        visibleMap,
        showMarkers,
        syncColorsByFile,
        syncColorsByGroup,
        colorMap
    );

    return (
        <div className="d-flex flex-column h-100 gap-2">
            <div id='pdf-content-chart' ref={containerRef} style={{ width: "100%", flex: 1, minHeight: 0 }}>
                <Plot
                    data={traces}
                    layout={{
                        hovermode: "x unified",
                        hoverlabel: {
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            font: { size: 12 },
                            align: "left"
                        },
                        title: { text: title },
                        xaxis: {
                            title: { text: 'Time' },
                            type: 'date',
                            tickformat: tickFormat, // Displaying date and time
                            fixedrange: false,
                            showspikes: true,
                            spikemode: 'across',
                            spikesnap: "cursor",
                            spikedash: "solid",
                            spikethickness: 1,
                            rangeselector: {
                                buttons: [
                                    { count: 1, label: "1d", step: "day", stepmode: "backward" },
                                    { count: 7, label: "1w", step: "day", stepmode: "backward" },
                                    { count: 1, label: "1m", step: "month", stepmode: "backward" },
                                    { step: "all" }
                                ]
                            },
                            range: xaxisRange[0] && xaxisRange[1] ? xaxisRange : undefined,
                            rangeslider: {
                                visible: true,
                                thickness: 0.05,
                                bgcolor: '#f8f9fa',
                                bordercolor: '#ced4da',
                                borderwidth: 1
                            },
                            domain: tertiaryData ? [0.05, 1] : [0, 1]
                        },
                        yaxis: {
                            automargin: true,
                            zeroline: false,
                            title: {
                                text: Object.keys(primaryData)[0]?.split('.')[0] || 'Y-Axis',
                                font: { color: getAxisColor(primaryData) }
                            },
                            tickfont: { color: getAxisColor(primaryData) },
                            side: 'left',
                            // Only disable autorange when BOTH min and max are provided
                            autorange: !(customRange && customYMin !== '' && customYMax !== ''),
                            range: customRange && customYMin !== '' && customYMax !== ''
                                ? [parseFloat(customYMin), parseFloat(customYMax)]
                                : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            spikethickness: 1,
                        },
                        yaxis2: {
                            automargin: true,
                            showgrid: false,
                            title: {
                                text: secondaryData ? Object.keys(secondaryData)[0]?.split('.')[0] || 'Second Y-Axis' : '',
                                font: { color: getAxisColor(secondaryData) }
                            },
                            tickfont: { color: getAxisColor(secondaryData) },
                            overlaying: 'y',
                            // Only disable autorange when BOTH min and max are provided
                            autorange: !(customRange2 && customY2Min !== '' && customY2Max !== ''),
                            range: customRange2 && customY2Min !== '' && customY2Max !== ''
                                ? [parseFloat(customY2Min), parseFloat(customY2Max)]
                                : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            side: 'right',
                            spikethickness: 1,
                        },
                        yaxis3: {
                            title: {
                                text: tertiaryData ? Object.keys(tertiaryData)[0]?.split('.')[0] || 'Third Y-Axis' : '',
                                font: { color: getAxisColor(tertiaryData) }
                            },
                            tickfont: { color: getAxisColor(tertiaryData) },
                            overlaying: 'y',
                            // Only disable autorange when BOTH min and max are provided
                            autorange: !(customRange3 && customY3Min !== '' && customY3Max !== ''),
                            range: customRange3 && customY3Min !== '' && customY3Max !== ''
                                ? [parseFloat(customY3Min), parseFloat(customY3Max)]
                                : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            side: 'left',
                            anchor: 'free',
                            position: 0,
                            spikethickness: 1,
                            showgrid: false,
                            automargin: true,
                        },
                        height: undefined,
                        autosize: true,
                        legend: { orientation: "h" },
                        plot_bgcolor: 'white',
                        dragmode: 'pan',
                    }}
                    style={{ width: '100%', height: '100%' }}
                    config={{
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
                customYMin={customYMin}
                setCustomYMin={setCustomYMin}
                customYMax={customYMax}
                setCustomYMax={setCustomYMax}
                setCustomRange={setCustomRange}
                customY2Min={customY2Min}
                setCustomY2Min={setCustomY2Min}
                customY2Max={customY2Max}
                setCustomY2Max={setCustomY2Max}
                setCustomRange2={setCustomRange2}
                customY3Min={customY3Min}
                setCustomY3Min={setCustomY3Min}
                customY3Max={customY3Max}
                setCustomY3Max={setCustomY3Max}
                setCustomRange3={setCustomRange3}
                hasSecondary={!!secondaryData}
                hasTertiary={!!tertiaryData}
                primaryDataBounds={primaryDataBounds}
                secondaryDataBounds={secondaryDataBounds}
                tertiaryDataBounds={tertiaryDataBounds}
            />
        </div>
    );
};
export default React.memo(MyChart);