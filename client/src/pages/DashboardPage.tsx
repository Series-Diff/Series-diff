import React, { useState, useRef, useEffect } from 'react';
import { Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';
import { useManualData } from '../hooks/useManualData'; // Twoje: Import manual data

import ControlsPanel from './Dashboard/components/ControlsPanel';
import DifferenceSelectionPanel from './Dashboard/components/DifferenceSelectionPanel';

function DashboardPage() {
  const [chartMode, setChartMode] = useState<'standard' | 'difference'>('standard');
  const chartContainerRef = useRef<HTMLDivElement>(null);


  const { chartData, error, setError, isLoading, setIsLoading, filenamesPerCategory, handleFetchData, handleReset: baseReset  } = hooks.useDataFetching();
 
  const { manualData, addManualData, clearManualData } = useManualData();
  const [showManualModal, setShowManualModal] = useState(false);
  const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);
  const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);
  const { startDate, endDate, handleStartChange, handleEndChange, resetDates, defaultMinDate, defaultMaxDate } = hooks.useDateRange(Object.entries(chartData).map(([_, entries]) => ({ entries })));
  const { selectedCategory, secondaryCategory, handleRangeChange, syncColorsByFile, setSyncColorsByFile, filteredData, handleDropdownChange, handleSecondaryDropdownChange, resetChartConfig } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow, startDate, endDate);
  const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics } = hooks.useMetricCalculations(filenamesPerCategory, selectedCategory, secondaryCategory, startDate, endDate);
  const { scatterPoints, isScatterLoading, isScatterOpen, selectedPair, handleCloseScatter, handleCellClick } = hooks.useScatterPlot();
  const { showTitleModal, setShowTitleModal, reportTitle, setReportTitle, isExporting, handleExportClick, handleExportToPDF } = hooks.useExport(chartData);
  const { dataImportPopupRef, resetAllData } = hooks.useDataImportPopup();
  const { userMetrics, selectedMetricsForDisplay, setSelectedMetricsForDisplay, showMetricsModal, setShowMetricsModal, filteredGroupedMetrics, shouldShowMetric } = hooks.useMetricsSelection(groupedMetrics);

  const { plugins } = hooks.useLocalPlugins();

  const hasData = Object.keys(chartData).length > 0;
  const enabledPlugins = plugins.filter(p => p.enabled);

  // Filter enabled plugins by selection in modal
  const visiblePlugins = enabledPlugins.filter(p => shouldShowMetric(p.id));

  // Dynamic height calculation for chart container
  const chartDynamicHeight = hooks.useDynamicHeight(chartContainerRef, [hasData, isLoading]);

  const {
    pluginResults,
    pluginErrors,
    isLoadingPlugins,
    refreshPluginResults,
    resetPluginResults
  } = hooks.usePluginResults(filenamesPerCategory, plugins);

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
  } = hooks.useDifferenceChart(filenamesPerCategory, setError);

  const handleReset = async () => {
    setChartMode('standard');
    await baseReset();
    resetMetrics();
    resetChartConfig();
    resetMovingAverage();
    resetFileUpload();
    resetPluginResults();
    resetDates();
    clearManualData();
    resetDifferenceChart();
    resetAllData();
  };

  const hasDifferenceData = Object.keys(differenceChartData).length > 0;
  const isInDifferenceMode = chartMode === 'difference';

  const hasEnoughFilesForDifference = Object.values(filenamesPerCategory).some(files => files.length >= 2);
  const totalFilesLoaded = Object.values(filenamesPerCategory).reduce((sum, files) => sum + files.length, 0);

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

  const toggleChartMode = () => {
    setChartMode(prev => prev === 'standard' ? 'difference' : 'standard');
  };

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
              filenamesPerCategory={filenamesPerCategory}
              handleDropdownChange={handleDropdownChange}
              handleSecondaryDropdownChange={handleSecondaryDropdownChange}
              showMovingAverage={shouldShowMetric('moving_average') ? showMovingAverage : undefined}
              handleToggleMovingAverage={shouldShowMetric('moving_average') ? handleToggleMovingAverage : undefined}
              isMaLoading={isMaLoading}
              maWindow={maWindow}
              setMaWindow={setMaWindow}
              handleApplyMaWindow={handleApplyMaWindow}
              syncColorsByFile={syncColorsByFile}
              setSyncColorsByFile={setSyncColorsByFile}
              isLoading={isLoading}
              handleFileUpload={handleFileUpload}
              handleReset={handleReset}
                          defaultMinDate={defaultMinDate}
            defaultMaxDate={defaultMaxDate} 
            startDate={startDate} 
            endDate={endDate} 
            handleStartChange={handleStartChange}
             handleEndChange={handleEndChange}   
            />
          )}

          {/* Error Display */}
          {error && !error.includes('No overlapping timestamps') && !error.includes('tolerance') && !error.includes('no units specified') && (
            <p className="text-danger text-center mb-0">Error: {error}</p>
          )}

          {/* Chart Container */}
          <div
            ref={chartContainerRef}
            className={chartContainerClass}
            style={chartDynamicHeight ? { minHeight: chartDynamicHeight } : undefined}
          >
            {/* Standard Chart Mode */}
            {!isInDifferenceMode && (
              <>
                {isLoading && !hasData &&
                  <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Loading chart...
                  </div>}
                {!isLoading && !hasData && !error &&
                  <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                    Load data to visualize
                  </div>}
                {!isLoading && hasData && (
                  <div className="chart-wrapper" style={{ height: chartDynamicHeight }}>
                                <div className="position-absolute top-0 end-0 mt-2 me-3" style={{ zIndex: 10 }}>
                                <Button variant="outline-primary" size="sm" onClick={() => setShowManualModal(true)} disabled={Object.keys(chartData).length === 0}>
                                    + Add Manual Point
                                </Button>
                            </div>
                    <components.MyChart 
                      primaryData={filteredData.primary}
                      secondaryData={filteredData.secondary || undefined}
                      syncColorsByFile={syncColorsByFile}
                      manualData={manualData}
                    />
                  </div>
                )}
              </>
            )}

            {/* Difference Chart Mode */}
            {isInDifferenceMode && (
              <>
                {!hasData && !isLoading && !error && (
                  <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                    Load data to visualize differences
                  </div>
                )}
                {hasData && !hasEnoughFilesForDifference && (
                  <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                    <div>
                      <p className="mb-2">Difference chart requires at least 2 files in the same category.</p>
                      <p className="small mb-0">Currently loaded: {totalFilesLoaded} file{totalFilesLoaded !== 1 ? 's' : ''} across {Object.keys(filenamesPerCategory).length} categor{Object.keys(filenamesPerCategory).length !== 1 ? 'ies' : 'y'}.</p>
                    </div>
                  </div>
                )}
                {hasData && hasEnoughFilesForDifference && (
                  <>
                    {isDiffLoading && (
                      <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading difference data...
                      </div>
                    )}
                    {!isDiffLoading && diffError && (
                      <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1 text-center" style={{ minHeight: chartDynamicHeight }}>
                        <div>
                          <p className="mb-2">Unable to render difference chart with current tolerance.</p>
                          <p className="small mb-0">{diffError.includes('No overlapping timestamps') ? 'No overlapping timestamps within tolerance. Reset tolerance to see the chart.' : diffError}</p>
                        </div>
                      </div>
                    )}
                    {!isDiffLoading && !diffError && !hasDifferenceData && !error && (
                      <div className="d-flex align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: chartDynamicHeight }}>
                        Select differences to visualize
                      </div>
                    )}
                    {!isDiffLoading && !diffError && hasDifferenceData && (
                      <div className="chart-wrapper">
                        <components.MyChart
                          primaryData={differenceChartData}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Switch Chart Mode Button */}
            {hasData && shouldShowMetric('difference_chart') && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={toggleChartMode}
                className="position-absolute bottom-0 end-0 m-3"
              >
                {isInDifferenceMode ? 'Switch to Standard Chart' : 'Switch to Difference Chart'}
              </Button>
            )}
          </div>

          {/* Standard mode specific sections */}
          {!isInDifferenceMode && (
            <>
              {(hasData && Object.keys(groupedMetrics).length > 0) && (
                <div className="section-container p-3">
                  <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowMetricsModal(true)}
                    >
                      Select Metrics
                    </Button>
                    {isExporting && <Spinner animation="border" size="sm" className="me-2" />}
                    <Button
                      variant="secondary"
                      onClick={handleExportClick}
                      disabled={!hasData || isExporting}
                    >
                      {isExporting ? 'Exporting...' : 'Export to PDF'}
                    </Button>
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
                <div className="section-container p-3">
                  <components.CorrelationTable
                    data={PearsonCorrelationValues[selectedCategory]}
                    category={selectedCategory}
                    onCellClick={(file1, file2) =>
                      handleCellClick(file1, file2, selectedCategory)
                    }
                    metric="Pearson Correlation"
                    metricKey="pearson_correlation"
                  />

                  {secondaryCategory && PearsonCorrelationValues[secondaryCategory] && (
                    <div className="mt-4">
                      <components.CorrelationTable
                        data={PearsonCorrelationValues[secondaryCategory]}
                        category={secondaryCategory}
                        onCellClick={(file1, file2) =>
                          handleCellClick(file1, file2, secondaryCategory)
                        }
                        metric="Pearson Correlation"
                        metricKey="pearson_correlation"
                        showInfoIcon={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {shouldShowMetric('cosine_similarity') && selectedCategory && CosineSimilarityValues[selectedCategory] && (
                <div className="section-container p-3">
                  <components.CorrelationTable
                    data={CosineSimilarityValues[selectedCategory]}
                    category={selectedCategory}
                    clickable={false}
                    metric="Cosine Similarity"
                    metricKey="cosine_similarity"
                  />

                  {secondaryCategory && CosineSimilarityValues[secondaryCategory] && (
                    <div className="mt-3">
                      <components.CorrelationTable
                        data={CosineSimilarityValues[secondaryCategory]}
                        category={secondaryCategory}
                        clickable={false}
                        metric="Cosine Similarity"
                        metricKey="cosine_similarity"
                        showInfoIcon={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {shouldShowMetric('mae') && selectedCategory && maeValues[selectedCategory] && (
                <div className="section-container p-3">
                  <components.StandardTable
                    data={maeValues[selectedCategory]}
                    category={selectedCategory}
                    metric="MAE"
                    metricKey="mae"
                  />

                  {secondaryCategory && maeValues[secondaryCategory] && (
                    <div className="mt-3">
                      <components.StandardTable
                        data={maeValues[secondaryCategory]}
                        category={secondaryCategory}
                        metric="MAE"
                        metricKey="mae"
                        showInfoIcon={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {shouldShowMetric('rmse') && selectedCategory && rmseValues[selectedCategory] && (
                <div className="section-container p-3">
                  <components.StandardTable
                    data={rmseValues[selectedCategory]}
                    category={selectedCategory}
                    metric="RMSE"
                    metricKey="rmse"
                  />

                  {secondaryCategory && rmseValues[secondaryCategory] && (
                    <div className="mt-3">
                      <components.StandardTable
                        data={rmseValues[secondaryCategory]}
                        category={secondaryCategory}
                        metric="RMSE"
                        metricKey="rmse"
                        showInfoIcon={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {shouldShowMetric('dtw') && selectedCategory && DTWValues[selectedCategory] && (
                <div className="section-container p-3">
                  <components.StandardTable
                    data={DTWValues[selectedCategory]}
                    category={selectedCategory}
                    metric="DTW"
                    metricKey="dtw"
                  />

                  {secondaryCategory && DTWValues[secondaryCategory] && (
                    <div className="mt-4">
                      <components.StandardTable
                        data={DTWValues[secondaryCategory]}
                        category={secondaryCategory}
                        metric="DTW"
                        metricKey="dtw"
                        showInfoIcon={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {shouldShowMetric('euclidean') && selectedCategory && EuclideanValues[selectedCategory] && (
                <div className="section-container p-3">
                  <components.StandardTable
                    data={EuclideanValues[selectedCategory]}
                    category={selectedCategory}
                    metric="Euclidean"
                    metricKey="euclidean"
                  />

                  {secondaryCategory && EuclideanValues[secondaryCategory] && (
                    <div className="mt-4">
                      <components.StandardTable
                        data={EuclideanValues[secondaryCategory]}
                        category={secondaryCategory}
                        metric="Euclidean"
                        metricKey="euclidean"
                        showInfoIcon={false}
                      />
                    </div>
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
                </div>
              )}
            </>
          )}

          <components.ScatterPlotModal show={isScatterOpen} onHide={handleCloseScatter} file1={selectedPair.file1} file2={selectedPair.file2} points={scatterPoints} isLoading={isScatterLoading} />
          <components.DataImportPopup ref={dataImportPopupRef} show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles} onComplete={handlePopupComplete} />
          
      
          <components.ManualDataImport 
            show={showManualModal}
            onHide={() => setShowManualModal(false)}
            existingData={chartData}
            onAddData={addManualData} 
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