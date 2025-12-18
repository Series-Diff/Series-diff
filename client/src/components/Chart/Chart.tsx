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
        primaryDataBounds,
        secondaryDataBounds,
    } = useChartState(primaryData, secondaryData);

    // Extract interaction handlers from hook
    const { handleLegendClick, containerRef } = useChartInteractions(setVisibleMap);

    // Build traces using utility function
    const traces = buildTraces(primaryData, secondaryData, visibleMap, showMarkers, syncColorsByFile);

    return (
        <div className="d-flex flex-column h-100 gap-2">
            <div id='pdf-content-chart' ref={containerRef} style={{ width: "100%", flex: 1, minHeight: 0 }}>
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
                            // Only disable autorange when BOTH min and max are provided
                            autorange: !(customRange && customYMin !== '' && customYMax !== ''),
                            range: customRange && customYMin !== '' && customYMax !== '' 
                                ? [parseFloat(customYMin), parseFloat(customYMax)] 
                                : undefined,
                            showspikes: true,
                            spikemode: 'across',
                            spikedash: "solid",
                            spikethickness: 1
                        },
                        yaxis2: {
                            title: { text: secondaryData ? Object.keys(secondaryData)[0]?.split('.')[0] || 'Second Y-Axis' : '' },
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
                            spikethickness: 1
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
                hasSecondary={!!secondaryData}
                primaryDataBounds={primaryDataBounds}
                secondaryDataBounds={secondaryDataBounds}
            />
        </div>
    );
};
export default React.memo(MyChart);