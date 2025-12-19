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
    manualData?: Record<string, TimeSeriesEntry[]>; 
    title?: string;
    syncColorsByFile?: boolean;
}

const MyChart: React.FC<MyChartProps> = ({ 
    primaryData, 
    secondaryData, 
    manualData = {}, 
    title, 
    syncColorsByFile = true
}) => {
    
   const {
        xaxisRange, tickFormat, showMarkers,
        customRange, setCustomRange, customYMin, setCustomYMin, customYMax, setCustomYMax,
        customRange2, setCustomRange2, customY2Min, setCustomY2Min, customY2Max, setCustomY2Max,
        visibleMap, setVisibleMap, handleRelayout,
    } = useChartState(primaryData, secondaryData, manualData); // <--- ZMIANA TUTAJ

    const { handleLegendClick, containerRef } = useChartInteractions(setVisibleMap);

    const traces = buildTraces(
        primaryData, 
        secondaryData, 
        manualData, 
        visibleMap, 
        showMarkers, 
        syncColorsByFile
    );

    return (
        <div>
            <div id='pdf-content-chart' ref={containerRef} style={{ width: "100%" }}>
                <Plot
                    data={traces}
                    layout={{
                        title: { text: title },
                        xaxis: {
                            title: { text: 'Time' },
                            type: 'date',
                            tickformat: tickFormat,
                            fixedrange: false,
                            showspikes: true,
                            spikemode: 'across',
                            rangeselector: { buttons: [{ count: 1, label: "1d", step: "day", stepmode: "backward" }, { step: "all" }] },
                            range: xaxisRange[0] && xaxisRange[1] ? xaxisRange : undefined,
                            rangeslider: { visible: true, thickness: 0.05 },
                        },
                        yaxis: {
                            title: { text: Object.keys(primaryData)[0]?.split('.')[0] || 'Value' },
                            autorange: !customRange,
                            range: customRange ? [parseFloat(customYMin), parseFloat(customYMax)] : undefined,
                        },
                        yaxis2: {
                            overlaying: 'y',
                            side: 'right',
                            autorange: !customRange2,
                            range: customRange2 ? [parseFloat(customY2Min), parseFloat(customY2Max)] : undefined,
                        },
                        height: 600,
                        legend: { orientation: "h" },
                    }}
                    style={{ width: '100%' }}
                    config={{ responsive: true, scrollZoom: true, displaylogo: false }}
                    onRelayout={handleRelayout}
                    onLegendClick={handleLegendClick}
                />
            </div>
            <ChartControls
                customYMin={customYMin} setCustomYMin={setCustomYMin} customYMax={customYMax} setCustomYMax={setCustomYMax} setCustomRange={setCustomRange}
                customY2Min={customY2Min} setCustomY2Min={setCustomY2Min} customY2Max={customY2Max} setCustomY2Max={setCustomY2Max} setCustomRange2={setCustomRange2}
                hasSecondary={!!secondaryData}
            />
        </div>
    );
};
export default React.memo(MyChart);