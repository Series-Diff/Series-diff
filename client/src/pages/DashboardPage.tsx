import { Button, Modal, Form, Spinner } from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';

import ControlsPanel from './Dashboard/components/ControlsPanel';

function DashboardPage() {
  const { chartData, error, setError, isLoading, setIsLoading, filenamesPerCategory, handleFetchData, handleReset: baseReset } = hooks.useDataFetching();
  const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);
  const { selectedCategory, secondaryCategory, handleRangeChange, syncColorsByFile, setSyncColorsByFile, filteredData, handleDropdownChange, handleSecondaryDropdownChange, resetChartConfig } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow);
  const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics } = hooks.useMetricCalculations(filenamesPerCategory, selectedCategory, secondaryCategory);
  const { scatterPoints, isScatterLoading, isScatterOpen, selectedPair, handleCloseScatter, handleCellClick } = hooks.useScatterPlot();
  const { showTitleModal, setShowTitleModal, reportTitle, setReportTitle, isExporting, handleExportClick, handleExportToPDF } = hooks.useExport(chartData);
  const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);

  const handleReset = async () => {
    await baseReset();
    resetMetrics();
    resetChartConfig();
    resetMovingAverage();
    resetFileUpload();
  };

  const hasData = Object.keys(chartData).length > 0;

  const mainStyle = {
    gap: "16px",
    height: !hasData ? `calc(100vh - var(--nav-height) - 2 * var(--section-margin))` : undefined
  };

  const flexColumnClass = `d-flex flex-column gap-3 w-100 ${!hasData ? 'h-100' : ''}`;

  const chartContainerClass = `Chart-container section-container ${!hasData ? 'h-100' : ''}`;

  return (
    <div className="d-flex" style={mainStyle}>
      <div className="App-main-content flex-grow-1 d-flex align-items-start w-100 rounded">
        <div className={flexColumnClass}>
          <ControlsPanel
            selectedCategory={selectedCategory}
            secondaryCategory={secondaryCategory}
            filenamesPerCategory={filenamesPerCategory}
            handleDropdownChange={handleDropdownChange}
            handleSecondaryDropdownChange={handleSecondaryDropdownChange}
            showMovingAverage={showMovingAverage}
            handleToggleMovingAverage={handleToggleMovingAverage}
            isMaLoading={isMaLoading}
            maWindow={maWindow}
            setMaWindow={setMaWindow}
            handleApplyMaWindow={handleApplyMaWindow}
            syncColorsByFile={syncColorsByFile}
            setSyncColorsByFile={setSyncColorsByFile}
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
                  syncColorsByFile={syncColorsByFile} />
              </div>
            )}
          </div>
          {Object.keys(groupedMetrics).length > 0 && (
            <div className="section-container" style={{ padding: "16px" }}>
              <div className="d-flex justify-content-end align-items-center">
                {isExporting && <Spinner animation="border" size="sm" className="me-2" />}
                <Button
                  variant="secondary"
                  onClick={handleExportClick}
                  disabled={!hasData || isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export to PDF'}
                </Button>
              </div>
              <components.Metrics groupedMetrics={groupedMetrics} />
            </div>
          )}
          {selectedCategory && PearsonCorrelationValues[selectedCategory] && (
            <div className="section-container" style={{ padding: "16px" }}>
              <components.CorrelationTable
                data={PearsonCorrelationValues[selectedCategory]}
                category={selectedCategory}
                onCellClick={(file1, file2) =>
                  handleCellClick(file1, file2, selectedCategory)
                }
                metric="Pearson Correlation"
              />

              {secondaryCategory && PearsonCorrelationValues[secondaryCategory] && (
                <div style={{ marginTop: "32px" }}>
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
            <div className="section-container" style={{ padding: "16px" }}>
              <components.CorrelationTable
                data={CosineSimilarityValues[selectedCategory]}
                category={selectedCategory}
                clickable={false}
                metric="Cosine Similarity"
              />

              {secondaryCategory && CosineSimilarityValues[secondaryCategory] && (
                <div style={{ marginTop: "24px" }}>
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
            <div className="section-container" style={{ padding: "16px" }}>
              <components.StandardTable
                data={maeValues[selectedCategory]}
                category={selectedCategory}
                metric="MAE"
              />

              {secondaryCategory && maeValues[secondaryCategory] && (
                <div style={{ marginTop: "24px" }}>
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
            <div className="section-container" style={{ padding: "16px" }}>
              <components.StandardTable
                data={rmseValues[selectedCategory]}
                category={selectedCategory}
                metric="RMSE"
              />

              {secondaryCategory && rmseValues[secondaryCategory] && (
                <div style={{ marginTop: "24px" }}>
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
            <div className="section-container" style={{ padding: "16px" }}>
              <components.StandardTable
                data={DTWValues[selectedCategory]}
                category={selectedCategory}
                metric="DTW"
              />

              {secondaryCategory && DTWValues[secondaryCategory] && (
                <div style={{ marginTop: "32px" }}>
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
            <div className="section-container" style={{ padding: "16px" }}>
              <components.StandardTable
                data={EuclideanValues[selectedCategory]}
                category={selectedCategory}
                metric="Euclidean"
              />

              {secondaryCategory && EuclideanValues[secondaryCategory] && (
                <div style={{ marginTop: "32px" }}>
                  <components.StandardTable
                    data={EuclideanValues[secondaryCategory]}
                    category={secondaryCategory}
                    metric="Euclidean"
                  />
                </div>
              )}
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

          <components.DataImportPopup show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles} onComplete={handlePopupComplete} />
        </div>
      </div>
      <div className="section-container group-menu d-flex flex-column align-items-center p-3 rounded">
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
          <Button variant="primary" onClick={handleExportToPDF} disabled={reportTitle.length === 0 || reportTitle.length > 30}>
            Export
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default DashboardPage;