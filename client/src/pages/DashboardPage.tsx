import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompactMode, getControlsPanelStyles } from '../hooks/useCompactMode';
import { Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Statistics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';
import { useGlobalCache } from '../contexts/CacheContext';
import { cacheAPI } from '../utils/cacheApiWrapper';

function DashboardPage() {
    const [chartMode, setChartMode] = useState<'standard' | 'difference'>('standard');
    const [singleFileDismissed, setSingleFileDismissed] = useState(false);
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

    const { manualData, addManualData, clearManualData, removeByFileId, removeTimestampFromGroup, updateManualPoint } = hooks.useManualData();
    const [showManualModal, setShowManualModal] = useState(false);
    const [showManualEdit, setShowManualEdit] = useState(false);

    const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);

    const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);

    const { startDate, endDate, pendingStartDate, pendingEndDate, handleStartChange, handleEndChange, applyPendingDates, resetDates, defaultMinDate, defaultMaxDate, ignoreTimeRange, setIgnoreTimeRange, } = hooks.useDateRange(
        Object.entries(chartData).map(([_, entries]) => ({ entries })),
        manualData,
        (msg: string) => setError(prev => (prev && prev.includes('Storage quota exceeded')) ? prev : msg)
    );

    const { selectedCategory, secondaryCategory, tertiaryCategory, handleRangeChange, syncColorsByFile, colorSyncMode, setColorSyncMode, syncColorsByGroup, filteredData, filteredManualData, handleDropdownChange, handleSecondaryDropdownChange, handleTertiaryDropdownChange, resetChartConfig } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate, manualData);

    // Determine if time range is pending (we want to avoid firing requests without start/end)
    const startChanged = !!(pendingStartDate && startDate && pendingStartDate.getTime() !== startDate.getTime());
    const endChanged =   !!(pendingEndDate && endDate && pendingEndDate.getTime() !== endDate.getTime());
    const timeRangePending: boolean = !ignoreTimeRange && !!Object.keys(chartData).length && (
        !startDate || !endDate || startChanged || endChanged
    );

    const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics, metricLoading, metricError, retryMetric } = hooks.useMetricCalculations(
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
        setDiffError,
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
        undefined, // Don't propagate diff errors to global error state
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

    const { isCompact } = useCompactMode();
    const styles = getControlsPanelStyles(isCompact);

    const hasEnoughFilesForDifference = Object.values(filenamesPerCategory).some(files => files.length >= 2);
    // Count unique files across all categories (don't duplicate count if same file appears in multiple categories)
    const uniqueFileSet = new Set(Object.values(filenamesPerCategory).flat());
    const totalFilesLoaded = uniqueFileSet.size;
    const shouldShowSingleFileAlert = uniqueFileSet.size === 1 && !singleFileDismissed;

    useEffect(() => {
        setSingleFileDismissed(false);
    }, [totalFilesLoaded]);

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
        setChartMode(prev => {
            const newMode = prev === 'standard' ? 'difference' : 'standard';
            // Clear errors when switching modes - errors are independent per view
            if (newMode === 'standard') {
                setDiffError(null);
            } else {
                setError(null);
            }
            return newMode;
        });
    }, [setDiffError, setError]);

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

    // Global error capture: forward to Alert before chart
    useEffect(() => {
        const onWindowError = (event: ErrorEvent) => {
            const message = event?.error?.message || event.message || 'Unexpected runtime error occurred.';
            setError(`Runtime error: ${message}`);
        };
        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason: any = event?.reason;
            const message = (reason && (reason.message || reason.toString())) || 'Unhandled promise rejection occurred.';
            setError(`Runtime error: ${message}`);
        };
        window.addEventListener('error', onWindowError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);
        return () => {
            window.removeEventListener('error', onWindowError);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, [setError]);

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
                            <components.ControlsPanel
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
                            <components.ControlsPanel
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

                        {/* Standard mode error alert - show general errors */}
                        {!isInDifferenceMode && error && !error.includes('no units specified') && (
                            <Alert
                                variant={error.includes('Storage quota exceeded') ? 'warning' : 'danger'}
                                className="mb-0"
                                dismissible
                                onClose={() => setError(null)}
                            >
                                <strong>{error.includes('Storage quota exceeded') ? 'Storage Warning:' : 'Error:'}</strong> {error}
                                {error.includes('Storage quota exceeded') && (
                                    <>
                                        <br />
                                        <small className="mt-2 d-block">
                                            You can still display your data on the chart, but metrics and statistics may not work, and the data might not be saved after refresh.
                                        </small>
                                    </>
                                )}
                            </Alert>
                        )}

                        {/* Difference mode error alert */}
                        {isInDifferenceMode && diffError && (
                            <Alert
                                variant="danger"
                                className="mb-0"
                                dismissible
                                onClose={() => setDiffError(null)}
                            >
                                <strong>Difference Chart Error:</strong> {diffError.includes('No overlapping timestamps')
                                ? 'No overlapping timestamps within tolerance. Try adjusting the tolerance value or resetting it.'
                                : diffError}
                            </Alert>
                        )}

                        {shouldShowSingleFileAlert && (
                            <Alert
                                variant="warning"
                                className="mb-0"
                                dismissible
                                onClose={() => setSingleFileDismissed(true)}
                            >
                                <strong>More files needed:</strong> Comparison metrics require at least two files in the same category. Upload at least two files to view metric pairwise tables and difference charts.
                            </Alert>
                        )}

                        {/* Chart Container wrapped in error boundary to surface runtime errors in Alert */}
                        <components.ErrorBoundary onError={(msg) => setError(msg)}>
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
                                            top: '16px',
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
                                                {hasData && shouldShowMetric('difference_chart') && (
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={toggleChartMode}
                                                        className="position-absolute top-0 end-0 m-3"
                                                        style={{zIndex: 1050}}
                                                    >
                                                        {isInDifferenceMode ? 'Switch to Standard Chart' : 'Switch to Difference Chart'}
                                                    </Button>
                                                )}
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
                                                <div className={`d-flex w-100 px-2 mt-3`}>
                                                    <div className={`d-flex gap-2 w-100`}>
                                                        <components.DateTimePicker
                                                            label="Start"
                                                            value={pendingStartDate}
                                                            onChange={handleStartChange}
                                                            minDate={defaultMinDate}
                                                            maxDate={(pendingEndDate ?? endDate) ?? defaultMaxDate}
                                                            openToDate={pendingStartDate ?? defaultMinDate}
                                                            minWidth={styles.datePickerMinWidth}
                                                            />

                                                        <components.DateTimePicker
                                                            label="End"
                                                            value={pendingEndDate}
                                                            onChange={handleEndChange}
                                                            minDate={(pendingStartDate ?? startDate) ?? defaultMinDate}
                                                            maxDate={defaultMaxDate}
                                                            openToDate={pendingEndDate ?? defaultMaxDate}
                                                            minWidth={styles.datePickerMinWidth}
                                                        />

                                                        {!ignoreTimeRange && (
                                                            <div className="d-flex align-items-center">
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    className={styles.textClass}
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
                                                                label={<span className={`text-nowrap ${styles.textClass} text-muted`}>Calculate metrics on full date range</span>}
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
                                                {/* Error state - show placeholder when diff error exists (error alert shown above) */}
                                                {!isDiffLoading && diffError && (
                                                    <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 flex-fill">
                                                        Fix the error above to display the chart
                                                    </div>
                                                )}
                                                {!isDiffLoading && !diffError && !hasDifferenceData && (
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
                        </components.ErrorBoundary>
                    </div>

                    {/* Standard mode specific sections wrapped to catch runtime errors in metrics rendering */}
                    {!isInDifferenceMode && (
                        <>
                            <components.ErrorBoundary onError={(msg) => setError(msg)}>
                                {hasData && Object.keys(groupedMetrics).length > 0 && (
                                    <components.StatisticsWrapper
                                        groupedStatistics={filteredGroupedMetrics}
                                        statisticLoading={metricLoading}
                                        statisticError={metricError}
                                        selectedStatisticsForDisplay={selectedMetricsForDisplay}
                                        filenamesPerCategory={filenamesPerCategory}
                                        selectedCategory={selectedCategory}
                                        secondaryCategory={secondaryCategory}
                                        tertiaryCategory={tertiaryCategory}
                                        onOpenStatisticsModal={() => setShowMetricsModal(true)}
                                        onExportClick={handleExportClick}
                                        isExporting={isExporting}
                                        onRetryStatistic={retryMetric}
                                    />
                                )}

                                {/* Render metric matrices via helper which also enforces ">=2 files" rule */}
                                {(() => {
                                    return (
                                        <>
                                            {/* Metric-Matrix-Wrapper */}
                                            <components.MetricMatrixWrapper
                                                metricId="pearson_correlation"
                                                Comp={components.CorrelationMatrix}
                                                dataMap={PearsonCorrelationValues}
                                                metricLabel="Pearson Correlation"
                                                metricKey="pearson_correlation"
                                                isLoading={!!metricLoading['PearsonCorrelationValues']}
                                                error={metricError['PearsonCorrelationValues'] ?? undefined}
                                                correlationClick={true}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                onCellClick={(file1: string, file2: string, cat: string) => handleCellClick(file1, file2, cat, ignoreTimeRange ? null : startDate, ignoreTimeRange ? null : endDate)}
                                                shouldShow={shouldShowMetric('pearson_correlation')}
                                                onRetry={() => retryMetric('PearsonCorrelationValues')}
                                            />
                                            <components.MetricMatrixWrapper
                                                metricId="cosine_similarity"
                                                Comp={components.CorrelationMatrix}
                                                dataMap={CosineSimilarityValues}
                                                metricLabel="Cosine Similarity"
                                                metricKey="cosine_similarity"
                                                isLoading={!!metricLoading['CosineSimilarityValues']}
                                                error={metricError['CosineSimilarityValues'] ?? undefined}
                                                extraProps={{ clickable: false }}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                shouldShow={shouldShowMetric('cosine_similarity')}
                                                onRetry={() => retryMetric('CosineSimilarityValues')}
                                            />
                                            <components.MetricMatrixWrapper
                                                metricId="mae"
                                                Comp={components.StandardMatrix}
                                                dataMap={maeValues}
                                                metricLabel="MAE"
                                                metricKey="mae"
                                                isLoading={!!metricLoading['maeValues']}
                                                error={metricError['maeValues'] ?? undefined}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                shouldShow={shouldShowMetric('mae')}
                                                onRetry={() => retryMetric('maeValues')}
                                            />
                                            <components.MetricMatrixWrapper
                                                metricId="rmse"
                                                Comp={components.StandardMatrix}
                                                dataMap={rmseValues}
                                                metricLabel="RMSE"
                                                metricKey="rmse"
                                                isLoading={!!metricLoading['rmseValues']}
                                                error={metricError['rmseValues'] ?? undefined}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                shouldShow={shouldShowMetric('rmse')}
                                                onRetry={() => retryMetric('rmseValues')}
                                            />
                                            <components.MetricMatrixWrapper
                                                metricId="dtw"
                                                Comp={components.StandardMatrix}
                                                dataMap={DTWValues}
                                                metricLabel="DTW"
                                                metricKey="dtw"
                                                isLoading={!!metricLoading['DTWValues']}
                                                error={metricError['DTWValues'] ?? undefined}
                                                fallbackEmpty={true}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                shouldShow={shouldShowMetric('dtw')}
                                                onRetry={() => retryMetric('DTWValues')}
                                            />
                                            <components.MetricMatrixWrapper
                                                metricId="euclidean"
                                                Comp={components.StandardMatrix}
                                                dataMap={EuclideanValues}
                                                metricLabel="Euclidean"
                                                metricKey="euclidean"
                                                isLoading={!!metricLoading['EuclideanValues']}
                                                error={metricError['EuclideanValues'] ?? undefined}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                totalFilesLoaded={totalFilesLoaded}
                                                shouldShow={shouldShowMetric('euclidean')}
                                                onRetry={() => retryMetric('EuclideanValues')}
                                            />


                                            <components.PluginResultsSection
                                                visiblePlugins={visiblePlugins}
                                                pluginResults={pluginResults}
                                                pluginErrors={pluginErrors}
                                                selectedCategory={selectedCategory}
                                                secondaryCategory={secondaryCategory}
                                                tertiaryCategory={tertiaryCategory}
                                                isLoadingPlugins={isLoadingPlugins}
                                                refreshPluginResults={refreshPluginResults}
                                                totalFilesLoaded={totalFilesLoaded}
                                            />
                                        </>
                                    );
                                })()}
                            </components.ErrorBoundary>
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
                <components.DifferenceSelectionPanel
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