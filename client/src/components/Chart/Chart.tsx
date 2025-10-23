import {useState, useEffect} from "react";
import Plot from "react-plotly.js";
import {TimeSeriesEntry} from "@/services/fetchTimeSeries";

interface MyChartProps {
    primaryData: Record<string, TimeSeriesEntry[]>;
    secondaryData?: Record<string, TimeSeriesEntry[]>;
    title?: string;
}

export const MyChart: React.FC<MyChartProps> = ({primaryData, secondaryData, title}) => {
    const [xaxisRange, setXaxisRange] = useState<[string | null, string | null]>([null, null]);
    const [tickFormat, setTickFormat] = useState('%d.%m.%Y'); // przed zoomem tylko dzień
    const [showMarkers, setShowMarkers] = useState(false);
    const [customRange, setCustomRange] = useState(false);
    const [customYMin, setCustomYMin] = useState<string>('');
    const [customYMax, setCustomYMax] = useState<string>('');
    const [customRange2, setCustomRange2] = useState(false);
    const [customY2Min, setCustomY2Min] = useState<string>('');
    const [customY2Max, setCustomY2Max] = useState<string>('');
    const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
    const allData = {...primaryData, ...(secondaryData || {})};
    useEffect(() => { // ten hook pozwala na dynamiczny zakres osi X od razu po załadowaniu danych, bez niego najpierw trzeba odświeżyć stronę
    const allXValues = Object.values(allData).flat().map(d => new Date(d.x));
    if (allXValues.length === 0) return;

    const minDate = new Date(Math.min(...allXValues.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allXValues.map(d => d.getTime())));

    const fakeEvent = {
        'xaxis.range[0]': minDate.toISOString(),
        'xaxis.range[1]': maxDate.toISOString(),
    };

    handleRelayout(fakeEvent);
}, [primaryData, secondaryData]);

    const handleLegendClick = (event: any) => {
    const name = event.data[event.curveNumber].name;
    setVisibleMap(prev => ({
        ...prev,
        [name]: !(prev[name] ?? true) // toggle widoczności
    }));
    return false; // zapobiega domyślnemu zachowaniu Plotly
};

    const handleRelayout = (event: any) => {
        if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
            const rangeStart = new Date(event['xaxis.range[0]']);
            const rangeEnd = new Date(event['xaxis.range[1]']);
            const diffMs = rangeEnd.getTime() - rangeStart.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 24 * 3) {
                setTickFormat('%d.%m %H:%M'); // zmiana formatu na dzień i godziny
                setShowMarkers(diffHours < 3); // jeżeli mniej niż 3h, to pokaż markery
            } else if (diffHours < 24 * 5) { // mniej niż 5 dni
                 setTickFormat('%d.%m.%Y %H:%M');
                 setShowMarkers(false);
            }
            else {
                setTickFormat('%d.%m.%Y');
                setShowMarkers(false);
            }
            setXaxisRange([event['xaxis.range[0]'], event['xaxis.range[1]']]);
        } else if (event['xaxis.autorange'] === true) {
            setXaxisRange([null, null]); // Resetowanie zakresu osi X
            setTickFormat('%d.%m.%Y'); // Przywrócenie domyślnego formatu
            setShowMarkers(false); // Przywrócenie domyślnych markerów
        }
    };
// Tworzymy mapę kolorów dla plików
const fileColors: Record<string, string> = {};
const availableColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
    '#bcbd22', '#17becf'
];
let colorIndex = 0;

// Funkcja do wyciągania "nazwy pliku" z nazwy serii
const getFileName = (seriesName: string) => {
    return seriesName.split('.')[1] || seriesName; // np. 'Sales.A' -> 'A'
};

