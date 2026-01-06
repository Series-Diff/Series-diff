import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { DataTable } from '../DataTable/DataTable';
import Papa from 'papaparse';

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

// --- CONSTANTS ---
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

// --- HELPER: Generate unique group IDs (outside component to persist across renders) ---
const generateGroupId = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface FileConfig {
  logDateColumn: string;
  valueColumn: string;
  rawData: any[];
}

interface Group {
  id: string;
  name: string;
  fileMappings: Record<string, string>; // { [fileKey]: columnName }
}

interface Props {
  show: boolean;
  files: File[];
  onHide: () => void;
  onComplete: (groupedData: Record<string, any>) => void;
}

export const DataImportPopup: React.FC<Props> = ({ show, files, onHide, onComplete }) => {
  // --- STATE: Navigation & Data ---
  const [currentStep, setCurrentStep] = useState<'file-preview' | 'column-config'>('file-preview');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileConfigs, setFileConfigs] = useState<Record<string, FileConfig>>({});
  const [columnOptions, setColumnOptions] = useState<string[]>([]); // Available columns in the current file

  // --- STATE: Loading & Errors ---
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorParsingFile, setErrorParsingFile] = useState<string | null>(null);

  // --- STATE: Grouping & Renaming ---
  const [groups, setGroups] = useState<Group[]>([]);
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState<string>('');
  const [groupCounter, setGroupCounter] = useState(2);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [manuallyEditedGroups, setManuallyEditedGroups] = useState<Set<string>>(new Set());
  const [showOnlyNumeric, setShowOnlyNumeric] = useState(true);
  const [missingValueGroupError, setMissingValueGroupError] = useState(false);
  const modalBodyRef = React.useRef<HTMLDivElement>(null);
  // --- STATE: Pivot ---
  const [isPivotMode, setIsPivotMode] = useState<Record<string, boolean>>({});
  const [pivotIndex, setPivotIndex] = useState('');   // np. log_date
  const [pivotColumn, setPivotColumn] = useState(''); // np. data_type
  const [pivotValue, setPivotValue] = useState('');   // np. value
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Record<string, any[]>>({});
  const [pivotWarnings, setPivotWarnings] = useState<Record<string, string>>({});
  const [pivotApplied, setPivotApplied] = useState<Record<string, boolean>>({});

  // --- HELPER: Flatten Object ---
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    let result: Record<string, any> = {};
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const value = obj[key];
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = flattenObject(value, prefixedKey);
        result = { ...result, ...nested };
      } else {
        result[prefixedKey] = value;
      }
    }
    return result;
  };

  // --- HELPER: Get File ID (stable file identifier) ---
  const getFileId = (file?: File) => {
    if (!file) return '';
    return file.name.replace(/\.(json|csv)$/i, '');
  };

  // --- HELPER: Get File Key (display name) ---
  const getFileKey = (file?: File) => {
    if (!file) return '';
    const originalKey = file.name.replace(/\.(json|csv)$/i, '');
    return renamedFiles[originalKey] || originalKey;
  };

  const currentFile = files[currentFileIndex];
  const currentFileKey = getFileKey(currentFile);
  const currentConfig = currentFileKey ? fileConfigs[currentFileKey] : null;

  // --- EFFECT: Reset State on Open ---
  useEffect(() => {
    if (show && files.length > 0) {
      resetState();
      loadFileForConfiguration(0);
    }
  }, [show, files]);


  const resetState = () => {
    setCurrentStep('file-preview');
    setCurrentFileIndex(0);
    setFileConfigs({});
    setColumnOptions([]);
    setErrorParsingFile(null);
    setGroups([]);
    setRenamedFiles({});
    setEditingGroupName(null);
    setTempGroupName('');
    setGroupCounter(2);
    setGroupNameError(null);
    setManuallyEditedGroups(new Set());

    // Reset pivot state
    setIsPivotMode({});
    setPivotIndex('');
    setPivotColumn('');
    setPivotValue('');
    setPivotError(null);
    setOriginalData({});
    setPivotWarnings({});
    setPivotApplied({});
  };

  // --- EFFECT: Auto-detect Pivot Columns ---
  // When columns are loaded (columnOptions), we try to guess default pivot settings
  useEffect(() => {
    if (columnOptions.length > 0) {
      const probableDate = columnOptions.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || columnOptions[0];
      const probableValue = columnOptions.find(c => c.toLowerCase().includes('value')) || columnOptions[columnOptions.length - 1];
      const probableCategory = columnOptions.find(c => c !== probableDate && c !== probableValue) || columnOptions[1] || columnOptions[0];

      // Set only if values are empty (to not override user selection)
      setPivotIndex(prev => prev || probableDate || '');
      setPivotValue(prev => prev || probableValue || '');
      setPivotColumn(prev => prev || probableCategory || '');
    }
  }, [columnOptions]);

  // --- LOGIC: Load File (Local Parsing) ---
  const loadFileForConfiguration = useCallback(async (fileIndex: number) => {
    if (!files || files.length === 0 || fileIndex >= files.length) return;

    setIsLoadingFile(true);
    setErrorParsingFile(null);
    setPivotError(null);

    const file = files[fileIndex];
    const fileKey = getFileKey(file);

    // Cache check
    if (fileConfigs[fileKey]?.rawData) {
      const firstEntry = fileConfigs[fileKey].rawData[0];
      if (typeof firstEntry === 'object' && firstEntry !== null) {
        setColumnOptions(Object.keys(firstEntry));
      }
      setIsLoadingFile(false);
      return;
    }

    try {
      const text = await file.text();
      let dataArray: any[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });
        if (result.errors.length > 0) {
          throw new Error(`CSV Parsing Error: ${result.errors[0].message}`);
        }
        dataArray = result.data;
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const jsonData = JSON.parse(text);
        dataArray = Array.isArray(jsonData) ? jsonData : (typeof jsonData === 'object' && jsonData !== null ? [jsonData] : []);
      } else {
        throw new Error(`Unsupported file type: ${file.name}. Please upload .json or .csv files.`);
      }

      const flattenedDataArray = dataArray.map(entry => flattenObject(entry));

      if (flattenedDataArray.length > 0) {
        const firstEntry = flattenedDataArray[0];
        const columns = Object.keys(firstEntry);
        setColumnOptions(columns);

        // Store original data before any pivot (using stable file ID)
        const fileId = getFileId(file);
        setOriginalData(prev => ({ ...prev, [fileId]: flattenedDataArray }));

        // Advanced detection if file might need pivoting (long format detection)
        const hasDateCol = columns.some(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time'));
        const hasNameCol = columns.some(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('type') || c.toLowerCase().includes('metric') || c.toLowerCase().includes('category') || c.toLowerCase().includes('sensor'));
        const hasValueCol = columns.some(c => c.toLowerCase().includes('value') || c.toLowerCase().includes('reading') || c.toLowerCase().includes('measure') || c.toLowerCase().includes('data') || c.toLowerCase() === 'y');

        // Check if multiple rows have the same date but different metric values (strong indicator of long format)
        let isProbablyLongFormat = false;
        if (hasDateCol && hasNameCol && hasValueCol && flattenedDataArray.length > 2) {
          const dateColName = columns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time'));
          const nameColName = columns.find(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('type') || c.toLowerCase().includes('metric') || c.toLowerCase().includes('category') || c.toLowerCase().includes('sensor'));

          if (dateColName && nameColName) {
            // Sample a subset of rows to see if any date has multiple different metrics
            const maxSampleSize = 100;
            const sampleSize = Math.min(flattenedDataArray.length, maxSampleSize);
            const dateStats: Record<string, { count: number; metrics: Set<string> }> = {};

            for (let i = 0; i < sampleSize; i++) {
              const row = flattenedDataArray[i];
              const dateValue = String(row[dateColName]);
              if (!dateStats[dateValue]) {
                dateStats[dateValue] = { count: 0, metrics: new Set() };
              }
              dateStats[dateValue].count++;
              dateStats[dateValue].metrics.add(String(row[nameColName]));
            }

            // If any date has multiple different metrics, it's likely long format
            isProbablyLongFormat = Object.values(dateStats).some(
              stat => stat.count > 1 && stat.metrics.size > 1
            );
          }
        }

        if (isProbablyLongFormat) {
          setPivotWarnings(prev => ({ ...prev, [fileId]: 'This file appears to be in "long format" (multiple data types per timestamp). You may want to enable "Pivot Data" to transform it.' }));
        } else {
          setPivotWarnings(prev => {
            const newWarnings = { ...prev };
            delete newWarnings[fileId];
            return newWarnings;
          });
        }

        const newConfig: FileConfig = {
          logDateColumn: columns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || columns[0] || '',
          valueColumn: columns.find(c => c.toLowerCase().includes('value') || c.toLowerCase().includes('metric')) || (columns.length > 1 ? columns[1] : columns[0]) || '',
          rawData: flattenedDataArray,
        };
        setFileConfigs(prev => ({ ...prev, [fileKey]: newConfig }));
      } else {
        throw new Error(`File ${file.name} is empty or not an array of objects.`);
      }
    } catch (e: any) {
      console.error(`Error processing file ${file.name}:`, e);
      let errorMessage = `Error parsing file ${file.name}: ${e.message}.`;
      if (e.message.includes('Unexpected token')) {
        errorMessage += ' Please check for common JSON errors like missing commas or brackets.';
      }
      setErrorParsingFile(errorMessage);
    } finally {
      setIsLoadingFile(false);
    }
  }, [files, fileConfigs, renamedFiles]);

  // --- LOGIC: Apply Pivot (Backend Call) ---
  const handleApplyPivot = async () => {
    if (!currentFile || !pivotIndex || !pivotColumn || !pivotValue) return;

    setIsLoadingFile(true);
    setPivotError(null);

    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('index_col', pivotIndex);
      formData.append('columns_col', pivotColumn);
      formData.append('values_col', pivotValue);

      const response = await fetch(`${API_URL}/api/transform/pivot`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // If JSON parsing fails, try getting text
          const errText = await response.text();
          if (errText) errorMessage = errText;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();

      if (!responseText || responseText.trim() === '') {
        throw new Error('Backend returned empty response. Check if server is running and columns are correct.');
      }

      const sanitizedText = responseText.replace(/:\s*NaN\b/g, ':null');
      const transformedData = JSON.parse(sanitizedText);


      // Update file configuration with new data
      const fileKey = getFileKey(currentFile);
      const fileId = getFileId(currentFile);

      // Flatten the received JSON (just in case)
      const flattenedData = transformedData.map((entry: any) => flattenObject(entry));

      if (flattenedData.length > 0) {
        const newColumns = Object.keys(flattenedData[0]);

        setFileConfigs(prev => ({
          ...prev,
          [fileKey]: {
            ...prev[fileKey],
            rawData: flattenedData,
            // Update default columns as old ones may have been removed
            logDateColumn: pivotIndex,
            valueColumn: newColumns.find(c => c !== pivotIndex) || ''
          }
        }));

        // Important: update column options to reflect the new state (e.g., data_type_30, data_type_31)
        setColumnOptions(newColumns);

        // Reset pivot dropdown selections since old columns no longer exist
        setPivotIndex('');
        setPivotColumn('');
        setPivotValue('');

        // Mark pivot as applied for this file (using stable file ID)
        setPivotApplied(prev => ({ ...prev, [fileId]: true }));
      } else {
        throw new Error("Pivot resulted in empty data.");
      }

    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setPivotError(errorMsg);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // --- NAVIGATION: Next / Back ---
  const handleNextFilePreview = () => {
    // Reset pivot error but keep warning per file, and keep pivot mode and applied state per file
    setPivotError(null);
    setPivotIndex('');
    setPivotColumn('');
    setPivotValue('');

    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setEditingFileName(false);
    } else {
      setCurrentStep('column-config');
      initializeGroups();
    }
  };

  const handleBack = () => {
    if (currentStep === 'column-config') {
      setCurrentStep('file-preview');
      // Reset validation state when returning to file preview
      setFieldErrors({});
      setMissingValueGroupError(false);
    } else if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
      setEditingFileName(false);
    }
  };

  const initializeGroups = () => {
    const fileKeys = Object.keys(fileConfigs);
    if (fileKeys.length > 0) {
      // Find first COMMON numeric column (exists in all files and is numeric)
      // This ensures consistency across all files, not per-file selection
      const commonNumericColumns = proposedColumns.filter(col => col.isNumeric);
      const commonNumericColumn = commonNumericColumns.length > 0 ? commonNumericColumns[0].name : '';

      // Create mappings: use common numeric column if available, fallback to per-file numeric
      const valueMappings: Record<string, string> = {};

      if (commonNumericColumn) {
        // All files use the same common numeric column
        fileKeys.forEach(key => {
          valueMappings[key] = commonNumericColumn;
        });
      } else {
        // Fallback: find first numeric column per file (only if no common numeric exists)
        fileKeys.forEach(key => {
          const config = fileConfigs[key];
          if (config.rawData.length > 0) {
            const firstRow = config.rawData[0];
            const columns = Object.keys(firstRow);

            const dateCol = config.logDateColumn;
            const numericColumn = columns.find(col => {
              if (col === dateCol) return false;
              
              // Check multiple rows (up to 10) to ensure column is truly numeric
              const sampleSize = Math.min(config.rawData.length, 10);
              let checkedCount = 0;

              for (let i = 0; i < config.rawData.length && checkedCount < sampleSize; i++) {
                const row = config.rawData[i];
                const value = row[col];

                // Skip null/undefined values
                if (value === undefined || value === null || value === '') continue;

                checkedCount++;

                // Use strict regex validation to ensure purely numeric values
                const strValue = String(value).trim();
                if (!NUMERIC_PATTERN.test(strValue)) return false;
              }

              return checkedCount > 0;
            });

            // Use 'none' instead of potentially non-numeric valueColumn if no numeric column found
            valueMappings[key] = numericColumn || 'none';
          } else {
            valueMappings[key] = 'none';
          }
        });
      }

      // Try to generate automatic name based on value columns
      const valueColumns = Object.values(valueMappings).filter(col => col !== 'none');
      const firstValueColumn = valueColumns[0];
      const allSameValueColumns = valueColumns.length > 0 && valueColumns.every(col => col === firstValueColumn);
      const autoValueGroupName = allSameValueColumns ? firstValueColumn : 'Value Group 1';

      setGroups([
        {
          id: 'date',
          name: 'Date',
          fileMappings: Object.fromEntries(fileKeys.map(key => [key, fileConfigs[key].logDateColumn]))
        },
        {
          id: 'value',
          name: autoValueGroupName,
          fileMappings: valueMappings
        }
      ]);
    }
  };

  // --- LOGIC: Group Management ---
  const addNewGroup = () => {
    const newGroupName = `Value Group ${groupCounter}`;
    setGroupCounter(prev => prev + 1);
    setMissingValueGroupError(false);
    setGroups(prev => [
      ...prev,
      {
        id: generateGroupId(),
        name: newGroupName,
        fileMappings: Object.fromEntries(Object.keys(fileConfigs).map(key => [key, 'none']))
      }
    ]);
    // Scroll to bottom after adding group
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = modalBodyRef.current.scrollHeight;
      }
    }, 100);
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter(group => group.id !== groupId));
    setManuallyEditedGroups(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    // Clear field errors for this group
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${groupId}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  // Generate automatic group name based on selected columns
  const generateAutoGroupName = (groupId: string, updatedMappings: Record<string, string>): string | null => {
    // Don't auto-rename if user manually edited the name
    if (manuallyEditedGroups.has(groupId)) {
      return null;
    }

    // Get all selected columns (excluding 'none')
    const selectedColumns = Object.values(updatedMappings).filter(col => col !== 'none');

    // If no columns selected, don't auto-rename
    if (selectedColumns.length === 0) {
      return null;
    }

    // Check if all selected columns have the same name
    const firstColumn = selectedColumns[0];
    const allSame = selectedColumns.every(col => col === firstColumn);

    if (allSame) {
      return firstColumn;
    }

    return null;
  };

  const updateGroupMapping = (groupId: string, fileKey: string, column: string) => {
    // Clear error for this specific field
    const errorKey = `${groupId}-${fileKey}`;
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });

    setGroups(prevGroups => prevGroups.map(group => {
      if (group.id !== groupId) return group;

      const updatedMappings = { ...group.fileMappings, [fileKey]: column };
      const autoName = generateAutoGroupName(groupId, updatedMappings);

      return {
        ...group,
        fileMappings: updatedMappings,
        name: autoName !== null ? autoName : group.name
      };
    }));
  };

  // --- LOGIC: Renaming ---
  const handleRenameFile = () => {
    const originalKey = currentFile.name.replace(/\.(json|csv)$/i, '');
    const newKey = tempFileName.trim();
    setRenameError(null);

    const currentDisplayName = getFileKey(currentFile);
    if (!newKey || newKey === currentDisplayName) {
      setEditingFileName(false);
      return;
    }
    if (fileConfigs[newKey]) {
      setRenameError(`File name "${newKey}" already exists`);
      return;
    }

    setFileConfigs(prev => {
      const { [currentDisplayName]: config, ...rest } = prev;
      return { ...rest, [newKey]: config };
    });

    setRenamedFiles(prev => ({
      ...prev,
      [originalKey]: newKey
    }));

    setEditingFileName(false);
  };

  const startEditingFileName = (currentName: string) => {
    setTempFileName(currentName);
    setEditingFileName(true);
    setRenameError(null);
  };

  const cancelEditingFileName = () => {
    setEditingFileName(false);
    setTempFileName('');
    setRenameError(null);
  };

  const startEditingGroupName = (groupId: string, currentName: string) => {
    setEditingGroupName(groupId);
    setTempGroupName(currentName);
    setGroupNameError(null);
  };

  const saveGroupName = (groupId: string) => {
    const trimmedName = tempGroupName.trim();
    if (!trimmedName) {
      setGroupNameError('Group name cannot be empty');
      return;
    }
    const nameExists = groups.some(group => group.id !== groupId && group.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) {
      setGroupNameError('A group with this name already exists');
      return;
    }
    setGroups(groups.map(group => group.id === groupId ? { ...group, name: trimmedName } : group));
    setManuallyEditedGroups(prev => new Set(prev).add(groupId));
    setEditingGroupName(null);
    setTempGroupName('');
  };

  // --- LOGIC: Validation & Finish ---
  const validateDataMappings = (): boolean => {
    const errors: Record<string, string> = {};

    for (const group of groups) {
      // Check if group has at least one column selected (not all 'none')
      const hasSelection = Object.values(group.fileMappings).some(col => col && col !== 'none');
      if (!hasSelection && group.id !== 'date') {
        // Don't add error for date group, but for value groups it's invalid
        // We'll track this in field errors
        for (const fileKey of Object.keys(fileConfigs)) {
          const errorKey = `${group.id}-${fileKey}`;
          errors[errorKey] = `This group has no columns selected.`;
        }
        continue;
      }

      for (const fileKey in group.fileMappings) {
        const columnName = group.fileMappings[fileKey];
        if (!columnName || columnName === 'none') continue;

        const config = fileConfigs[fileKey];
        if (!config || config.rawData.length === 0) continue;

        const sampleRow = config.rawData.find(row => row[columnName] !== undefined && row[columnName] !== null);
        if (!sampleRow) continue;
        const value = sampleRow[columnName];

        const errorKey = `${group.id}-${fileKey}`;
        if (group.id === 'date') {
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) {
            errors[errorKey] = `Column '${columnName}' appears to contain an invalid date format.`;
          }
        } else {
          // Use regex to validate that value is purely numeric (not "75_NO_DD" type)
          const strValue = String(value).trim();
          if (!NUMERIC_PATTERN.test(strValue)) {
            errors[errorKey] = `Column '${columnName}' contains non-numeric values. Please select a numeric column.`;
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const groupAndTransformData = () => {
    const result: Record<string, any> = {};
    const dateGroup = groups.find(g => g.id === 'date');
    if (!dateGroup) return result;

    Object.entries(fileConfigs).forEach(([fileKey, config]) => {
      const dateColumn = dateGroup.fileMappings[fileKey];
      if (!dateColumn) return;

      config.rawData.forEach(row => {
        const dateValue = row[dateColumn];
        if (dateValue === undefined) return;

        const dateObj = new Date(dateValue);
        if (isNaN(dateObj.getTime())) return;
        const isoDateString = dateObj.toISOString();

        if (!result[isoDateString]) {
          result[isoDateString] = {};
        }

        groups.forEach(group => {
          if (group.id === 'date') return;
          const column = group.fileMappings[fileKey];
          if (!column || column === 'none' || row[column] === undefined) return;

          if (!result[isoDateString][group.name]) {
            result[isoDateString][group.name] = {};
          }
          const value = row[column];
          if (!isNaN(parseFloat(value))) {
            result[isoDateString][group.name][fileKey] = parseFloat(row[column]);
          }
        });
      });
    });
    return result;
  };

  // --- HELPER: Check if there are any non-date groups ---
  const hasNonDateGroups = (): boolean => {
    return groups.filter(g => g.id !== 'date').length > 0;
  };

  const handleFinish = () => {
    setFieldErrors({});
    setMissingValueGroupError(false);

    // Check if there's at least one non-date group
    if (!hasNonDateGroups()) {
      setMissingValueGroupError(true);
      return;
    }

    const unnamedGroups = groups.filter(group => !group.name.trim());
    if (unnamedGroups.length > 0) {
      return;
    }
    const groupNames = groups.map(group => group.name.toLowerCase());
    if (groupNames.length !== new Set(groupNames).size) {
      return;
    }

    const isValid = validateDataMappings();
    if (!isValid) {
      return;
    }
    const groupedData = groupAndTransformData();
    onComplete(groupedData);
    onHide();
  };

  useEffect(() => {
    if (show && files.length > 0 && currentStep === 'file-preview') {
      setRenameError(null);
      setEditingFileName(false);
      loadFileForConfiguration(currentFileIndex);
    }
  }, [show, files.length, currentFileIndex, currentStep, loadFileForConfiguration]);

  const getUsedColumnsForFile = (fileKey: string) => {
    const usedColumns = new Set<string>();
    groups.forEach(group => {
      const column = group.fileMappings[fileKey];
      if (column && column !== 'none') {
        usedColumns.add(column);
      }
    });
    return Array.from(usedColumns);
  };

  // --- HELPER: Check if column is numeric in all files ---
  const isColumnNumericInAllFiles = (columnName: string): boolean => {
    const fileKeys = Object.keys(fileConfigs);
    return fileKeys.every(fileKey => {
      const config = fileConfigs[fileKey];
      if (!config.rawData || config.rawData.length === 0) return false;

      // Check multiple rows (up to 10) to ensure column is truly numeric
      const sampleSize = Math.min(config.rawData.length, 10);
      let checkedCount = 0;

      for (let i = 0; i < config.rawData.length && checkedCount < sampleSize; i++) {
        const row = config.rawData[i];
        const value = row[columnName];

        // Skip null/undefined values
        if (value === undefined || value === null || value === '') continue;

        checkedCount++;

        // Check if value is numeric
        const numValue = parseFloat(value as any);
        if (isNaN(numValue)) return false;

        // CRITICAL: parseFloat('75_NO_DD') returns 75, so we need strict regex validation
        // to ensure the entire string is purely numeric (e.g., reject "75_NO_DD", "2.2x", etc.)
        // This prevents hardware IDs like "75_NO_DD" from being treated as numeric values
        const strValue = String(value).trim();
        if (!NUMERIC_PATTERN.test(strValue)) return false;
      }

      // If we didn't find any values to check, consider it non-numeric
      return checkedCount > 0;
    });
  };

  // --- LOGIC: Find Common Columns Across All Files (Memoized) ---
  const proposedColumns = useMemo((): Array<{ name: string; isNumeric: boolean }> => {
    const fileKeys = Object.keys(fileConfigs);
    if (fileKeys.length === 0) return [];

    // Get columns from first file
    const firstFileColumns = fileConfigs[fileKeys[0]].rawData.length > 0
      ? Object.keys(fileConfigs[fileKeys[0]].rawData[0])
      : [];

    // Filter to columns that exist in ALL files
    const commonColumns = firstFileColumns.filter(column => {
      return fileKeys.every(fileKey => {
        const fileColumns = fileConfigs[fileKey].rawData.length > 0
          ? Object.keys(fileConfigs[fileKey].rawData[0])
          : [];
        return fileColumns.includes(column);
      });
    });

    // Filter out columns already used in groups
    const usedInGroups = new Set<string>();
    groups.forEach(group => {
      Object.values(group.fileMappings).forEach(col => {
        if (col && col !== 'none') usedInGroups.add(col);
      });
    });

    const availableColumns = commonColumns.filter(col => !usedInGroups.has(col));

    // Map to include numeric information
    const columnsWithMetadata = availableColumns.map(col => ({
      name: col,
      isNumeric: isColumnNumericInAllFiles(col)
    }));

    // Sort: numeric first, then by name
    return columnsWithMetadata.sort((a, b) => {
      if (a.isNumeric !== b.isNumeric) return a.isNumeric ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [fileConfigs, groups]);

  // --- HELPER: Check if there are any available columns in any file ---
  const hasAvailableColumnsInFiles = (): boolean => {
    return Object.keys(fileConfigs).some(fileKey => {
      const fileColumns = fileConfigs[fileKey].rawData.length > 0
        ? Object.keys(fileConfigs[fileKey].rawData[0])
        : [];
      const usedColumns = getUsedColumnsForFile(fileKey);
      return fileColumns.some(col => !usedColumns.includes(col));
    });
  };

  const addProposedGroup = (columnName: string) => {
    const fileKeys = Object.keys(fileConfigs);
    setMissingValueGroupError(false);
    // NOTE: Proposed groups are intentionally NOT added to manuallyEditedGroups.
    // This allows auto-renaming to work when user modifies column mappings after adding a proposed group.
    // The group name will automatically update to reflect the common column name across all files,
    // which is the expected behavior for dynamically created groups based on column suggestions.
    setGroups(prev => [
      ...prev,
      {
        id: generateGroupId(),
        name: columnName,
        fileMappings: Object.fromEntries(fileKeys.map(key => [key, columnName]))
      }
    ]);
    // Scroll to bottom after adding group
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = modalBodyRef.current.scrollHeight;
      }
    }, 100);
  };

  return (
    <Modal show={show} onHide={onHide} backdrop="static" keyboard={false} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="ms-2 d-flex align-items-center">
          {currentStep === 'file-preview'
            ? `File Preview (${currentFileIndex + 1}/${files.length})`
            : 'Map Files to Data Groups'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body ref={modalBodyRef} className="d-flex flex-column gap-3">
        {currentStep === 'file-preview' ? (
          <>
            <Form.Group>
              <Form.Label className="fw-bold d-flex align-items-center gap-2">
                File:
                {currentFile ? (
                  editingFileName ? (
                    <>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={tempFileName}
                        onChange={(e) => setTempFileName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRenameFile();
                          } else if (e.key === 'Escape') {
                            cancelEditingFileName();
                          }
                        }}
                        style={{ maxWidth: '200px' }}
                        isInvalid={!!renameError}
                      />
                      <Button size="sm" variant="success" onClick={handleRenameFile}>✓</Button>
                      <Button size="sm" variant="outline-secondary" onClick={cancelEditingFileName}>✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="fw-normal">{getFileKey(currentFile)}</span>
                      <Button size="sm" variant="outline-primary" onClick={() => startEditingFileName(getFileKey(currentFile))}>
                        Rename
                      </Button>
                    </>
                  )
                ) : (
                  <span className="fw-normal text-muted">No file loaded</span>
                )}
              </Form.Label>
            </Form.Group>

            {/* --- SEKCJA PIVOT START --- */}
            {currentFile && pivotWarnings[getFileId(currentFile)] && !isPivotMode[getFileId(currentFile)] && (
              <Alert variant="info" className="py-2">
                <small>{pivotWarnings[getFileId(currentFile)]}</small>
              </Alert>
            )}
            {isPivotMode[getFileId(currentFile)] && pivotApplied[getFileId(currentFile)] && (
              <Alert variant="success" className="py-2">
                <small>Pivot applied. To revert to original data, toggle off "Pivot Data" switch below.</small>
              </Alert>
            )}
            <div className="p-3 border rounded bg-light">
              <Form.Check
                type="switch"
                id="pivot-switch"
                label="Pivot Data"
                checked={isPivotMode[getFileId(currentFile)] || false}
                onChange={(e) => {
                  const fileKey = getFileKey(currentFile);
                  const fileId = getFileId(currentFile);
                  setIsPivotMode(prev => ({ ...prev, [fileId]: e.target.checked }));
                  // If we uncheck, restore the original data
                  if (!e.target.checked) {
                    if (originalData[fileId] && originalData[fileId].length > 0) {
                      const originalColumns = Object.keys(originalData[fileId][0]);
                      setColumnOptions(originalColumns);
                      setFileConfigs(prev => ({
                        ...prev,
                        [fileKey]: {
                          ...prev[fileKey],
                          rawData: originalData[fileId],
                          logDateColumn: originalColumns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || originalColumns[0] || '',
                          valueColumn: originalColumns.find(c => c.toLowerCase().includes('value') || c.toLowerCase().includes('metric')) || (originalColumns.length > 1 ? originalColumns[1] : originalColumns[0]) || '',
                        }
                      }));
                      setPivotApplied(prev => ({ ...prev, [fileId]: false }));
                    }
                    setPivotError(null);
                  }
                }}
                className="mb-0 fw-bold"
              />

              {isPivotMode[getFileId(currentFile)] && !pivotApplied[getFileId(currentFile)] && (
                <div className="d-flex gap-3 align-items-end flex-wrap">
                  <Form.Group style={{ minWidth: '150px' }}>
                    <Form.Label className="small text-muted mb-1">Index (Date/Time)</Form.Label>
                    <Form.Select
                      size="sm"
                      value={pivotIndex}
                      onChange={(e) => setPivotIndex(e.target.value)}
                    >
                      {columnOptions.map(col => <option key={col} value={col}>{col}</option>)}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group style={{ minWidth: '150px' }}>
                    <Form.Label className="small text-muted mb-1">Pivot Column (Category)</Form.Label>
                    <Form.Select
                      size="sm"
                      value={pivotColumn}
                      onChange={(e) => setPivotColumn(e.target.value)}
                    >
                      {columnOptions.map(col => <option key={col} value={col}>{col}</option>)}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group style={{ minWidth: '150px' }}>
                    <Form.Label className="small text-muted mb-1">Value to Aggregate</Form.Label>
                    <Form.Select
                      size="sm"
                      value={pivotValue}
                      onChange={(e) => setPivotValue(e.target.value)}
                    >
                      {columnOptions.map(col => <option key={col} value={col}>{col}</option>)}
                    </Form.Select>
                  </Form.Group>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyPivot}
                    disabled={isLoadingFile || !pivotIndex || !pivotColumn || !pivotValue}
                  >
                    {isLoadingFile ? <Spinner size="sm" animation="border" /> : 'Apply Pivot'}
                  </Button>
                </div>
              )}
              {pivotError && <Alert variant="danger" className="mt-2 py-1 small">{pivotError}</Alert>}
            </div>
            {/* --- SEKCJA PIVOT END --- */}

            {isLoadingFile && <p>Loading data...</p>}
            {errorParsingFile && !isPivotMode[getFileId(currentFile)] && <p style={{ color: 'red' }}>Error: {errorParsingFile}</p>}

            {!isLoadingFile && currentConfig?.rawData && (
              <div className="mt-4">
                <DataTable
                  data={currentConfig.rawData}
                  title={pivotApplied[getFileId(currentFile)] ? "Preview (Transformed)" : "File Preview (Raw)"}
                  showPagination={true}
                />
                {isPivotMode[getFileId(currentFile)] && currentConfig.rawData.length > 0 && (
                  <p className="text-muted small mt-1">
                    {pivotColumn
                      ? <>* New columns generated from <strong>{pivotColumn}</strong>.</>
                      : <>* New columns were generated by the pivot operation.</>
                    }
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {missingValueGroupError && (
              <Alert variant="danger" className="mb-0">
                <strong>Error:</strong> At least one value group is required besides the Date group.
              </Alert>
            )}

            {/* Data Groups Section */}
            <h5 className="fw-bold">Data Groups</h5>
            {groups.map((group) => {
              const isEditing = editingGroupName === group.id;
              return (
                <div
                  key={group.id}
                  className={`p-3 border rounded ${group.id === 'date' ? 'bg-info bg-opacity-10 border-info border-opacity-50' : 'bg-white'}`}
                >
                  <div className="mb-3 d-flex align-items-center justify-content-start gap-3 flex-wrap">
                    {isEditing && group.id !== 'date' ? (
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="text"
                          size="sm"
                          value={tempGroupName}
                          onChange={(e) => setTempGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveGroupName(group.id);
                            } else if (e.key === 'Escape') {
                              setEditingGroupName(null);
                              setGroupNameError(null);
                            }
                          }}
                          autoFocus
                          isInvalid={!!groupNameError}
                          style={{ maxWidth: '200px' }}
                        />
                        <Button size="sm" variant="success" onClick={() => saveGroupName(group.id)}>✓</Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => { setEditingGroupName(null); setGroupNameError(null); }}>✕</Button>
                        {groupNameError && <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>{groupNameError}</Form.Control.Feedback>}
                      </div>
                    ) : (
                      <>
                        <div className="d-flex align-items-center gap-2">
                          <h5 className="mb-0 fw-bold">{group.id === 'date' ? 'Date Group' : group.name}</h5>
                          {group.id === 'date' && (
                            <span className="badge bg-info text-dark">Auto-configured</span>
                          )}
                        </div>
                        {group.id !== 'date' && (
                          <div className="d-flex align-items-center gap-2">
                            <Button size="sm" variant="outline-primary" onClick={() => startEditingGroupName(group.id, group.name)}>Rename</Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={groups.filter((g) => g.id !== 'date').length <= 1}
                              onClick={() => removeGroup(group.id)}
                            >
                              Remove
                            </Button>
                            {groups.filter((g) => g.id !== 'date').length <= 1 && (
                              <span className="text-muted small">At least one value group is required.</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {Object.keys(fileConfigs).map((fileKey) => {
                    const fileColumns = fileConfigs[fileKey].rawData.length > 0 ? Object.keys(fileConfigs[fileKey].rawData[0]) : [];
                    const usedColumns = getUsedColumnsForFile(fileKey);
                    const currentSelection = group.fileMappings[fileKey] || 'none';
                    const availableColumns = fileColumns.filter(col => col === currentSelection || !usedColumns.includes(col));
                    const errorKey = `${group.id}-${fileKey}`;
                    const hasError = !!fieldErrors[errorKey];

                    return (
                      <Form.Group key={`${group.id}-${fileKey}`} className="mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <div style={{ minWidth: '150px', fontWeight: '500' }}>
                            {fileKey}
                          </div>
                          <div className="flex-grow-1">
                            <Form.Select
                              value={currentSelection}
                              onChange={(e) => updateGroupMapping(group.id, fileKey, e.target.value)}
                              isInvalid={hasError}
                              size="sm"
                            >
                              <option value="none">None</option>
                              {availableColumns.map((col) => (
                                <option key={`${group.id}-${fileKey}-${col}`} value={col}>{col}</option>
                              ))}
                            </Form.Select>
                            {hasError && (
                              <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                {fieldErrors[errorKey]}
                              </Form.Control.Feedback>
                            )}
                          </div>
                        </div>
                      </Form.Group>
                    );
                  })}
                </div>
              );
            })}
            {hasAvailableColumnsInFiles() && (
              <>
                <Button variant="outline-primary" onClick={addNewGroup}>+ Add New Group</Button>

                {/* Proposed Groups Section - Below Add Button */}
                {(() => {
                  const filteredColumns = showOnlyNumeric
                    ? proposedColumns.filter(col => col.isNumeric)
                    : proposedColumns;

                  return proposedColumns.length > 0 ? (
                    <div className="p-3 border rounded bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0 fw-bold text-muted">Proposed Groups</h6>
                        <Form.Check
                          type="switch"
                          id="numeric-filter-switch"
                          label={<span className="small text-muted">Show only numeric</span>}
                          checked={showOnlyNumeric}
                          onChange={(e) => setShowOnlyNumeric(e.target.checked)}
                          className="mb-0"
                        />
                      </div>
                      <p className="small text-muted mb-2">
                        These columns appear in all files and could be added as separate groups:
                      </p>
                      {filteredColumns.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {filteredColumns.map((col) => (
                            <Button
                              key={col.name}
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => addProposedGroup(col.name)}
                              className={col.isNumeric
                                ? 'bg-success-subtle border-success-subtle text-success-emphasis'
                                : 'bg-danger-subtle border-danger-subtle text-danger-emphasis'}
                            >
                              + Add "{col.name}" {col.isNumeric ? '✓' : '⚠'}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="small text-muted mb-0 fst-italic">
                          No {showOnlyNumeric ? 'numeric' : ''} columns available. Turn off the numeric filter to see all options.
                        </p>
                      )}
                      {!showOnlyNumeric && proposedColumns.some(col => !col.isNumeric) && (
                        <p className="small text-danger mt-2 mb-0">
                          <strong>Note:</strong> Non-numeric columns (marked with ⚠) will fail validation if used in value groups.
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {!(currentStep === 'file-preview' && currentFileIndex === 0) && (
          <Button variant="secondary" onClick={handleBack}>Back</Button>
        )}
        <Button
          variant="primary"
          onClick={currentStep === 'file-preview' ? handleNextFilePreview : handleFinish}
          disabled={
            currentStep === 'file-preview'
              ? isLoadingFile || !!errorParsingFile || !!renameError || (isPivotMode[getFileId(currentFile)] && !!pivotError)
              : Object.keys(fieldErrors).length > 0 || !hasNonDateGroups()
          }
        >
          {currentStep === 'file-preview'
            ? currentFileIndex < files.length - 1 ? 'Next File' : 'Configure Columns'
            : 'Finish & Process Data'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DataImportPopup;