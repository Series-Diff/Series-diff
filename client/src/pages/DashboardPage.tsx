import React, { useState } from 'react';
import { Button, Modal, Form, Spinner } from 'react-bootstrap';
import './DashboardPage.css';
import '../components/Chart/Chart.css';
import '../components/Metric/Metrics.css';
import '../components/Dropdown/Dropdown.css';
import * as components from '../components';
import * as hooks from '../hooks';
import { useManualData } from '../hooks/useManualData';

import ControlsPanel from './Dashboard/components/ControlsPanel';

function DashboardPage() {
  const { chartData, filenamesPerCategory, error, setError, isLoading, setIsLoading, handleFetchData, handleReset: baseReset } = hooks.useDataFetching();
  const { manualData, addManualData, clearManualData } = useManualData();
  const [showManualModal, setShowManualModal] = useState(false);
  const { showMovingAverage, maWindow, setMaWindow, isMaLoading, rollingMeanChartData, handleToggleMovingAverage, handleApplyMaWindow, resetMovingAverage, } = hooks.useMovingAverage(filenamesPerCategory, setError);
  const { scatterPoints, isScatterLoading, isScatterOpen, selectedPair, handleCloseScatter, handleCellClick } = hooks.useScatterPlot();
  const { showTitleModal, setShowTitleModal, reportTitle, setReportTitle, isExporting, handleExportClick, handleExportToPDF } = hooks.useExport(chartData);
  const { isPopupOpen, selectedFiles, handleFileUpload, handlePopupComplete, handlePopupClose, resetFileUpload } = hooks.useFileUpload(handleFetchData, setError, setIsLoading);
  const {startDate,endDate,handleStartChange,handleEndChange,defaultMinDate,defaultMaxDate,} = hooks.useDateRange(Object.entries(chartData).map(([_, entries]) => ({ entries })));
  const { selectedCategory, secondaryCategory, handleRangeChange, syncColorsByFile, setSyncColorsByFile, filteredData, handleDropdownChange, handleSecondaryDropdownChange, resetChartConfig,  } = hooks.useChartConfiguration(filenamesPerCategory, chartData, rollingMeanChartData, showMovingAverage, maWindow, startDate, endDate);
  const { maeValues, rmseValues, PearsonCorrelationValues, DTWValues, EuclideanValues, CosineSimilarityValues, groupedMetrics, resetMetrics } = hooks.useMetricCalculations(filenamesPerCategory, selectedCategory, secondaryCategory,startDate,endDate);

  const handleReset = async () => {
    await baseReset();
    resetMetrics();
    resetChartConfig();
    resetMovingAverage();
    resetFileUpload();
    clearManualData(); 
  };

  return (
    <div className="d-flex" style={{ gap: "16px" }}>
      <div className="App-main-content flex-grow-1 d-flex align-items-start w-100 rounded">
        <div className="d-flex flex-column gap-3 w-100">
          <ControlsPanel
             selectedCategory={selectedCategory} secondaryCategory={secondaryCategory} filenamesPerCategory={filenamesPerCategory}
             handleDropdownChange={handleDropdownChange} handleSecondaryDropdownChange={handleSecondaryDropdownChange}
             showMovingAverage={showMovingAverage} handleToggleMovingAverage={handleToggleMovingAverage} isMaLoading={isMaLoading}
             maWindow={maWindow} setMaWindow={setMaWindow} handleApplyMaWindow={handleApplyMaWindow}
             syncColorsByFile={syncColorsByFile} setSyncColorsByFile={setSyncColorsByFile} isLoading={isLoading}
             handleFileUpload={handleFileUpload} handleReset={handleReset}
             defaultMinDate={defaultMinDate} defaultMaxDate={defaultMaxDate} startDate={startDate} endDate={endDate}
             handleStartChange={handleStartChange} handleEndChange={handleEndChange}
          />
          {error && <p className="text-danger text-center">Error: {error}</p>}
          
          <div className="Chart-container section-container">
            <div className="d-flex justify-content-end px-3 pt-2">
                 <Button variant="outline-success" size="sm" onClick={() => setShowManualModal(true)} disabled={Object.keys(chartData).length === 0}>
                    + Add Manual Point
                 </Button>
            </div>

            
            {!isLoading && (Object.keys(chartData).length > 0 || Object.keys(manualData).length > 0) && (
              <div className="chart-wrapper">
                <components.MyChart 
                    primaryData={filteredData.primary}
                    secondaryData={filteredData.secondary || undefined}
                    manualData={manualData} // <--- PRZEKAZUJEMY CAŁE DANE, NIE KLUCZE
                    syncColorsByFile={syncColorsByFile} 
                />
              </div>
            )}
            {!isLoading && Object.keys(chartData).length === 0 && Object.keys(manualData).length === 0 && !error &&
               <p className="text-center p-4">Load data to visualize</p>
            }
          </div>
          

          {Object.keys(groupedMetrics).length > 0 && (
             <div className="section-container" style={{ padding: "16px" }}>
                <components.Metrics groupedMetrics={groupedMetrics} />
                <Button variant="secondary" onClick={handleExportClick} disabled={isExporting}>Export</Button>
             </div>
          )}
          


          <components.ScatterPlotModal show={isScatterOpen} onHide={handleCloseScatter} file1={selectedPair.file1} file2={selectedPair.file2} points={scatterPoints} isLoading={isScatterLoading} />
          <components.DataImportPopup show={isPopupOpen} onHide={handlePopupClose} files={selectedFiles} onComplete={handlePopupComplete} />
          
          <components.ManualDataImport 
            show={showManualModal}
            onHide={() => setShowManualModal(false)}
            existingData={chartData}
            onAddData={addManualData} 
          />
        </div>
      </div>

      <div className="section-container group-menu d-flex flex-column align-items-center p-3 rounded">
         <h4>Groups</h4>
         {Object.entries(filenamesPerCategory).map(([c, f]) => <components.Dropdown key={c} category={c} files={f} onRangeChange={handleRangeChange} />)}
      </div>
      <Modal show={showTitleModal} onHide={() => setShowTitleModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Report</Modal.Title></Modal.Header>
          <Modal.Body><Form.Control value={reportTitle} onChange={e=>setReportTitle(e.target.value)} /></Modal.Body>
          <Modal.Footer><Button onClick={handleExportToPDF}>Export</Button></Modal.Footer>
      </Modal>
    </div>
  );
}
export default DashboardPage;