const traces = [
    ...Object.entries(primaryData).map(([name, series]) => {
        const fileName = getFileName(name);
        if (!fileColors[fileName]) {
            fileColors[fileName] = availableColors[colorIndex % availableColors.length];
            colorIndex += 1;
        }
        const color = fileColors[fileName];
        return {
            x: series.map(d => d.x),
            y: series.map(d => d.y),
            type: 'scattergl' as const,
            mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
            name: name,
            line: { color },
            marker: { size: 5, color },
            yaxis: 'y1',
            visible: (visibleMap[name] === false ? 'legendonly' : undefined) as 'legendonly' | undefined,
        };
    }),
    ...(secondaryData
        ? Object.entries(secondaryData).map(([name, series]) => {
            const fileName = getFileName(name);
            if (!fileColors[fileName]) {
                fileColors[fileName] = availableColors[colorIndex % availableColors.length];
                colorIndex += 1;
            }
            const color = fileColors[fileName];
            return {
                x: series.map(d => d.x),
                y: series.map(d => d.y),
                type: 'scattergl' as const,
                mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
                name: name,
                line: { color },
                marker: { size: 5, color },
                yaxis: 'y2',
                visible: (visibleMap[name] === false ? 'legendonly' : undefined) as 'legendonly' | undefined,
            };
        })
        : [])
];

    return (
        <>


            <Plot
                data={traces}
                layout={{
                    title: title || 'Time Series Data',
                    xaxis: {
                        title:{text: 'Time'},
                        type: 'date',
                        tickformat: tickFormat, // Wyświetlanie daty i godziny
                        fixedrange: false,
                        showspikes: true,
                        spikemode: 'across',
                        spikesnap: "cursor",
                        spikedash: "solid",
                        spikethickness: 1,
                        rangeselector: {
                            buttons: [{count: 1, label: "1d", step: "day", stepmode: "backward"}, {
                                count: 7,
                                label: "1w",
                                step: "day",
                                stepmode: "backward"
                            }, {count: 1, label: "1m", step: "month", stepmode: "backward"}, {step: "all"}]
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
                        title:{ text: Object.keys(primaryData)[0]?.split('.')[0] || 'Y-Axis' } ,
                        side: 'left',
                        autorange: customRange ? false : true,
                        range: customRange ? [parseFloat(customYMin), parseFloat(customYMax)] : undefined,
                        showspikes: true,
                        spikemode: 'across',
                        spikedash: "solid",
                        spikethickness: 1
                    },
                    yaxis2: {
                        title: {text: secondaryData? Object.keys(secondaryData)[0]?.split('.')[0] || 'Second Y-Axis':''} ,
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
                    legend: {orientation: "h"},
                    paper_bgcolor: '#f8f9fa',
                    plot_bgcolor: 'white',
                    dragmode: 'pan'
                }}
                style={{width: '100%'}}
                config={{responsive: true,
                scrollZoom: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['select2d', 'lasso2d']}}
                onRelayout={handleRelayout}
                onLegendClick={handleLegendClick}

            />
                        <div style={{margin: '20px', textAlign: 'center'}}>
                <label>
                    Y Min:
                    <input
                        type="number"
                        value={customYMin}
                        onChange={(e) => setCustomYMin(e.target.value)}
                        style={{margin: '0 10px', width: '40px'}}
                    />
                </label>
                <label>
                    Y Max:
                    <input
                        type="number"
                        value={customYMax}
                        onChange={(e) => setCustomYMax(e.target.value)}
                        style={{margin: '0 10px', width: '40px'}}
                    />
                </label>
                <button
                    onClick={() => setCustomRange(true)}
                                className="button"

                >
                    Apply
                </button>
                <button
                    className="button"

                    onClick={() => {
                        setCustomYMin('');
                        setCustomYMax('');
                        setCustomRange(false);

                    }}
                >
                    Reset
                </button>
                            {secondaryData && (
                                <div style ={{marginTop: '20px'}}>
                                            <label>
                    Second Y Min:
                    <input
                        type="number"
                        value={customY2Min}
                        onChange={(e) => setCustomY2Min(e.target.value)}
                        style={{margin: '0 10px', width: '40px'}}
                    />
                </label>
                <label>
                    Second Y Max:
                    <input
                        type="number"
                        value={customY2Max}
                        onChange={(e) => setCustomY2Max(e.target.value)}
                        style={{margin: '0 10px', width: '40px'}}
                    />
                </label>
                <button
                    onClick={() => setCustomRange2(true)}
                                className="button"

                >
                    Apply
                </button>
                <button
                    className="button"

                    onClick={() => {
                        setCustomY2Min('');
                        setCustomY2Max('');
                        setCustomRange2(false);

                    }}
                >
                    Reset
                </button>
                                </div>
                            )}
            </div>
        </>
    );
};