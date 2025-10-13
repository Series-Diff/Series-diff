import React from "react";
import Plot from "react-plotly.js";
import { useChartState } from "./useChartState";
import { useChartInteractions } from "./useChartInteractions";
import { buildTraces } from "./tracesBuilder";
import ChartControls from "./ChartControls";
import { TimeSeriesEntry } from "@/services/fetchTimeSeries";

/**
 * MyChart: Main chart component for rendering time series data with Plotly.
 * 
 * This component orchestrates the rendering of the Plotly chart by:
 * - Managing state for ranges, formats, and visibility via custom hooks.
 * - Building traces from primary and secondary data.
 * - Handling interactions like legend clicks, relayouts, and error-prone events.
 * - Rendering controls for custom Y-axis ranges.
 * 
 * Props:
 * - primaryData: Main time series data (required).
 * - secondaryData: Optional secondary data for dual Y-axis.
 * - title: Optional chart title.
 * 
 * Modularization:
 * - State logic extracted to useChartState hook.
 * - Interaction handlers in useChartInteractions hook.
 * - Traces generation in buildTraces utility.
 * - Controls UI in ChartControls sub-component.
 * 
 * Error Handling:
 * - Intercepts unsupported mouse+keyboard combinations to prevent Plotly runtime errors.
 * - Suppresses known Plotly issues (e.g., '_hoverlayer' undefined) via global listeners.
 * - All handlers wrapped in try-catch to swallow non-critical errors gracefully.
 */
interface MyChartProps {
    primaryData: Record<string, TimeSeriesEntry[]>;
    secondaryData?: Record<string, TimeSeriesEntry[]>;
    title?: string;
}

export const MyChart: React.FC<MyChartProps> = ({ primaryData, secondaryData, title }) => {
    // Extract state and setters from hook
    const {
        xaxisRange,
        tickFormat,
        showMarkers,
        customRange,
        setCustomRange,
        customYMin,
        setCustomYMin,
        customYMax,
        setCustomYMax,
        customRange2,
        setCustomRange2,
        customY2Min,
        setCustomY2Min,
        customY2Max,
        setCustomY2Max,
        visibleMap,
        setVisibleMap,
        handleRelayout,
    } = useChartState(primaryData, secondaryData);

    // Extract interaction handlers from hook
    const { handleLegendClick, containerRef } = useChartInteractions(setVisibleMap);

    // Build traces using utility function
    const traces = buildTraces(primaryData, secondaryData, visibleMap, showMarkers);

    return (
        <>
            <div ref={containerRef} style={{ width: "100%" }}>
                <Plot
                    data={traces}
                    layout={{
                        title: title || 'Time Series Data',
                        xaxis: {
                            title: { text: 'Time' },
                            type: 'date',
                            tickformat: tickFormat,
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
                        paper_bgcolor: '#f8f9fa',
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
            />
        </>
    );
};