import { TimeSeriesEntry } from "@/services/fetchTimeSeries";
import { Data } from "plotly.js";

const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const MA_Suffix = / \(MA.*\)$/;

const getBaseKey = (name: string, syncByFile: boolean): string => {
  let tempName = name.replace(MA_Suffix, '');
  if (syncByFile) {
    const parts = tempName.split('.');
    if (parts.length > 1) {
      return parts.slice(1).join('.');
    }
  }
  return tempName;
};

const isMA = (name: string): boolean => {
  return MA_Suffix.test(name);
};

// Funkcja pomocnicza do wyciągania nazwy grupy (np. "Cena" z "Cena.Plik1")
const getGroupName = (key: string) => key.split('.')[0];

export const buildTraces = (
  primaryData: Record<string, TimeSeriesEntry[]>,
  secondaryData: Record<string, TimeSeriesEntry[]> | undefined,
  manualData: Record<string, TimeSeriesEntry[]>,
  visibleMap: Record<string, boolean>,
  showMarkers: boolean,
  syncColorsByFile: boolean
): Data[] => {

  const colorMap = new Map<string, string>();
  let colorIndex = 0;

  // 1. Zbieramy aktywne grupy, żeby wiedzieć co filtrować
  const activePrimaryGroups = new Set(Object.keys(primaryData).map(getGroupName));
  const activeSecondaryGroups = new Set(Object.keys(secondaryData || {}).map(getGroupName));

  // 2. Filtrujemy klucze manualne - bierzemy tylko te, które pasują do aktywnych grup
  const validManualKeys = Object.keys(manualData).filter(key => {
    const group = getGroupName(key);
    return activePrimaryGroups.has(group) || activeSecondaryGroups.has(group);
  });

  const allKeys = [
    ...Object.keys(primaryData),
    ...validManualKeys, // Dodajemy tylko pasujące klucze ręczne
    ...(secondaryData ? Object.keys(secondaryData) : [])
  ];

  allKeys.forEach(name => {
    const baseKey = getBaseKey(name, syncColorsByFile);
    if (!colorMap.has(baseKey)) {
      colorMap.set(baseKey, colors[colorIndex % colors.length]);
      colorIndex++;
    }
  });

  const createTrace = (
    name: string,
    series: TimeSeriesEntry[],
    yaxis: 'y1' | 'y2',
    isManual: boolean = false
  ): Data => {
    const baseKey = getBaseKey(name, syncColorsByFile);
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
      visible: visibleMap[name] === false ? 'legendonly' : true
    };
  };

  // --- GENEROWANIE ŚLADÓW ---

  // 1. Primary Data (Pliki) -> Y1
  const primaryTraces: Data[] = Object.entries(primaryData).map(([name, series]) =>
    createTrace(name, series, 'y1', false)
  );

  // 2. Secondary Data (Pliki) -> Y2
  const secondaryTraces: Data[] = secondaryData
    ? Object.entries(secondaryData).map(([name, series]) =>
        createTrace(name, series, 'y2', false)
      )
    : [];

  // 3. Manual Data (Ręczne) -> Rozdzielamy na Y1 i Y2 zależnie od grupy
  const manualTraces: Data[] = [];

  Object.entries(manualData).forEach(([name, series]) => {
    const group = getGroupName(name);

    // Sprawdzamy czy grupa pasuje do Primary
    if (activePrimaryGroups.has(group)) {
      manualTraces.push(createTrace(name, series, 'y1', true));
    } 
    // Sprawdzamy czy grupa pasuje do Secondary
    else if (activeSecondaryGroups.has(group)) {
      manualTraces.push(createTrace(name, series, 'y2', true));
    }
    // Jeśli nie pasuje nigdzie -> nie dodajemy do wykresu (jest ukryta)
  });

  return [...primaryTraces, ...manualTraces, ...secondaryTraces];
};