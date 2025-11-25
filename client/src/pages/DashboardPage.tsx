// src/DashboardPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import { sendProcessedTimeSeriesData } from '../services/uploadTimeSeries';
import { MyChart } from '../components/Chart/Chart';
import { fetchTimeSeriesData, TimeSeriesEntry } from '../services/fetchTimeSeries';
import { DataImportPopup } from '../components/DataImportPopup/DataImportPopup';
import Metrics, {CombinedMetric} from "../components/Metric/Metrics";
import {fetchAllMeans} from "../services/fetchAllMeans";
import {extractFilenamesPerCategory} from "../services/extractFilenamesPerCategory";
import {fetchAllMedians} from "../services/fetchAllMedians";
import {fetchAllVariances} from "../services/fetchAllVariances";
import {fetchAllStdDevs} from "../services/fetchAllStdDevs";
import Select from'../components/Select/Select';
import Dropdown from '../components/Dropdown/Dropdown';
import {fetchAllAutoCorrelations} from "../services/fetchAllAutoCorrelations";
import { fetchAllCrossCorrelations } from "../services/fetchAllCrossCorrelations";
import metrics from "../components/Metric/Metrics";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";




function DashboardPage() {
  const [chartData, setChartData] = useState<Record<string, TimeSeriesEntry[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [meanValues, setMeanValues] = useState<Record<string, Record<string, number>>>({});
  const [medianValues, setMedianValues] = useState<Record<string, Record<string, number>>>({});
  const [varianceValues, setVarianceValues] = useState<Record<string, Record<string, number>>>({});
  const [stdDevsValues, setStdDevsValues] = useState<Record<string, Record<string, number>>>({});
  const [filenamesPerCategory, setFilenamesPerCategory] = useState<Record<string, string[]>>({});
  const [dataPreview, setDataPreview] = useState<Record<string, any> | null>(null);
  const [groupedMetrics, setGroupedMetrics] = useState<Record<string, CombinedMetric[]>>({});
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rangePerCategory, setRangePerCategory] = useState<{ [key: string]: { min: number | '', max: number | '' } }>({});




  const [filteredData, setFilteredData] = useState<{
  primary: Record<string, TimeSeriesEntry[]>;
  secondary: Record<string, TimeSeriesEntry[]> | null;
  }>

({ primary: {}, secondary: null });
    const [selectedCategory, setSelectedCategory] = useState(() => {
    const savedCategory = localStorage.getItem('selectedCategory');
    return savedCategory ? savedCategory : null;
  });
      const [secondaryCategory, setSecondaryCategory] = useState(() => {
    const savedCategory = localStorage.getItem('secondaryCategory');
    return savedCategory ? savedCategory : null;
  });

  const [autoCorrelationValues, setAutoCorrelationValues] = useState<Record<string, Record<string, number>>>({});
  const [crossCorrelationValues, setCrossCorrelationValues] = useState<Record<string, Record<string, Record<string, number>>>>({});
const filterByTime = (entries: TimeSeriesEntry[]) =>
  entries.filter(entry => {
    const time = new Date(new Date(entry.x).getTime() - 2 * 60 * 60 * 1000).getTime();
    const afterStart = !startDate || time >= startDate.getTime();
    const beforeEnd = !endDate || time <= endDate.getTime();
    return afterStart && beforeEnd;
  });


const handleRangeChange = (category: string, min: number | '', max: number | '') => {
  setRangePerCategory(prev => ({
    ...prev,
    [category]: { min, max }
  }));
};
const getFilteredPrimary = () => {
  if (!selectedCategory || !chartData[selectedCategory]) return {};

  let filtered: Record<string, TimeSeriesEntry[]> = {};

  // wybieramy serie głównej kategorii
  for (const [key, series] of Object.entries(chartData)) {
    if (key.startsWith(`${selectedCategory}.`)) {
      filtered[key] = filterByTime(series); // filtr po czasie
    }
  }


  const filterCategories = Object.entries(rangePerCategory).filter(
    ([category, range]) => category !== selectedCategory && (range.min !== '' || range.max !== '')
  );


  filterCategories.forEach(([category, range]) => {
    const { min, max } = range;
    filtered = Object.fromEntries(
      Object.entries(filtered).map(([key, series]) => [
        key,
        series.filter(item => (min === '' || item.y >= min) && (max === '' || item.y <= max))
      ])
    );
  });

  return filtered;
};


const handleFetchData = useCallback(async (showLoadingIndicator = true) => {
  if (showLoadingIndicator) setIsLoading(true);
  setError(null);
  try {
    const allSeries = await fetchTimeSeriesData();
    setChartData(allSeries);

    const names = extractFilenamesPerCategory(allSeries);
    setFilenamesPerCategory(names);

    const start = startDate ? startDate.toISOString() : undefined;
    const end = endDate ? endDate.toISOString() : undefined;

    const means = await fetchAllMeans(names, start, end);
    setMeanValues(means);

    const medians = await fetchAllMedians(names, start, end);
    setMedianValues(medians);

    const variances = await fetchAllVariances(names, start, end);
    setVarianceValues(variances);

    const stdDevs = await fetchAllStdDevs(names, start, end);
    setStdDevsValues(stdDevs);

    setSelectedCategory(Object.keys(names)[0] || null);
    setSecondaryCategory(null);
    
    const autoCorrelations = await fetchAllAutoCorrelations(names, start, end);
    setAutoCorrelationValues(autoCorrelations);

    const allCrossCorrelations: Record<string, Record<string, Record<string, number>>> = {};
    for (const category of Object.keys(names)) {
      const files = names[category];
      allCrossCorrelations[category] = await fetchAllCrossCorrelations(files, category, start, end);
    }
    setCrossCorrelationValues(allCrossCorrelations);
console.log("Fetched meanValues:", meanValues);

  } catch (err: any) {
    setError(err.message || 'Failed to fetch data.');
    setChartData({});
  } finally {
    if (showLoadingIndicator) setIsLoading(false);
  }
}, [startDate, endDate]);

  useEffect(() => {

    const storedData = localStorage.getItem('chartData');
    const storedMeanValues = localStorage.getItem('meanValues');
    const storedMedianValues = localStorage.getItem('medianValues');
    const storedVarianceValues = localStorage.getItem('varianceValues');
    const storedStdDevsValues = localStorage.getItem('stdDevsValues');
    const storedAutoCorrelationsValues = localStorage.getItem('autoCorrelationValues');
    const storedFilenames = localStorage.getItem('filenamesPerCategory');
    const storedCrossCorrelationsValues = localStorage.getItem('crossCorrelationValues');
    if (storedData && storedMeanValues && storedMedianValues && storedVarianceValues && storedStdDevsValues && storedAutoCorrelationsValues && storedFilenames) {
      try {
        const parsedData = JSON.parse(storedData);
        const parsedMeanValues = JSON.parse(storedMeanValues);
        const parsedMedianValues = JSON.parse(storedMedianValues);
        const parsedVarianceValues = JSON.parse(storedVarianceValues);
        const parsedStdDevsValues = JSON.parse(storedStdDevsValues);
        const parsedAutoCorrelations = JSON.parse(storedAutoCorrelationsValues);
        const parsedCrossCorrelations = storedCrossCorrelationsValues ? JSON.parse(storedCrossCorrelationsValues) : {};
        const parsedFilenames = JSON.parse(storedFilenames);

        setChartData(parsedData);
        setMeanValues(parsedMeanValues);
        setMedianValues(parsedMedianValues);
        setVarianceValues(parsedVarianceValues);
        setStdDevsValues(parsedStdDevsValues);
        setAutoCorrelationValues(parsedAutoCorrelations)
        setCrossCorrelationValues(parsedCrossCorrelations);
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
  if (!selectedCategory || Object.keys(chartData).length === 0) return;

  let primary: Record<string, TimeSeriesEntry[]> = {};

  // 1️⃣ filtrowanie po czasie dla wybranej kategorii
  for (const [key, series] of Object.entries(chartData)) {
    if (key.startsWith(`${selectedCategory}.`)) {
      primary[key] = filterByTime(series);
    }
  }

  // 2️⃣ filtracja per-file - WSZYSTKIE FILTRY RAZEM
  const fileIds = Array.from(new Set(Object.keys(primary).map(k => k.split(".")[1])));

  fileIds.forEach(fileId => {
    const seriesKeys = Object.keys(primary).filter(k => k.endsWith(`.${fileId}`));

    let allowedTimestamps: Set<string> | null = null;

    // ✅ STOSUJEMY WSZYSTKIE DOSTĘPNE FILTRY
    Object.entries(rangePerCategory).forEach(([group, range]) => {
      if (!range || (range.min === '' && range.max === '')) return;

      // Dla KAŻDEJ grupy z zakresem szukamy jej serii w tym pliku
      const seriesKey = `${group}.${fileId}`;
      
      // Szukaj danych - mogą być w primary LUB w oryginalnych chartData
      let seriesData = primary[seriesKey];
      if (!seriesData && chartData[seriesKey]) {
        seriesData = filterByTime(chartData[seriesKey]);
      }
      if (!seriesData) return;

      // Filtruj punkty według zakresu
      const timestamps = new Set(
        seriesData
          .filter(item => 
            (range.min === '' || item.y >= Number(range.min)) &&
            (range.max === '' || item.y <= Number(range.max))
          )
          .map(item => item.x)
      );

      if (allowedTimestamps === null) {
        allowedTimestamps = timestamps;
      } else {
        // PRZECIĘCIE - tylko timestampy obecne we WSZYSTKICH filtrowanych seriach
        allowedTimestamps = new Set(
          Array.from(allowedTimestamps).filter(ts => timestamps.has(ts))
        );
      }
    });

    // Nakładamy PRZECIĘCIE timestampów na WSZYSTKIE serie w pliku
    if (allowedTimestamps) {
      seriesKeys.forEach(key => {
        primary[key] = primary[key].filter(item => allowedTimestamps!.has(item.x));
      });
    } else if (allowedTimestamps) {
      // Jeśli przecięcie jest puste - wyczyść wszystkie serie
      seriesKeys.forEach(key => {
        primary[key] = [];
      });
    }
  });

  setFilteredData({ primary, secondary: null });
}, [chartData, selectedCategory, rangePerCategory, startDate, endDate]);
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
      localStorage.setItem('secondaryCategory', secondaryCategory);}
      else {
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
    if (Object.keys(crossCorrelationValues).length > 0) {
    localStorage.setItem('crossCorrelationValues', JSON.stringify(crossCorrelationValues));
    }
    if (Object.keys(filenamesPerCategory).length > 0) {
      localStorage.setItem('filenamesPerCategory', JSON.stringify(filenamesPerCategory));
    }

  }, [meanValues, medianValues, varianceValues, stdDevsValues, autoCorrelationValues, crossCorrelationValues, filenamesPerCategory]);
useEffect(() => {
  if (!chartData || Object.keys(chartData).length === 0) return;

  const updateMetrics = async () => {
    const names = extractFilenamesPerCategory(chartData);
    const start = startDate ? startDate.toISOString() : undefined;
    const end = endDate ? endDate.toISOString() : undefined;

    try {
      setIsLoading(true);

      const [means, medians, variances, stdDevs, autoCorrelations] = await Promise.all([
        fetchAllMeans(names, start, end),
        fetchAllMedians(names, start, end),
        fetchAllVariances(names, start, end),
        fetchAllStdDevs(names, start, end),
        fetchAllAutoCorrelations(names, start, end),
      ]);

      setMeanValues(means);
      setMedianValues(medians);
      setVarianceValues(variances);
      setStdDevsValues(stdDevs);
      setAutoCorrelationValues(autoCorrelations);

      const allCrossCorrelations: Record<string, Record<string, Record<string, number>>> = {};
      for (const category of Object.keys(names)) {
        const files = names[category];
        allCrossCorrelations[category] = await fetchAllCrossCorrelations(files, category, start, end);
      }
      setCrossCorrelationValues(allCrossCorrelations);

    } catch (err: any) {
      setError(err.message || "Failed to fetch metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  updateMetrics();
}, [startDate, endDate, chartData]);


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
    setFilenamesPerCategory({}); // Wyczyść kategorie plików
    setDataPreview(null);
    localStorage.removeItem('chartData');

     try {
      const resp = await fetch('/api/clear-timeseries', { method: 'DELETE' });
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
      ...autoCorrelationMetricNames,
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
  <div className="d-flex" style={{ gap: "16px" }}>
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

  <div className="d-flex flex-column" style={{ minWidth: "180px" }}>
    <label className="mb-1">Start time</label>
    <DatePicker
      selected={startDate}
      onChange={(date) => setStartDate(date)}
      showTimeSelect
      timeFormat="HH:mm"
      timeIntervals={1}
      dateFormat="yyyy-MM-dd HH:mm"
      placeholderText="Start date"
      className="form-control"
      popperPlacement="bottom-start"
    />
  </div>

  <div className="d-flex flex-column" style={{ minWidth: "180px" }}>
    <label className="mb-1">End time</label>
    <DatePicker
      selected={endDate}
      onChange={(date) => setEndDate(date)}
      showTimeSelect
      timeFormat="HH:mm"
      timeIntervals={1}
      dateFormat="yyyy-MM-dd HH:mm"
      placeholderText="End date"
      className="form-control"
      popperPlacement="bottom-start"
    />
  </div>
  


</div>

          <div className="d-flex align-items-center gap-3">
            <label htmlFor="file-upload" className={`custom-file-upload btn btn-primary rounded p-2 px-3 text-center ${isLoading ? "disabled" : ""}`}>
              {isLoading ? "Loading..." : "Upload files"}
            </label>
            <input id="file-upload" type="file" multiple accept=".json" onChange={handleFileUpload} className="d-none" disabled={isLoading} />
            <button onClick={handleReset} className="custom-file-upload btn btn-primary rounded p-2 px-3 text-center" disabled={isLoading}>
              Reset data
            </button>
          </div>
        </div>
        {error && <p className="text-danger text-center">Error: {error}</p>}
        <div className="Chart-container section-container">
          {isLoading && Object.keys(chartData).length === 0 && <p className="text-center p-4">Loading chart...</p>}
          {!isLoading && Object.keys(chartData).length === 0 && !error && <p className="text-center p-4">Load data to visualize</p>}
          {!isLoading && Object.keys(chartData).length > 0 && (
            <div className="chart-wrapper">
              <MyChart primaryData={filteredData.primary} secondaryData={filteredData.secondary || undefined} title="Time Series Analysis" />
            </div>
          )}
        </div>
        {Object.keys(groupedMetrics).length > 0 && (
          <div className="section-container" style={{ padding: "16px" }}>
            <Metrics groupedMetrics={groupedMetrics} />
          </div>
        )}
        <DataImportPopup show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles} onComplete={handlePopupComplete} />
      </div>
    </div>
    <div className="section-container group-menu d-flex flex-column align-items-center p-3 rounded">
      <h4>Groups</h4>
      {Object.entries(filenamesPerCategory).map(([category, files]) => (
    <Dropdown
      key={category}
      category={category}
      files={files}
      onFileClick={(file) => console.log('Kliknięto plik:', file)}
      onRangeChange={handleRangeChange}
    />
  ))}
    </div>
  </div>
);
}
export default DashboardPage;