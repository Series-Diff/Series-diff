import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';
import { useManualData } from '../hooks/useManualData';
import { useGlobalCache } from '../contexts/CacheContext';
import { cacheAPI } from '../utils/cacheApiWrapper';

import ControlsPanel from './Dashboard/components/ControlsPanel';
import DifferenceSelectionPanel from './Dashboard/components/DifferenceSelectionPanel';

function DashboardPage() {
    const [chartMode, setChartMode] = useState<'standard' | 'difference'>('standard');
    const globalCache = useGlobalCache();

    const { chartData, error, setError, isLoading, setIsLoading, filenamesPerCategory, handleFetchData, handleReset: baseReset } = hooks.useDataFetching();

    // Load cached data on mount (same as DataPage)
    useEffect(() => {
        const storedData = localStorage.getItem('chartData');
        const storedFilenames = localStorage.getItem('filenamesPerCategory');

        if (storedData && storedFilenames) {
            try {
                JSON.parse(storedData);
                JSON.parse(storedFilenames);
                // Data is already loaded by useDataFetching hook
            } catch (e) {
                console.warn('Failed to parse cached data on DashboardPage', e);
            }
        }
    }, []);

    const { manualData, addManualData, clearManualData, removeByFileId, removeTimestampFromGroup, updateManualPoint } = useManualData();
    const [showManualModal, setShowManualModal] = useState(false);
    const [showManualEdit, setShowManualEdit] = useState(false);

    const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);

    const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);

    const { startDate, endDate, pendingStartDate, pendingEndDate, handleStartChange, handleEndChange, applyPendingDates, resetDates, defaultMinDate, defaultMaxDate, ignoreTimeRange, setIgnoreTimeRange, } = hooks.useDateRange(Object.entries(chartData).map(([_, entries]) => ({ entries })), manualData);

    const { selectedCategory, secondaryCategory, tertiaryCategory, handleRangeChange, syncColorsByFile, colorSyncMode, setColorSyncMode, syncColorsByGroup, filteredData, filteredManualData, handleDropdownChange, handleSecondaryDropdownChange, handleTertiaryDropdownChange, resetChartConfig } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate, manualData);

    // Determine if time range is pending (we want to avoid firing requests without start/end)
    const startChanged = !!(pendingStartDate && startDate && pendingStartDate.getTime() !== startDate.getTime());
    const endChanged =   !!(pendingEndDate && endDate && pendingEndDate.getTime() !== endDate.getTime());
    const timeRangePending: boolean = !ignoreTimeRange && !!Object.keys(chartData).length && (
        !startDate || !endDate || startChanged || endChanged
    );

    const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics } = hooks.useMetricCalculations(
        filenamesPerCategory,
        selectedCategory,
        secondaryCategory,
        tertiaryCategory,
        ignoreTimeRange ? null : startDate,
        ignoreTimeRange ? null : endDate,
        timeRangePending,
        defaultMinDate,
        defaultMaxDate
    );

    const { scatterPoints, isScatterLoading, isScatterOpen, selectedPair, handleCloseScatter, handleCellClick } = hooks.useScatterPlot();
    const { showTitleModal, setShowTitleModal, reportTitle, setReportTitle, isExporting, handleExportClick, handleExportToPDF } = hooks.useExport(chartData);
    const [layoutMode, setLayoutMode] = useState<'overlay' | 'stacked'>('overlay');
    const { dataImportPopupRef, resetAllData } = hooks.useDataImportPopup();
    const { userMetrics, selectedMetricsForDisplay, setSelectedMetricsForDisplay, showMetricsModal, setShowMetricsModal, filteredGroupedMetrics, shouldShowMetric } = hooks.useMetricsSelection(groupedMetrics);

    const { plugins } = hooks.useLocalPlugins();

    const hasData = Object.keys(chartData).length > 0;
    const enabledPlugins = useMemo(() => plugins.filter(p => p.enabled), [plugins]);

    // Execute plugins based on selection - filtering happens inside usePluginResults
    const {
        pluginResults,
        pluginErrors,
        isLoadingPlugins,
        refreshPluginResults,
        resetPluginResults
    } = hooks.usePluginResults(
        filenamesPerCategory,
        plugins,
        selectedMetricsForDisplay,
        ignoreTimeRange ? null : (startDate && endDate ? startDate.toISOString() : null),
        ignoreTimeRange ? null : (startDate && endDate ? endDate.toISOString() : null),
        timeRangePending,
        defaultMinDate,
        defaultMaxDate
    );

    // Filter plugins for display after execution
    const visiblePlugins = useMemo(
        () => enabledPlugins.filter(p => shouldShowMetric(p.id)),
        [enabledPlugins, shouldShowMetric]
    );

    // Difference chart hook
    const {
        selectedDiffCategory,
        selectedDifferences,
        reversedDifferences,
        customToleranceValue,
        isDiffLoading,
        diffError,
        differenceChartData,
        differenceOptions,
        handleDiffCategoryChange,
        handleDifferenceCheckboxChange,
        handleReverseToggle,
        handleSelectAllToggle,
        setCustomToleranceValue,
        handleApplyTolerance,
        handleResetTolerance,
        resetDifferenceChart,
    } = hooks.useDifferenceChart(
        filenamesPerCategory,
        setError,
        ignoreTimeRange ? null : (startDate && endDate ? startDate.toISOString() : null),
        ignoreTimeRange ? null : (startDate && endDate ? endDate.toISOString() : null),
        timeRangePending,
        defaultMinDate,
        defaultMaxDate
    );

    const handleReset = async () => {
        setChartMode('standard');
        
        // Get cache stats before clearing
        const metricsStats = globalCache.metricsCache.size;
        const pluginStats = globalCache.pluginCache.size;
        const scatterStats = globalCache.scatterCache.size;
        const totalSize = metricsStats + pluginStats + scatterStats;

        const cacheApiKeysBefore = (await cacheAPI.keys()).length;
        
        // Clear global cache (now async)
        await globalCache.clearAllCaches();

        const cacheApiKeysAfter = (await cacheAPI.keys()).length;
        
        // Log cleanup with cache API stats
        console.log(
            `Caches cleared: ${totalSize} entries removed (Metrics: ${metricsStats}, Plugin: ${pluginStats}, Scatter: ${scatterStats}); ` +
            `CacheAPI entries: ${cacheApiKeysBefore} -> ${cacheApiKeysAfter}`
        );
        
        await baseReset();
        resetMetrics();
        resetChartConfig();
        resetMovingAverage();
        resetFileUpload();
        resetPluginResults();
        resetDifferenceChart();
        resetDates();
        clearManualData();
        resetAllData();
    };

    const hasDifferenceData = Object.keys(differenceChartData).length > 0;
    const isInDifferenceMode = chartMode === 'difference';

    const hasEnoughFilesForDifference = Object.values(filenamesPerCategory).some(files => files.length >= 2);
    // Count unique files across all categories (don't duplicate count if same file appears in multiple categories)
    const uniqueFileSet = new Set(Object.values(filenamesPerCategory).flat());
    const totalFilesLoaded = uniqueFileSet.size;

    const needsFullHeight = isInDifferenceMode || !hasData;

    const mainStyle = needsFullHeight ? {
        gap: "16px",
        height: `calc(100vh - var(--nav-height) - 2 * var(--section-margin))`,
        overflow: "hidden" as const
    } : {
        gap: "16px",
        minHeight: `calc(100vh - var(--nav-height) - 2 * var(--section-margin))`
    };

    const chartLayoutClass = `d-flex flex-column gap-3 w-100 flex-grow-1${needsFullHeight ? ' h-100' : ''}`;
    const chartContainerClass = `Chart-container section-container position-relative flex-grow-1`;

    const toggleChartMode = useCallback(() => {
        setChartMode(prev => prev === 'standard' ? 'difference' : 'standard');
    }, []);

    // Compute metric visibility flags to avoid circular dependencies
    const canShowMovingAverage = shouldShowMetric('moving_average');
    const canShowDifferenceChart = shouldShowMetric('difference_chart');

    // Auto-disable features when deselected in modal
    useEffect(() => {
        // If moving_average is deselected and currently active, turn it off
        if (!canShowMovingAverage && showMovingAverage) {
            handleToggleMovingAverage();
        }

        // If difference_chart is deselected and in difference mode, switch to standard
        if (!canShowDifferenceChart && isInDifferenceMode) {
            setChartMode('standard');
        }
    }, [canShowMovingAverage, canShowDifferenceChart, showMovingAverage, isInDifferenceMode, handleToggleMovingAverage]);

    return (
        <div className="d-flex" style={mainStyle}>
            <div className="App-main-content flex-grow-1 d-flex align-items-start w-100 rounded">
                <div className={chartLayoutClass}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        height: `calc(100vh - var(--nav-height) - 2 * var(--section-margin))`,
                        overflow: 'hidden'
                    }}>
                        {/* Controls Panel */}
                        {isInDifferenceMode ? (
                            <ControlsPanel
                                mode="difference"
                                filenamesPerCategory={filenamesPerCategory}
                                selectedDiffCategory={selectedDiffCategory}
                                handleDiffCategoryChange={handleDiffCategoryChange}
                                customToleranceValue={customToleranceValue}
                                setCustomToleranceValue={setCustomToleranceValue}
                                handleApplyTolerance={handleApplyTolerance}
                                handleResetTolerance={handleResetTolerance}
                                isDiffLoading={isDiffLoading}
                                isLoading={isLoading}
                                handleFileUpload={handleFileUpload}
                                handleReset={handleReset}
                            />
                        ) : (
                            <ControlsPanel
                                mode="standard"
                                selectedCategory={selectedCategory}
                                secondaryCategory={secondaryCategory}
                                tertiaryCategory={tertiaryCategory}
                                filenamesPerCategory={filenamesPerCategory}
                                handleDropdownChange={handleDropdownChange}
                                handleSecondaryDropdownChange={handleSecondaryDropdownChange}
                                handleTertiaryDropdownChange={handleTertiaryDropdownChange}
                                showMovingAverage={shouldShowMetric('moving_average') ? showMovingAverage : undefined}
                                handleToggleMovingAverage={shouldShowMetric('moving_average') ? handleToggleMovingAverage : undefined}
                                isMaLoading={isMaLoading}
                                maWindow={maWindow}
                                setMaWindow={setMaWindow}
                                handleApplyMaWindow={handleApplyMaWindow}
                                colorSyncMode={colorSyncMode}
                                setColorSyncMode={setColorSyncMode}
                                isLoading={isLoading}
                                handleFileUpload={handleFileUpload}
                                handleReset={handleReset}
                                layoutMode={layoutMode}
                                setLayoutMode={setLayoutMode}
                            />
                        )}

                        {/* Error Display */}
                        {error && !error.includes('No overlapping timestamps') && !error.includes('tolerance') && !error.includes('no units specified') && (
                            <p className="text-danger text-center mb-0">Error: {error}</p>
                        )}

                        {/* Chart Container */}
                        <div
                            className={chartContainerClass}
                            style={{ flex: 1, minHeight: 0 }}
                        >
                            {/* Switch to Standard Chart button - always visible in difference mode */}
                            {isInDifferenceMode && canShowDifferenceChart && (
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={toggleChartMode}
                                    style={{
                                        position: 'absolute',
                                        bottom: '16px',
                                        right: '16px',
                                        zIndex: 10
                                    }}
                                >
                                    Switch to Standard Chart
                                </Button>
                            )}
                            {!isInDifferenceMode && (
                                <>
                                    {isLoading && !hasData &&
                                        <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1">
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Loading chart...
                                        </div>}
                                    {!isLoading && !hasData && !error &&
                                        <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1">
                                            Load data to visualize
                                        </div>}
                                    {!isLoading && hasData && (
                                        <>
                                            <div className="d-flex w-100 px-2 pb-1">
                                                <div className="d-flex gap-3 w-100">
                                                    <components.DateTimePicker
                                                        label="Start"
                                                        value={pendingStartDate}
                                                        onChange={handleStartChange}
                                                        minDate={defaultMinDate}
                                                        maxDate={(pendingEndDate ?? endDate) ?? defaultMaxDate}
                                                        openToDate={pendingStartDate ?? defaultMinDate} />

                                                    <components.DateTimePicker
                                                        label="End"
                                                        value={pendingEndDate}
                                                        onChange={handleEndChange}
                                                        minDate={(pendingStartDate ?? startDate) ?? defaultMinDate}
                                                        maxDate={defaultMaxDate}
                                                        openToDate={pendingEndDate ?? defaultMaxDate}
                                                    />

                                                    {!ignoreTimeRange && (
                                                        <div className="d-flex align-items-center">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                disabled={!pendingStartDate || !pendingEndDate}
                                                                onClick={applyPendingDates}
                                                            >
                                                                Apply
                                                            </Button>
                                                        </div>
                                                    )}

                                                    <div className="d-flex align-items-center">
                                                        <Form.Check
                                                            type="switch"
                                                            id="date-filter-toggle"
                                                            label={<span className="text-nowrap small text-muted">Calculate metrics on full date range</span>}
                                                            title="Enabling this option will recalculate metrics and statistics based on all available data. Disabling it will allow calculations only based on the selected date range."
                                                            checked={ignoreTimeRange}
                                                            onChange={(e) => setIgnoreTimeRange(e.target.checked)}
                                                            className="mb-0" />
                                                    </div>
                                                    <div className="ms-auto d-flex align-items-center gap-2">
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => Object.keys(manualData).length === 0 ? setShowManualModal(true) : setShowManualEdit(true)}
                                                        >
                                                            Manual Measurements
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="chart-wrapper flex-grow-1" style={{ height: '100%' }}>
                                                <components.MyChart
                                                    primaryData={filteredData.primary}
                                                    secondaryData={filteredData.secondary || undefined}
                                                    tertiaryData={filteredData.tertiary || undefined}
                                                    syncColorsByFile={syncColorsByFile}
                                                    syncColorsByGroup={syncColorsByGroup}
                                                    layoutMode={layoutMode}
                                                    manualData={filteredManualData}
                                                    toggleChartMode={toggleChartMode}
                                                    isInDifferenceMode={isInDifferenceMode}
                                                    canShowDifferenceChart={canShowDifferenceChart}
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            {/* Difference Chart Mode */}
                            {isInDifferenceMode && canShowDifferenceChart && (
                                <>
                                    {!hasData && !isLoading && !error && (
                                        <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 flex-fill">
                                            Load data to visualize differences
                                        </div>
                                    )}
                                    {hasData && !hasEnoughFilesForDifference && (
                                        <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1 flex-fill">
                                            <div>
                                                <p className="mb-2">Difference chart requires at least 2 files in the same category.</p>
                                            </div>
                                            <div className="text-muted small">
                                                {totalFilesLoaded} file{totalFilesLoaded !== 1 ? 's' : ''} across {Object.keys(filenamesPerCategory).length} categor{Object.keys(filenamesPerCategory).length !== 1 ? 'ies' : 'y'}
                                            </div>
                                        </div>
                                    )}
                                    {hasData && hasEnoughFilesForDifference && (
                                        <>
                                            {isDiffLoading && (
                                                <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 flex-fill">
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    Loading difference data...
                                                </div>
                                            )}
                                            {!isDiffLoading && diffError && (
                                                <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 flex-fill text-center">
                                                    <div>
                                                        <p className="mb-2">Unable to render difference chart with current tolerance.</p>
                                                        <p className="small mb-0">{diffError.includes('No overlapping timestamps') ? 'No overlapping timestamps within tolerance. Reset tolerance to see the chart.' : diffError}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {!isDiffLoading && !diffError && !hasDifferenceData && !error && (
                                                <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 flex-fill">
                                                    Select differences to visualize
                                                </div>
                                            )}
                                            {!isDiffLoading && !diffError && hasDifferenceData && (
                                                <div className="chart-wrapper flex-grow-1" style={{ height: '100%' }}>
                                                    <components.MyChart
                                                        primaryData={differenceChartData}
                                                        toggleChartMode={toggleChartMode}
                                                        isInDifferenceMode={isInDifferenceMode}
                                                        canShowDifferenceChart={canShowDifferenceChart}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Standard mode specific sections */}
                    {!isInDifferenceMode && (
                        <>
                            {(hasData && Object.keys(groupedMetrics).length > 0) && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <div className="d-flex justify-content-end align-items-center gap-2">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => setShowMetricsModal(true)}
                                        >
                                            Select Metrics
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleExportClick}
                                            disabled={!hasData || isExporting}
                                        >
                                            {isExporting ? 'Exporting...' : 'Export to PDF'}
                                        </Button>
                                        {isExporting && <Spinner animation="border" size="sm" />}
                                    </div>
                                    {Object.keys(filteredGroupedMetrics).length > 0 ? (
                                        <components.Metrics groupedMetrics={filteredGroupedMetrics} />
                                    ) : (selectedMetricsForDisplay !== null && selectedMetricsForDisplay.size === 0) ? (
                                        <div className="text-muted fst-italic">
                                            No metrics selected. Use "Select Metrics" to choose which metrics to display.
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {shouldShowMetric('pearson_correlation') && selectedCategory && PearsonCorrelationValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.CorrelationTable
                                        data={PearsonCorrelationValues[selectedCategory]}
                                        category={selectedCategory}
                                        onCellClick={(file1, file2) =>
                                            handleCellClick(file1, file2, selectedCategory, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate)
                                        }
                                        metric="Pearson Correlation"
                                        metricKey="pearson_correlation"
                                    />

                                    {secondaryCategory && PearsonCorrelationValues[secondaryCategory] && (
                                          <components.CorrelationTable
                                              data={PearsonCorrelationValues[secondaryCategory]}
                                              category={secondaryCategory}
                                              onCellClick={(file1, file2) =>
                                                  handleCellClick(file1, file2, secondaryCategory, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate)
                                              }
                                              metric="Pearson Correlation"
                                              metricKey="pearson_correlation"
                                              showInfoIcon={false}
                                          />
                                    )}

                                    {tertiaryCategory && PearsonCorrelationValues[tertiaryCategory] && (
                                          <components.CorrelationTable
                                              data={PearsonCorrelationValues[tertiaryCategory]}
                                              category={tertiaryCategory}
                                              onCellClick={(file1, file2) =>
                                                  handleCellClick(file1, file2, tertiaryCategory, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate)
                                              }
                                              metric="Pearson Correlation"
                                              metricKey="pearson_correlation"
                                              showInfoIcon={false}
                                          />
                                    )}
                                </div>
                            )}

                            {shouldShowMetric('cosine_similarity') && selectedCategory && CosineSimilarityValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.CorrelationTable
                                        data={CosineSimilarityValues[selectedCategory]}
                                        category={selectedCategory}
                                        clickable={false}
                                        metric="Cosine Similarity"
                                        metricKey="cosine_similarity"
                                    />

                                    {secondaryCategory && CosineSimilarityValues[secondaryCategory] && (
                                        <components.CorrelationTable
                                            data={CosineSimilarityValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            clickable={false}
                                            metric="Cosine Similarity"
                                            metricKey="cosine_similarity"
                                            showInfoIcon={false}
                                        />
                                    )}

                                    {tertiaryCategory && CosineSimilarityValues[tertiaryCategory] && (
                                        <components.CorrelationTable
                                            data={CosineSimilarityValues[tertiaryCategory]}
                                            category={tertiaryCategory}
                                            clickable={false}
                                            metric="Cosine Similarity"
                                            metricKey="cosine_similarity"
                                            showInfoIcon={false}
                                        />
                                    )}
                                </div>
                            )}

                            {shouldShowMetric('mae') && selectedCategory && maeValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.StandardTable
                                        data={maeValues[selectedCategory]}
                                        category={selectedCategory}
                                        metric="MAE"
                                        metricKey="mae"
                                    />

                                    {secondaryCategory && maeValues[secondaryCategory] && (
                                        <components.StandardTable
                                            data={maeValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            metric="MAE"
                                            metricKey="mae"
                                            showInfoIcon={false}
                                        />
                                    )}

                                    {tertiaryCategory && maeValues[tertiaryCategory] && (
                                        <components.StandardTable
                                            data={maeValues[tertiaryCategory]}
                                            category={tertiaryCategory}
                                            metric="MAE"
                                            metricKey="mae"
                                            showInfoIcon={false}
                                        />
                                    )}
                                </div>
                            )}

                            {shouldShowMetric('rmse') && selectedCategory && rmseValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.StandardTable
                                        data={rmseValues[selectedCategory]}
                                        category={selectedCategory}
                                        metric="RMSE"
                                        metricKey="rmse"
                                    />

                                    {secondaryCategory && rmseValues[secondaryCategory] && (
                                        <components.StandardTable
                                            data={rmseValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            metric="RMSE"
                                            metricKey="rmse"
                                            showInfoIcon={false}
                                        />
                                    )}

                                    {tertiaryCategory && rmseValues[tertiaryCategory] && (
                                        <components.StandardTable
                                            data={rmseValues[tertiaryCategory]}
                                            category={tertiaryCategory}
                                            metric="RMSE"
                                            metricKey="rmse"
                                            showInfoIcon={false}
                                        />
                                    )}
                                </div>
                            )}

                            {shouldShowMetric('dtw') && selectedCategory && DTWValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.StandardTable
                                        data={DTWValues[selectedCategory]}
                                        category={selectedCategory}
                                        metric="DTW"
                                        metricKey="dtw"
                                    />

                                    {secondaryCategory && DTWValues[secondaryCategory] && (
                                        <components.StandardTable
                                            data={DTWValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            metric="DTW"
                                            metricKey="dtw"
                                            showInfoIcon={false}
                                        />
                                    )}

                                    {tertiaryCategory && DTWValues[tertiaryCategory] && (
                                        <components.StandardTable
                                            data={DTWValues[tertiaryCategory]}
                                            category={tertiaryCategory}
                                            metric="DTW"
                                            metricKey="dtw"
                                            showInfoIcon={false}
                                        />
                                    )}
                                </div>
                            )}

                            {shouldShowMetric('euclidean') && selectedCategory && EuclideanValues[selectedCategory] && (
                                <div className="section-container p-3 d-flex flex-column gap-3">
                                    <components.StandardTable
                                        data={EuclideanValues[selectedCategory]}
                                        category={selectedCategory}
                                        metric="Euclidean"
                                        metricKey="euclidean"
                                    />

                                    {secondaryCategory && EuclideanValues[secondaryCategory] && (
                                        <components.StandardTable
                                            data={EuclideanValues[secondaryCategory]}
                                            category={secondaryCategory}
                                            metric="Euclidean"
                                            metricKey="euclidean"
                                            showInfoIcon={false}
                                        />
                                    )}

                                    {tertiaryCategory && EuclideanValues[tertiaryCategory] && (
                                        <components.StandardTable
                                            data={EuclideanValues[tertiaryCategory]}
                                            category={tertiaryCategory}
                                            metric="Euclidean"
                                            metricKey="euclidean"
                                            showInfoIcon={false}
                                        />
                                    )}
                                </div>
                            )}

                            {visiblePlugins.length > 0 && selectedCategory && (
                                <div className="section-container" style={{ padding: "16px" }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h3 style={{ margin: 0 }}>Plugins</h3>
                                        <div className="d-flex align-items-center gap-2">
                                            {isLoadingPlugins && <Spinner animation="border" size="sm" />}
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={refreshPluginResults}
                                                disabled={isLoadingPlugins}
                                            >
                                                Refresh
                                            </Button>
                                        </div>
                                    </div>

                                    {visiblePlugins.map((plugin) => {
                                        const categoryData = pluginResults[plugin.id]?.[selectedCategory];
                                        const categoryError = pluginErrors[plugin.id]?.[selectedCategory];

                                        if (categoryError) {
                                            return (
                                                <div key={plugin.id} className="mb-3">
                                                    <h5>{plugin.name} ({selectedCategory})</h5>
                                                    <Alert variant="danger" className="py-2">
                                                        {categoryError}
                                                    </Alert>
                                                </div>
                                            );
                                        }

                                        if (!categoryData || Object.keys(categoryData).length === 0) {
                                            return null;
                                        }

                                        return (
                                            <components.StandardTable
                                                key={plugin.id}
                                                data={categoryData}
                                                category={selectedCategory}
                                                metric={plugin.name}
                                                customInfo={{ name: plugin.name, description: plugin.description }}
                                            />
                                        );
                                    })}

                                    {secondaryCategory && visiblePlugins.map((plugin) => {
                                        const categoryData = pluginResults[plugin.id]?.[secondaryCategory];
                                        const categoryError = pluginErrors[plugin.id]?.[secondaryCategory];

                                        if (categoryError) {
                                            return (
                                                <div key={`${plugin.id}-${secondaryCategory}`} style={{ marginTop: "32px" }}>
                                                    <h5>{plugin.name} ({secondaryCategory})</h5>
                                                    <Alert variant="danger" className="py-2">
                                                        {categoryError}
                                                    </Alert>
                                                </div>
                                            );
                                        }

                                        if (!categoryData || Object.keys(categoryData).length === 0) {
                                            return null;
                                        }
                                        return (
                                            <div key={`${plugin.id}-${secondaryCategory}`} style={{ marginTop: "32px" }}>
                                                <components.StandardTable
                                                    data={categoryData}
                                                    category={secondaryCategory}
                                                    metric={plugin.name}
                                                    customInfo={{ name: plugin.name, description: plugin.description }}
                                                />
                                            </div>
                                        );
                                    })}

                                    {tertiaryCategory && visiblePlugins.map((plugin) => {
                                        const categoryData = pluginResults[plugin.id]?.[tertiaryCategory];
                                        const categoryError = pluginErrors[plugin.id]?.[tertiaryCategory];

                                        if (categoryError) {
                                            return (
                                                <div key={`${plugin.id}-${tertiaryCategory}`} style={{ marginTop: "32px" }}>
                                                    <h5>{plugin.name} ({tertiaryCategory})</h5>
                                                    <Alert variant="danger" className="py-2">
                                                        {categoryError}
                                                    </Alert>
                                                </div>
                                            );
                                        }

                                        if (!categoryData || Object.keys(categoryData).length === 0) {
                                            return null;
                                        }
                                        return (
                                            <div key={`${plugin.id}-${tertiaryCategory}`} style={{ marginTop: "32px" }}>
                                                <components.StandardTable
                                                    data={categoryData}
                                                    category={tertiaryCategory}
                                                    metric={plugin.name}
                                                    customInfo={{ name: plugin.name, description: plugin.description }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    <components.ScatterPlotModal
                        show={isScatterOpen}
                        onHide={handleCloseScatter}
                        file1={selectedPair.file1}
                        file2={selectedPair.file2}
                        points={scatterPoints}
                        isLoading={isScatterLoading}
                    />

                    <components.DataImportPopup ref={dataImportPopupRef} show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles} onComplete={handlePopupComplete} />

                    <components.ManualDataImport
                        show={showManualModal}
                        onHide={() => setShowManualModal(false)}
                        onHideToEdit={() => {
                            setShowManualModal(false);
                            setShowManualEdit(true);
                        }}
                        existingData={chartData}
                        onAddData={addManualData}
                    />

                    <components.ManualDataEdit
                        show={showManualEdit}
                        onHide={() => setShowManualEdit(false)}
                        manualData={manualData}
                        chartData={chartData}
                        onRemoveTimestamp={(fileId, ts, rowIdx) => removeTimestampFromGroup(fileId, ts, rowIdx)}
                        onRemoveGroup={(fileId) => removeByFileId(fileId)}
                        onUpdatePoint={(seriesKey, ts, val, idx) => updateManualPoint(seriesKey, ts, val, idx)}
                        onClearAll={() => clearManualData()}
                        onAddManualData={addManualData}
                        onOpenImport={() => {
                            setShowManualEdit(false);
                            setShowManualModal(true);
                        }}
                    />
                </div>
            </div>

            {/* Sidebar */}
            {isInDifferenceMode ? (
                <DifferenceSelectionPanel
                    differenceOptions={differenceOptions}
                    selectedDifferences={selectedDifferences}
                    reversedDifferences={reversedDifferences}
                    onDifferenceCheckboxChange={handleDifferenceCheckboxChange}
                    onReverseToggle={handleReverseToggle}
                    onSelectAllToggle={handleSelectAllToggle}
                    isLoading={isDiffLoading}
                />
            ) : (
                <div className="section-container group-menu d-flex flex-column align-items-center rounded">
                    <h4>Groups</h4>
                    {Object.entries(filenamesPerCategory).map(([category, files]) => (
                        <components.Dropdown
                            key={category}
                            category={category}
                            files={files}
                            onFileClick={(file) => console.log('Kliknięto plik:', file)}
                            onRangeChange={handleRangeChange}
                        />
                    ))}
                </div>
            )}

            <Modal show={showTitleModal} onHide={() => setShowTitleModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Enter report title</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Control
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value.slice(0, 30))}
                        placeholder="Enter title (max 30 characters)"
                        required
                        isInvalid={reportTitle.length === 0 || reportTitle.length > 30}
                    />
                    <Form.Control.Feedback type="invalid">
                        Title must be 1-30 characters long.
                    </Form.Control.Feedback>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTitleModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleExportToPDF} disabled={reportTitle.length === 0 || reportTitle.length > 30}>
                        Export
                    </Button>
                </Modal.Footer>
            </Modal>

            <components.MetricsSelectionModal
                show={showMetricsModal}
                onHide={() => setShowMetricsModal(false)}
                userMetrics={userMetrics}
                selectedMetrics={selectedMetricsForDisplay}
                onApply={setSelectedMetricsForDisplay}
            />
        </div>
    );
}

export default DashboardPage;