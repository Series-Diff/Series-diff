import { useState } from 'react';
import { exportToPDF } from '../utils';

export const useExport = (chartData: Record<string, any>) => {
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('Time Series Data Report');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = () => {
    setReportTitle('Time Series Data Report');
    setShowTitleModal(true);
  };

  const handleExportToPDF = async () => {
    setShowTitleModal(false);
    setIsExporting(true);
    try {
      await exportToPDF(chartData, reportTitle, setIsExporting);
    } catch (err) {
      console.error('Error during export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    showTitleModal,
    setShowTitleModal,
    reportTitle,
    setReportTitle,
    isExporting,
    handleExportClick,
    handleExportToPDF,
  };
};