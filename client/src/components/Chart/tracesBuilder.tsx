  import { TimeSeriesEntry } from "@/services/fetchTimeSeries";
  import { Data } from "plotly.js";

  const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

  const MA_Suffix = / \(MA.*\)$/;

  const getBaseKey = (name: string): string => {
    return name.replace(MA_Suffix, '');
  };

  const isMA = (name: string): boolean => {
    return MA_Suffix.test(name);
  };

  /**
   * Utility function to build Plotly traces from data.
   * * Generates traces for primary and secondary data series, applying visibility and marker modes.
   * Maps moving average series to the same color as their source series, using a dashed line style.
   */
  export const buildTraces = (
    primaryData: Record<string, TimeSeriesEntry[]>,
    secondaryData: Record<string, TimeSeriesEntry[]> | undefined,
    visibleMap: Record<string, boolean>,
    showMarkers: boolean
  ): Data[] => {

    const colorMap = new Map<string, string>();
    let colorIndex = 0;

    const allKeys = [
      ...Object.keys(primaryData),
      ...(secondaryData ? Object.keys(secondaryData) : [])
    ];

    allKeys.forEach(name => {
      const baseKey = getBaseKey(name);
      if (!colorMap.has(baseKey)) {
        colorMap.set(baseKey, colors[colorIndex % colors.length]);
        colorIndex++;
      }
    });

    const createTrace = (
      name: string,
      series: TimeSeriesEntry[],
      yaxis: 'y1' | 'y2'
    ): Data => {
      const baseKey = getBaseKey(name);
      const color = colorMap.get(baseKey) || '#000000'; // Domyślnie czarny
      const isSeriesMA = isMA(name);

      return {
        x: series.map(d => d.x),
        y: series.map(d => d.y),
        type: 'scattergl' as const,
        mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
        name,
        line: {
          color: color,
          dash: isSeriesMA ? 'dash' : 'solid',
        },
        marker: {
          size: 5,
          color: color
        },
        yaxis: yaxis,
        visible: visibleMap[name] === false ? 'legendonly' : true
      };
    };

    const primaryTraces: Data[] = Object.entries(primaryData).map(([name, series]) =>
      createTrace(name, series, 'y1')
    );

    const secondaryTraces: Data[] = secondaryData
      ? Object.entries(secondaryData).map(([name, series]) =>
          createTrace(name, series, 'y2')
        )
      : [];

    return [...primaryTraces, ...secondaryTraces];
  };