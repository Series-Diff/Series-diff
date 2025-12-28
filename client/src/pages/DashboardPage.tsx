import {Button, Modal, Form, Spinner} from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';

import ControlsPanel from './Dashboard/components/ControlsPanel';
import DifferenceSelectionPanel from './Dashboard/components/DifferenceSelectionPanel';
import {useState, useRef} from "react";

function DashboardPage() {
    const [chartMode, setChartMode] = useState<'standard' | 'difference'>('standard');
    const chartContainerRef = useRef<HTMLDivElement>(null);

  const { chartData, error, setError, isLoading, setIsLoading, filenamesPerCategory, handleFetchData, handleReset: baseReset } = hooks.useDataFetching();
  const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);
  const { selectedCategory, secondaryCategory, handleRangeChange, syncColorsByFile, setSyncColorsByFile, filteredData, handleDropdownChange, handleSecondaryDropdownChange, resetChartConfig } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow);
  const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics } = hooks.useMetricCalculations(filenamesPerCategory, selectedCategory, secondaryCategory);
  const { scatterPoints, isScatterLoading, isScatterOpen, selectedPair, handleCloseScatter, handleCellClick } = hooks.useScatterPlot();
  const { showTitleModal, setShowTitleModal, reportTitle, setReportTitle, isExporting, handleExportClick, handleExportToPDF } = hooks.useExport(chartData);
  const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);

  const {plugins} = hooks.useLocalPlugins();


    const {
        pluginResults,
        isLoadingPlugins,
        refreshPluginResults,
        resetPluginResults
    } = hooks.usePluginResults(filenamesPerCategory, plugins);

    const hasData = Object.keys(chartData).length > 0;

    // Dynamic height calculation for chart container
    // Recalculates when hasData or isLoading changes (to handle layout changes after data loads)
  const chartDynamicHeight = hooks.useDynamicHeight(chartContainerRef, [hasData, isLoading]);

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
        await baseReset();
        resetMetrics();
        resetChartConfig();
        resetMovingAverage();
        resetFileUpload();
        resetPluginResults();
        resetDifferenceChart();
    };

    const enabledPlugins = plugins.filter(p => p.enabled);

    const hasDifferenceData = Object.keys(differenceChartData).length > 0;
    const isInDifferenceMode = chartMode === 'difference';

    // Check if there are enough files for difference chart (need at least 2 files in any category)
    const hasEnoughFilesForDifference = Object.values(filenamesPerCategory).some(files => files.length >= 2);
    const totalFilesLoaded = Object.values(filenamesPerCategory).reduce((sum, files) => sum + files.length, 0);

      // Determine if we need full height:
  // - Standard mode without data: full height
  // - Difference mode: always full height (no statistics below)
  const needsFullHeight = isInDifferenceMode || !hasData;

  // Use height (not minHeight) for diff mode to prevent scroll
  // overflow: hidden prevents scrollbar from appearing
  const mainStyle = needsFullHeight ? {
    gap: "16px",
    height: `calc(100vh - var(--nav-height) - 2 * var(--section-margin))`,
    overflow: "hidden" as const
  } : {
    gap: "16px",
    minHeight: `calc(100vh - var(--nav-height) - 2 * var(--section-margin))`
  };

  // Chart layout container: h-100 when we need full height
  const chartLayoutClass = `d-flex flex-column gap-3 w-100 flex-grow-1${needsFullHeight ? ' h-100' : ''}`;

  // Chart container: flex-grow-1 to fill available space
  const chartContainerClass = `Chart-container section-container position-relative flex-grow-1`;

  const toggleChartMode = () => {
    setChartMode(prev => prev === 'standard' ? 'difference' : 'standard');
  };

    return (
        <div className="d-flex" style={mainStyle}>
            <div className="App-main-content flex-grow-1 d-flex align-items-start w-100 rounded">
                <div className={chartLayoutClass}>
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
                    {error && <p className="text-danger text-center">Error: {error}</p>}
                    <div className={chartContainerClass}>
                        {isLoading && !hasData &&
                            <div className="p-4">Loading chart...</div>}
                        {!isLoading && !hasData && !error &&
                            <div className="p-4">Load data to visualize</div>}
                        {!isLoading && hasData && (
                            <div className="chart-wrapper">
                                <components.MyChart primaryData={filteredData.primary}
                                                    secondaryData={filteredData.secondary || undefined}
                                                    syncColorsByFile={syncColorsByFile}/>
                            </div>
                        )}
                    </div>
                    {Object.keys(groupedMetrics).length > 0 && (
                        <div className="section-container p-3">
                            <div className="d-flex justify-content-end align-items-center">
                                {isExporting && <Spinner animation="border" size="sm" className="me-2"/>}
                                <Button
                                    variant="secondary"
                                    onClick={handleExportClick}
                                    disabled={!hasData || isExporting}
                                >
                                    {isExporting ? 'Exporting...' : 'Export to PDF'}
                                </Button>
                            </div>
                            <components.Metrics groupedMetrics={groupedMetrics}/>
                        </div>
                    )}
                    {selectedCategory && PearsonCorrelationValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.CorrelationTable
                                data={PearsonCorrelationValues[selectedCategory]}
                                category={selectedCategory}
                                onCellClick={(file1, file2) =>
                                    handleCellClick(file1, file2, selectedCategory)
                                }
                                metric="Pearson Correlation"
                            />

                            {secondaryCategory && PearsonCorrelationValues[secondaryCategory] && (
                                <div style={{marginTop: "32px"}}>
                                    <components.CorrelationTable
                                        data={PearsonCorrelationValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        onCellClick={(file1, file2) =>
                                            handleCellClick(file1, file2, secondaryCategory)
                                        }
                                        metric="Pearson Correlation"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && CosineSimilarityValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.CorrelationTable
                                data={CosineSimilarityValues[selectedCategory]}
                                category={selectedCategory}
                                clickable={false}
                                metric="Cosine Similarity"
                            />

                            {secondaryCategory && CosineSimilarityValues[secondaryCategory] && (
                                <div style={{marginTop: "24px"}}>
                                    <components.CorrelationTable
                                        data={CosineSimilarityValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        clickable={false}
                                        metric="Cosine Similarity"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && maeValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.StandardTable
                                data={maeValues[selectedCategory]}
                                category={selectedCategory}
                                metric="MAE"
                            />

                            {secondaryCategory && maeValues[secondaryCategory] && (
                                <div style={{marginTop: "24px"}}>
                                    <components.StandardTable
                                        data={maeValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        metric="MAE"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && rmseValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.StandardTable
                                data={rmseValues[selectedCategory]}
                                category={selectedCategory}
                                metric="RMSE"
                            />

                            {secondaryCategory && rmseValues[secondaryCategory] && (
                                <div style={{marginTop: "24px"}}>
                                    <components.StandardTable
                                        data={rmseValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        metric="RMSE"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && DTWValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.StandardTable
                                data={DTWValues[selectedCategory]}
                                category={selectedCategory}
                                metric="DTW"
                            />

                            {secondaryCategory && DTWValues[secondaryCategory] && (
                                <div style={{marginTop: "32px"}}>
                                    <components.StandardTable
                                        data={DTWValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        metric="DTW"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && EuclideanValues[selectedCategory] && (
                        <div className="section-container p-3">
                            <components.StandardTable
                                data={EuclideanValues[selectedCategory]}
                                category={selectedCategory}
                                metric="Euclidean"
                            />

                            {secondaryCategory && EuclideanValues[secondaryCategory] && (
                                <div className="mt-4">
                                    <components.StandardTable
                                        data={EuclideanValues[secondaryCategory]}
                                        category={secondaryCategory}
                                        metric="Euclidean"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- CUSTOM PLUGINS SECTION --- */}
                    {enabledPlugins.length > 0 && selectedCategory && (
                        <div className="section-container" style={{padding: "16px"}}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h3 style={{margin: 0}}>Plugins</h3>
                                <div className="d-flex align-items-center gap-2">
                                    {isLoadingPlugins && <Spinner animation="border" size="sm"/>}
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

                            {enabledPlugins.map((plugin) => {
                                const categoryData = pluginResults[plugin.id]?.[selectedCategory];
                                // Renderuj tylko jeśli są dane dla tej kategorii
                                if (!categoryData || Object.keys(categoryData).length === 0) {
                                    return null;
                                }

                                return (
                                    <components.StandardTable
                                        data={categoryData}
                                        category={selectedCategory}
                                        metric={plugin.name}
                                    />
                                );
                            })}

                            {secondaryCategory && enabledPlugins.map((plugin) => {
                                const categoryData = pluginResults[plugin.id]?.[secondaryCategory];
                                if (!categoryData || Object.keys(categoryData).length === 0) {
                                    return null;
                                }
                                return (
                                    <div key={`${plugin.id}-${secondaryCategory}`} style={{marginTop: "32px"}}>
                                        <components.StandardTable
                                            data={categoryData}
                                            category={secondaryCategory}
                                            metric={plugin.name}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <components.ScatterPlotModal
                        show={isScatterOpen}
                        onHide={handleCloseScatter}
                        file1={selectedPair.file1}
                        file2={selectedPair.file2}
                        points={scatterPoints}
                        isLoading={isScatterLoading}
                    />

                    <components.DataImportPopup show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles}
                                                onComplete={handlePopupComplete}/>
                </div>
            </div>
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
                    <Button variant="primary" onClick={handleExportToPDF}
                            disabled={reportTitle.length === 0 || reportTitle.length > 30}>
                        Export
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default DashboardPage;