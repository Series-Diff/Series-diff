import { useRef, useCallback } from 'react';
import { DataImportPopupHandle } from '../components/DataImportPopup/DataImportPopup';

export const useDataImportPopup = () => {
  const dataImportPopupRef = useRef<DataImportPopupHandle>(null);

  const resetAllData = useCallback(() => {
    if (dataImportPopupRef.current) {
      dataImportPopupRef.current.resetAllData();
    }
  }, []);

  return {
    dataImportPopupRef,
    resetAllData,
  };
};
