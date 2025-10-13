import { TimeSeriesEntry } from "@/services/fetchTimeSeries";
import { Data } from "plotly.js";

/**
 * Utility function to build Plotly traces from data.
 * 
 * Generates traces for primary and secondary data series, applying visibility and marker modes.
 * Uses a predefined color palette for series differentiation.
 * 
 * Parameters:
 * - primaryData: Main data series.
 * - secondaryData: Optional secondary series.
 * - visibleMap: Visibility state for each series.
 * - showMarkers: Flag to show markers on lines.
 * 
 * Returns: Array of Plotly trace objects.
 */
export const buildTraces = (
  primaryData: Record<string, TimeSeriesEntry[]>,
  secondaryData: Record<string, TimeSeriesEntry[]> | undefined,
  visibleMap: Record<string, boolean>,
  showMarkers: boolean
): Data[] => {
  const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

  const primaryTraces: Data[] = Object.entries(primaryData).map(([name, series], index) => ({
    x: series.map(d => d.x),
    y: series.map(d => d.y),
    type: 'scattergl' as const,
    mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
    name,
    line: { color: colors[index % colors.length] },
    marker: { size: 5, color: colors[index % colors.length] },
    yaxis: 'y1',
    visible: visibleMap[name] === false ? 'legendonly' : true
  }));

  const secondaryTraces: Data[] = secondaryData
    ? Object.entries(secondaryData).map(([name, series], index) => ({
      x: series.map(d => d.x),
      y: series.map(d => d.y),
      type: 'scattergl' as const,
      mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
      name,
      line: { color: colors[(index + Object.keys(primaryData).length) % colors.length] },
      marker: { size: 5, color: colors[(index + Object.keys(primaryData).length) % colors.length] },
      yaxis: 'y2',
      visible: visibleMap[name] === false ? 'legendonly' : true
    }))
    : [];

  return [...primaryTraces, ...secondaryTraces];
};