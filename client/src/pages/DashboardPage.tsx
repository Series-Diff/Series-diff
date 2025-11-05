    // src/DashboardPage.tsx
    import React, {useState, useCallback, useEffect} from 'react';
    import './DashboardPage.css';
    import '../components/Chart/Chart.css';
    import '../components/Metric/Metrics.css';
    import '../components/Dropdown/Dropdown.css';
    import {sendProcessedTimeSeriesData} from '../services/uploadTimeSeries';
    import MyChart from '../components/Chart/Chart';
    import {fetchTimeSeriesData, TimeSeriesEntry} from '../services/fetchTimeSeries';
    import {DataImportPopup} from '../components/DataImportPopup/DataImportPopup';
    import Metrics, {CombinedMetric} from "../components/Metric/Metrics";
    import {fetchAllMeans} from "../services/fetchAllMeans";
    import {extractFilenamesPerCategory} from "../services/extractFilenamesPerCategory";
    import {fetchAllMedians} from "../services/fetchAllMedians";
    import {fetchAllVariances} from "../services/fetchAllVariances";
    import {fetchAllStdDevs} from "../services/fetchAllStdDevs";
    import {fetchAllRollingMeans} from "../services/fetchAllRollingMeans";
    import Select from '../components/Select/Select';
    import Dropdown from '../components/Dropdown/Dropdown';
    import {fetchAllAutoCorrelations} from "../services/fetchAllAutoCorrelations";
    import {fetchAllPearsonCorrelations} from "../services/fetchAllPearsonCorrelations";
    import CorrelationTable from "../components/CorrelationTable/CorrelationTable";
    import ScatterPlotModal from "../components/ScatterPlotModal/ScatterPlotModal";
    
    
    function DashboardPage() {
        const [chartData, setChartData] = useState<Record<string, TimeSeriesEntry[]>>({});
        const [error, setError] = useState<string | null>(null);
        const [isPopupOpen, setIsPopupOpen] = useState(false);
        const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
        const [isLoading, setIsLoading] = useState(false);
        const [meanValues, setMeanValues] = useState<Record<string, Record<string, number>>>({});
        const [medianValues, setMedianValues] = useState<Record<string, Record<string, number>>>({});
        const [varianceValues, setVarianceValues] = useState<Record<string, Record<string, number>>>({});
        const [rollingMeanChartData, setRollingMeanChartData] = useState<Record<string, TimeSeriesEntry[]>>({});
        const [stdDevsValues, setStdDevsValues] = useState<Record<string, Record<string, number>>>({});
        const [filenamesPerCategory, setFilenamesPerCategory] = useState<Record<string, string[]>>({});
        const [showMovingAverage, setShowMovingAverage] = useState(false);
        const [maWindow, setMaWindow] = useState('1d'); // Domyślna wartość
        const [isMaLoading, setIsMaLoading] = useState(false);
        const [dataPreview, setDataPreview] = useState<Record<string, any> | null>(null);
        const [groupedMetrics, setGroupedMetrics] = useState<Record<string, CombinedMetric[]>>({});
    
        const [filteredData, setFilteredData] = useState<{
            primary: Record<string, TimeSeriesEntry[]>;
            secondary: Record<string, TimeSeriesEntry[]> | null;
        }>({primary: {}, secondary: null});
        const [selectedCategory, setSelectedCategory] = useState(() => {
            const savedCategory = localStorage.getItem('selectedCategory');
            return savedCategory ? savedCategory : null;
        });
        const [secondaryCategory, setSecondaryCategory] = useState(() => {
            const savedCategory = localStorage.getItem('secondaryCategory');
            return savedCategory ? savedCategory : null;
        });
    
        const [autoCorrelationValues, setAutoCorrelationValues] = useState<Record<string, Record<string, number>>>({});
        const [PearsonCorrelationValues, setPearsonCorrelationValues] = useState<Record<string, Record<string, Record<string, number>>>>({});
    
        // Stan przechowujący aktualnie wybraną parę plików do porównania dla wykresu rozrzutu
        const [selectedPair, setSelectedPair] = useState<{
            file1: string | null;
            file2: string | null;
            category: string | null;
        }>({
            file1: null,
            file2: null,
            category: null,
        });
    
        // czy okno ze scatter plotem jest otwarte
        const [isScatterOpen, setIsScatterOpen] = useState(false);
    
        // Ustawia aktualną parę plików (file1, file2), a następnie otwiera okno scatter plotu
        const handleCellClick = (file1: string, file2: string, category: string) => {
            setSelectedPair({file1, file2, category});
            setIsScatterOpen(true);
        };
    
        // Czyści wybraną parę plików oraz ustawia flagę modalnego okna na false
        const handleCloseScatter = () => {
            setIsScatterOpen(false);
            setSelectedPair({file1: null, file2: null, category: null});
        };
    
        // Funkcja pomocnicza, tworząca pełny klucz dla danych złożony z kategorii i nazwy pliku
        const getFullKey = (category: string | null, file: string | null) =>
            category && file ? `${category}.${file}` : null;
    
        // Jeśli istnieje pełny klucz (category.file1), dane są pobierane z chartData, jeśli nie, zwracane jest undefined
        const data1 =
            selectedPair.category && selectedPair.file1
                ? chartData[`${selectedPair.category}.${selectedPair.file1}`]
                : undefined;
    
        const data2 =
            selectedPair.category && selectedPair.file2
                ? chartData[`${selectedPair.category}.${selectedPair.file2}`]
                : undefined;
    
    
        const handleFetchData = useCallback(async (showLoadingIndicator = true) => {
            if (showLoadingIndicator) setIsLoading(true);
            setError(null);
            try {
                const allSeries = await fetchTimeSeriesData();
                setChartData(allSeries);
    
                const names = extractFilenamesPerCategory(allSeries);
                setFilenamesPerCategory(names);
    
                const means = await fetchAllMeans(names);
                setMeanValues(means);
    
                const medians = await fetchAllMedians(names);
                setMedianValues(medians);
    
                const variances = await fetchAllVariances(names);
                setVarianceValues(variances);
    
                const stdDevs = await fetchAllStdDevs(names);
                setStdDevsValues(stdDevs);
    
                setSelectedCategory(Object.keys(names)[0] || null);
                setSecondaryCategory(null);
    
                const autoCorrelations = await fetchAllAutoCorrelations(names);
                setAutoCorrelationValues(autoCorrelations);
    
                const allPearsonCorrelations: Record<string, Record<string, Record<string, number>>> = {};
    
                for (const category of Object.keys(names)) {
                    const files = names[category];
                    allPearsonCorrelations[category] = await fetchAllPearsonCorrelations(files, category);
                }
    
                setPearsonCorrelationValues(allPearsonCorrelations);
    
    
            } catch (err: any) {
                setError(err.message || 'Failed to fetch data.');
                setChartData({}); // Wyczyść dane w przypadku błędu
            } finally {
                if (showLoadingIndicator) setIsLoading(false);
            }
        }, []);
    
        const fetchMaData = useCallback(async (window: string) => {
            if (Object.keys(filenamesPerCategory).length === 0) {
                console.log("Cannot fetch MA, categories not loaded.");
                return;
            }
            setIsMaLoading(true);
            setError(null);
            try {
                // Przekaż aktualnie wybrane okno
                const rollingMeans = await fetchAllRollingMeans(filenamesPerCategory, window);
                setRollingMeanChartData(rollingMeans);
            } catch (err: any) {
                setError(`Failed to fetch moving average data: ${err.message}`);
                setRollingMeanChartData({}); // Wyczyść w razie błędu
            } finally {
                setIsMaLoading(false);
            }
        }, [filenamesPerCategory]); // Zależne tylko od nazw plików
    
        const handleToggleMovingAverage = () => {
            const newState = !showMovingAverage;
            setShowMovingAverage(newState);
    
            if (newState) {
                // Włączanie: pobierz dane, jeśli jeszcze ich nie ma
                if (Object.keys(rollingMeanChartData).length === 0) {
                    fetchMaData(maWindow);
                }
            }
            // Wyłączanie: dane pozostają w stanie, ale useEffect ich nie użyje
        };
    
        const handleApplyMaWindow = () => {
            // Wymuś ponowne pobranie danych z nowym oknem,
            // tylko jeśli MA jest aktualnie włączone
            if (showMovingAverage) {
                fetchMaData(maWindow);
            }
        };
    
        useEffect(() => {
    
            const storedData = localStorage.getItem('chartData');
            const storedMeanValues = localStorage.getItem('meanValues');
            const storedMedianValues = localStorage.getItem('medianValues');
            const storedVarianceValues = localStorage.getItem('varianceValues');
            const storedStdDevsValues = localStorage.getItem('stdDevsValues');
            const storedAutoCorrelationsValues = localStorage.getItem('autoCorrelationValues');
            const storedFilenames = localStorage.getItem('filenamesPerCategory');
            const storedPearsonCorrelationsValues = localStorage.getItem('PearsonCorrelationValues');
    
            if (storedData && storedMeanValues && storedMedianValues && storedVarianceValues && storedStdDevsValues && storedAutoCorrelationsValues && storedFilenames) {
                try {
                    const parsedData = JSON.parse(storedData);
                    const parsedMeanValues = JSON.parse(storedMeanValues);
                    const parsedMedianValues = JSON.parse(storedMedianValues);
                    const parsedVarianceValues = JSON.parse(storedVarianceValues);
                    const parsedStdDevsValues = JSON.parse(storedStdDevsValues);
                    const parsedAutoCorrelations = JSON.parse(storedAutoCorrelationsValues);
                    const parsedPearsonCorrelations = storedPearsonCorrelationsValues ? JSON.parse(storedPearsonCorrelationsValues) : {};
                    const parsedFilenames = JSON.parse(storedFilenames);
    
                    setChartData(parsedData);
                    setMeanValues(parsedMeanValues);
                    setMedianValues(parsedMedianValues);
                    setVarianceValues(parsedVarianceValues);
                    setStdDevsValues(parsedStdDevsValues);
                    setAutoCorrelationValues(parsedAutoCorrelations)
                    setPearsonCorrelationValues(parsedPearsonCorrelations);
                    setFilenamesPerCategory(parsedFilenames);
                } catch (e) {
                    localStorage.removeItem('chartData');
                    handleFetchData();
                }
            } else {
                handleFetchData();
            }
        }, [handleFetchData]);
        useEffect(() => {
            const primary: Record<string, TimeSeriesEntry[]> = {};
            const secondary: Record<string, TimeSeriesEntry[]> = {};
            if (selectedCategory) {
                for (const [key, series] of Object.entries(chartData)) {
                    if (key.startsWith(`${selectedCategory}.`)) {
                        primary[key] = series;
                    }
                }
    
              if (showMovingAverage) {
                for (const [key, series] of Object.entries(rollingMeanChartData)) {
                  if (key.startsWith(`${selectedCategory}.`)) {
    
                    // key to np. "Value.RZ3221108.rolling_mean"
                    const parts = key.split('.');
                    const baseKey = parts.slice(0, -1).join('.');
    
                    const legendKey = `${baseKey} (MA ${maWindow})`;
    
                    primary[legendKey] = series;
                  }
                }
              }
            }
    
    
            if (secondaryCategory) {
                for (const [key, series] of Object.entries(chartData)) {
                    if (key.startsWith(`${secondaryCategory}.`)) {
                        secondary[key] = series;
                    }
                }
              if (showMovingAverage) {
                for (const [key, series] of Object.entries(rollingMeanChartData)) {
                  if (key.startsWith(`${secondaryCategory}.`)) {
    
                    // Ta sama logika, co dla osi głównej
                    const parts = key.split('.');
                    const baseKey = parts.slice(0, -1).join('.');
                    const legendKey = `${baseKey} (MA ${maWindow})`;
    
                    secondary[legendKey] = series;
                  }
                }
              }
            }
            setFilteredData({
                primary,
                secondary: Object.keys(secondary).length > 0 ? secondary : null
            });
        }, [chartData, selectedCategory, secondaryCategory, rollingMeanChartData, showMovingAverage, maWindow]);
    
        useEffect(() => {
            if (Object.keys(filenamesPerCategory).length > 0 && !selectedCategory) {
                setSelectedCategory(Object.keys(filenamesPerCategory)[0]);
            }
        }, [filenamesPerCategory, selectedCategory]);
    
    
        useEffect(() => {
            if (selectedCategory) {
                localStorage.setItem('selectedCategory', selectedCategory);
            }
        }, [selectedCategory]);
        useEffect(() => {
            if (secondaryCategory) {
                localStorage.setItem('secondaryCategory', secondaryCategory);
            } else {
                localStorage.removeItem('secondaryCategory');
            }
        }, [secondaryCategory]);
    
        useEffect(() => {
            if (Object.keys(chartData).length > 0) {
                localStorage.setItem('chartData', JSON.stringify(chartData));
            }
        }, [chartData]);
    
        useEffect(() => {
            // Zapisujemy metryki, tylko jeśli nie są puste
            if (Object.keys(meanValues).length > 0) {
                localStorage.setItem('meanValues', JSON.stringify(meanValues));
            }
            if (Object.keys(medianValues).length > 0) {
                localStorage.setItem('medianValues', JSON.stringify(medianValues));
            }
            if (Object.keys(varianceValues).length > 0) {
                localStorage.setItem('varianceValues', JSON.stringify(varianceValues));
            }
            if (Object.keys(stdDevsValues).length > 0) {
                localStorage.setItem('stdDevsValues', JSON.stringify(stdDevsValues));
            }
            if (Object.keys(autoCorrelationValues).length > 0) {
                localStorage.setItem('autoCorrelationValues', JSON.stringify(autoCorrelationValues));
            }
            if (Object.keys(PearsonCorrelationValues).length > 0) {
                localStorage.setItem('PearsonCorrelationValues', JSON.stringify(PearsonCorrelationValues));
            }
            if (Object.keys(filenamesPerCategory).length > 0) {
                localStorage.setItem('filenamesPerCategory', JSON.stringify(filenamesPerCategory));
            }
    
        }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, PearsonCorrelationValues, filenamesPerCategory]);
    
        const handleDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedCategory(event.target.value);
        };
        const handleSecondaryDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
            setSecondaryCategory(event.target.value || null);
        };
    
    
        const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            const files = Array.from(event.target.files || []);
            if (files.length > 0) {
                setSelectedFiles(files);
                setIsPopupOpen(true);
            }
            event.target.value = '';
        };
    
        const handlePopupComplete = async (groupedData: Record<string, any>) => {
            setIsPopupOpen(false); // Zamknij popup najpierw
    
            // Show preview of the first 3 entries
            const previewDates = Object.keys(groupedData).slice(0, 3);
            const preview: Record<string, any> = {};
            previewDates.forEach(date => {
                preview[date] = groupedData[date];
            });
            setDataPreview(preview);
    
            if (Object.keys(groupedData).length > 0) {
                setIsLoading(true);
                setError(null);
                await sendProcessedTimeSeriesData(groupedData, async (success) => {
                    if (!success) {
                        setError("Przetwarzanie danych lub wysyłanie na serwer nie powiodło się.");
                    } else {
                        await handleFetchData();
                    }
                    setIsLoading(false);
                });
            } else {
                console.log("Nie przetworzono żadnych danych z plików.");
            }
        };
    
    
        const handlePopupClose = () => {
            setIsPopupOpen(false);
            setSelectedFiles([]);
        };
    
        const handleReset = async () => {
            setIsLoading(true); // Pokaż wskaźnik ładowania podczas resetowania
            setError(null);
            setChartData({}); // Wyczyść dane na wykresie
            setMeanValues({});
            setMedianValues({});
            setVarianceValues({});
            setStdDevsValues({});
            setAutoCorrelationValues({});
            setGroupedMetrics({});
            setSelectedCategory(null);
            setSecondaryCategory(null);
            setRollingMeanChartData({});
            setShowMovingAverage(false);
            setMaWindow("1d");
            setFilenamesPerCategory({}); // Wyczyść kategorie plików
            setDataPreview(null);
            localStorage.removeItem('chartData');
    
            try {
                const resp = await fetch('/api/clear-timeseries', {method: 'DELETE'});
                if (!resp.ok) {
                    const errorText = await resp.text();
                    console.error("Failed to clear timeseries on backend:", errorText);
                    setError(`Nie udało się wyczyścić danych na serwerze: ${errorText}. Dane na wykresie zostały zresetowane.`);
                } else {
                    console.log("Timeseries data cleared on backend.");
                }
            } catch (err: any) {
                console.error("Error clearing timeseries on backend:", err);
                setError(`Błąd podczas czyszczenia danych na serwerze: ${err.message}. Dane na wykresie zostały zresetowane.`);
            } finally {
                setIsLoading(false);
            }
        };
    
        useEffect(() => {
            const updatedGroupedMetrics: Record<string, CombinedMetric[]> = {};
    
            const visibleCategories = [selectedCategory, secondaryCategory].filter(Boolean) as string[];
    
            visibleCategories.forEach((category) => {
                const meanMetricNames = Object.keys(meanValues[category] || {});
                const medianMetricNames = Object.keys(medianValues[category] || {});
                const varianceMetricNames = Object.keys(varianceValues[category] || {});
                const stdDevMetricNames = Object.keys(stdDevsValues[category] || {});
                const autoCorrelationMetricNames = Object.keys(autoCorrelationValues[category] || {});
    
                const allUniqueMetricNames = new Set([
                    ...meanMetricNames,
                    ...medianMetricNames,
                    ...varianceMetricNames,
                    ...stdDevMetricNames,
                    ...autoCorrelationMetricNames
                ]);
    
                updatedGroupedMetrics[category] = Array.from(allUniqueMetricNames).map((metricName) => ({
                    id: metricName,
                    name: metricName,
                    mean: meanValues[category]?.[metricName],
                    median: medianValues[category]?.[metricName],
                    variance: varianceValues[category]?.[metricName],
                    stdDev: stdDevsValues[category]?.[metricName],
                    autoCorrelation: autoCorrelationValues[category]?.[metricName],
                }));
            });
    
            setGroupedMetrics(updatedGroupedMetrics);
        }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, selectedCategory, secondaryCategory]);
    
    
        return (
            <div className="d-flex" style={{gap: "16px"}}>
                <div className="App-main-content flex-grow-1 d-flex align-items-start w-100 rounded">
                    <div className="d-flex flex-column gap-3 w-100">
                        <div className="d-flex justify-content-between align-items-center w-100 mb-3">
                            <div className="d-flex align-items-center gap-3">
                                {Object.keys(filenamesPerCategory).length > 0 && (
                                    <>
                                        <Select
                                            id="category-select"
                                            label="Main Y-Axis"
                                            selected={selectedCategory || Object.keys(filenamesPerCategory)[0]}
                                            categories={Object.keys(filenamesPerCategory)}
                                            onChange={handleDropdownChange}
                                            disabledCategory={secondaryCategory ?? undefined}
                                        />
                                        <Select
                                            id="secondary-category-select"
                                            label="Second Y-Axis"
                                            selected={secondaryCategory || ""}
                                            categories={Object.keys(filenamesPerCategory)}
                                            onChange={handleSecondaryDropdownChange}
                                            disabledCategory={selectedCategory ?? undefined}
                                            allowNoneOption
                                        />
                                    </>
                                )}
                            </div>
                          <div className="d-flex align-items-center gap-2">
                <div className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="ma-toggle"
                        checked={showMovingAverage}
                        onChange={handleToggleMovingAverage}
                        disabled={isMaLoading}
                    />
                    <label className="form-check-label" htmlFor="ma-toggle">
                        {isMaLoading ? "Loading MA..." : "Show Moving Avg"}
                    </label>
                </div>
                <input
                    type="text"
                    className="form-control"
                    style={{ width: '80px' }}
                    value={maWindow}
                    onChange={(e) => setMaWindow(e.target.value)}
                    placeholder="e.g. 1d"
                    disabled={isMaLoading}
                />
                <button
                    onClick={handleApplyMaWindow}
                    className="btn btn-secondary btn-sm"
                    disabled={isMaLoading || !showMovingAverage}
                >
                    Apply
                </button>
            </div>
                            <div className="d-flex align-items-center gap-3">
                                <label htmlFor="file-upload"
                                       className={`custom-file-upload btn btn-primary rounded p-2 px-3 text-center ${isLoading ? "disabled" : ""}`}>
                                    {isLoading ? "Loading..." : "Upload files"}
                                </label>
                                <input id="file-upload" type="file" multiple accept=".json, .csv"
                                       onChange={handleFileUpload} className="d-none" disabled={isLoading}/>
                                <button onClick={handleReset}
                                        className="custom-file-upload btn btn-primary rounded p-2 px-3 text-center"
                                        disabled={isLoading}>
                                    Reset data
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-danger text-center">Error: {error}</p>}
                        <div className="Chart-container section-container">
                            {isLoading && Object.keys(chartData).length === 0 &&
                                <p className="text-center p-4">Loading chart...</p>}
                            {!isLoading && Object.keys(chartData).length === 0 && !error &&
                                <p className="text-center p-4">Load data to visualize</p>}
                            {!isLoading && Object.keys(chartData).length > 0 && (
                                <div className="chart-wrapper">
                                    <MyChart primaryData={filteredData.primary}
                                             secondaryData={filteredData.secondary || undefined}
                                             title="Time Series Analysis"/>
                                </div>
                            )}
                        </div>
                        {Object.keys(groupedMetrics).length > 0 && (
                            <div className="section-container" style={{padding: "16px"}}>
                                <Metrics groupedMetrics={groupedMetrics}/>
                            </div>
                        )}
                        {/* Tabele korelacji – jedna lub dwie (dla wybranych osi) */}
                        {selectedCategory && PearsonCorrelationValues[selectedCategory] && (
                            <div className="section-container" style={{padding: "16px"}}>
                                <CorrelationTable
                                    data={PearsonCorrelationValues[selectedCategory]}
                                    category={selectedCategory}
                                    onCellClick={(file1, file2) =>
                                        handleCellClick(file1, file2, selectedCategory)
                                    }
                                />
    
                                {/* Jeśli wybrano drugą kategorię, pokaż jej tabelę pod spodem */}
                                {secondaryCategory && PearsonCorrelationValues[secondaryCategory] && (
                                    <div style={{marginTop: "32px"}}>
                                        <CorrelationTable
                                            data={PearsonCorrelationValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            onCellClick={(file1, file2) =>
                                                handleCellClick(file1, file2, secondaryCategory)
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        )}
    
                        {/* Scatter plot modal */}
                        <ScatterPlotModal
                            show={isScatterOpen}
                            onHide={handleCloseScatter}
                            file1={selectedPair.file1}
                            file2={selectedPair.file2}
                            data1={data1}
                            data2={data2}
                        />
    
    
                        <DataImportPopup show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles}
                                         onComplete={handlePopupComplete}/>
                    </div>
                </div>
                <div className="section-container group-menu d-flex flex-column align-items-center p-3 rounded">
                    <h4>Groups</h4>
                    {Object.entries(filenamesPerCategory).map(([category, files]) => (
                        <Dropdown key={category} category={category} files={files} onFileClick={() => {
                        }}/>
                    ))}
                </div>
            </div>
        );
    }
    
    export default DashboardPage;
