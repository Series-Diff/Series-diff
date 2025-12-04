import React from "react";
import Plot from "react-plotly.js";
import { useChartState } from "./useChartState";
import { useChartInteractions } from "./useChartInteractions";
import { buildTraces } from "./tracesBuilder";
import ChartControls from "./ChartControls";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

interface MyChartProps {
    primaryData: Record<string, TimeSeriesEntry[]>;
    secondaryData?: Record<string, TimeSeriesEntry[]>;
    title?: string;
    syncColorsByFile?: boolean;
}

const MyChart: React.FC<MyChartProps> = ({ primaryData, secondaryData, title, syncColorsByFile =true}) => {
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
        visibleMap, setVisibleMap,
        handleRelayout,
    } = useChartState(primaryData, secondaryData);

    // Extract interaction handlers from hook
    const { handleLegendClick, containerRef } = useChartInteractions(setVisibleMap);

    // Build traces using utility function
    const traces = buildTraces(primaryData, secondaryData, visibleMap, showMarkers, syncColorsByFile);

    return (
        <>
            <div ref={containerRef} style={{ width: "100%" }}>
                <Plot
                    data={traces}
                    layout={{
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
                        },
                        yaxis: {
                            title: { text: Object.keys(primaryData)[0]?.split('.')[0] || 'Y-Axis' },
                            side: 'left',
                            autorange: customRange ? false : true,
                            range: customRange ? [parseFloat(customYMin), parseFloat(customYMax)] : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            spikethickness: 1
                        },
                        yaxis2: {
                            title: { text: secondaryData ? Object.keys(secondaryData)[0]?.split('.')[0] || 'Second Y-Axis' : '' },
                            overlaying: 'y',
                            autorange: customRange2 ? false : true,
                            range: customRange2 ? [parseFloat(customY2Min), parseFloat(customY2Max)] : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            side: 'right',
                            spikethickness: 1
                        },
                        height: 600,
                        legend: { orientation: "h" },
                        plot_bgcolor: 'white',
                        dragmode: 'pan',
                    }}
                    style={{ width: '100%' }}
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
                customYMin={customYMin} setCustomYMin={setCustomYMin} customYMax={customYMax} setCustomYMax={setCustomYMax} setCustomRange={setCustomRange}
                customY2Min={customY2Min} setCustomY2Min={setCustomY2Min} customY2Max={customY2Max} setCustomY2Max={setCustomY2Max} setCustomRange2={setCustomRange2}
                hasSecondary={!!secondaryData}
            />

        </>
    );
};
export default React.memo(MyChart);