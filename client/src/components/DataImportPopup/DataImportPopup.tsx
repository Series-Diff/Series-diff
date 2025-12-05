import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { DataTable } from '../DataTable/DataTable';
import Papa from 'papaparse';

const API_URL = process.env.REACT_APP_API_URL || '';

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
  const [columnOptions, setColumnOptions] = useState<string[]>([]); // Dostępne kolumny w bieżącym pliku

  // --- STATE: Loading & Errors ---
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorParsingFile, setErrorParsingFile] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- STATE: Grouping & Renaming ---
  const [groups, setGroups] = useState<Group[]>([]);
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState<string>('');
  const [groupCounter, setGroupCounter] = useState(1);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);

  // --- STATE: Pivot ---
  const [isPivotMode, setIsPivotMode] = useState(false);
  const [pivotIndex, setPivotIndex] = useState('');   // np. log_date
  const [pivotColumn, setPivotColumn] = useState(''); // np. data_type
  const [pivotValue, setPivotValue] = useState('');   // np. value
  const [pivotError, setPivotError] = useState<string | null>(null);

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

  // --- HELPER: Get File Key ---
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
    setGroupCounter(1);
    setGroupNameError(null);
    setValidationError(null);

    // Reset pivot state
    setIsPivotMode(false);
    setPivotIndex('');
    setPivotColumn('');
    setPivotValue('');
    setPivotError(null);
  };

  // --- EFFECT: Auto-detect Pivot Columns ---
  // Gdy załadują się kolumny (columnOptions), próbujemy zgadnąć domyślne ustawienia dla pivota
  useEffect(() => {
    if (columnOptions.length > 0) {
        const probableDate = columnOptions.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || columnOptions[0];
        const probableValue = columnOptions.find(c => c.toLowerCase().includes('value')) || columnOptions[columnOptions.length - 1];
        const probableCategory = columnOptions.find(c => c !== probableDate && c !== probableValue) || columnOptions[1] || columnOptions[0];

        // Ustawiamy tylko jeśli wartości są puste (żeby nie nadpisywać wyboru użytkownika)
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
            const err = await response.json();
            throw new Error(err.error || 'Pivot failed');
        }

        const responseText = await response.text();
        const sanitizedText = responseText.replace(/:\s*NaN\b/g, ':null');
        const transformedData = JSON.parse(sanitizedText);


        // Aktualizujemy konfigurację pliku nowymi danymi
        const fileKey = getFileKey(currentFile);

        // Spłaszczamy otrzymany JSON (na wszelki wypadek)
        const flattenedData = transformedData.map((entry: any) => flattenObject(entry));

        if (flattenedData.length > 0) {
            const newColumns = Object.keys(flattenedData[0]);

            setFileConfigs(prev => ({
                ...prev,
                [fileKey]: {
                    ...prev[fileKey],
                    rawData: flattenedData,
                    // Aktualizujemy domyślne kolumny, bo stare mogły zniknąć
                    logDateColumn: pivotIndex,
                    valueColumn: newColumns.find(c => c !== pivotIndex) || ''
                }
            }));

            // Ważne: zaktualizuj opcje kolumn, by odzwierciedlały nowy stan (np. data_type_30, data_type_31)
            setColumnOptions(newColumns);
        } else {
             throw new Error("Pivot resulted in empty data.");
        }

    } catch (e: any) {
        setPivotError(e.message);
    } finally {
        setIsLoadingFile(false);
    }
  };

  // --- NAVIGATION: Next / Back ---
  const handleNextFilePreview = () => {
    // Reset pivot state for next file
    setIsPivotMode(false);
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
    } else if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
      setEditingFileName(false);
    }
  };

  const initializeGroups = () => {
    const fileKeys = Object.keys(fileConfigs);
    if (fileKeys.length > 0) {
      setGroups([
        {
          id: 'date',
          name: 'Date',
          fileMappings: Object.fromEntries(fileKeys.map(key => [key, fileConfigs[key].logDateColumn]))
        },
        {
          id: 'value',
          name: 'Value',
          fileMappings: Object.fromEntries(fileKeys.map(key => [key, fileConfigs[key].valueColumn]))
        }
      ]);
    }
  };

  // --- LOGIC: Group Management ---
  const addNewGroup = () => {
    const newGroupName = `Group${groupCounter}`;
    setGroupCounter(prev => prev + 1);
    setGroups(prev => [
      ...prev,
      {
        id: `group-${Date.now()}`,
        name: newGroupName,
        fileMappings: Object.fromEntries(Object.keys(fileConfigs).map(key => [key, 'none']))
      }
    ]);
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter(group => group.id !== groupId));
  };

  const updateGroupMapping = (groupId: string, fileKey: string, column: string) => {
    setValidationError(null);
    setGroups(groups.map(group =>
      group.id === groupId
        ? { ...group, fileMappings: { ...group.fileMappings, [fileKey]: column } }
        : group
    ));
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
    setEditingGroupName(null);
    setTempGroupName('');
  };

  // --- LOGIC: Validation & Finish ---
  const validateDataMappings = (): string | null => {
    for (const group of groups) {
      for (const fileKey in group.fileMappings) {
        const columnName = group.fileMappings[fileKey];
        if (!columnName || columnName === 'none') continue;

        const config = fileConfigs[fileKey];
        if (!config || config.rawData.length === 0) continue;

        const sampleRow = config.rawData.find(row => row[columnName] !== undefined && row[columnName] !== null);
        if (!sampleRow) continue;
        const value = sampleRow[columnName];

        if (group.id === 'date') {
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
                return `Column '${columnName}' in file '${fileKey}' appears to contain an invalid date format.`;
            }
        } else {
            if (isNaN(parseFloat(value as any)) || !isFinite(value as any)) {
                return `Column '${columnName}' in file '${fileKey}' for group '${group.name}' appears to contain a non-numeric value.`;
            }
        }
      }
    }
    return null;
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
          if(!isNaN(parseFloat(value))){
            result[isoDateString][group.name][fileKey] = parseFloat(row[column]);
          }
        });
      });
    });
    return result;
  };

  const handleFinish = () => {
    setValidationError(null);
    const unnamedGroups = groups.filter(group => !group.name.trim());
    if (unnamedGroups.length > 0) {
      alert('Please provide names for all groups.');
      return;
    }
    const groupNames = groups.map(group => group.name.toLowerCase());
    if (groupNames.length !== new Set(groupNames).size) {
      alert('Group names must be unique.');
      return;
    }

    const mappingError = validateDataMappings();
    if (mappingError) {
      setValidationError(mappingError);
      return;
    }
    const groupedData = groupAndTransformData();
    onComplete(groupedData);
    onHide();
  };

    useEffect(() => {
    if (show && files.length > 0 && currentStep === 'file-preview') {
      setValidationError(null);
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

  return (
    <Modal show={show} onHide={onHide} backdrop="static" keyboard={false} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="ms-2 d-flex align-items-center">
          {currentStep === 'file-preview'
            ? `File Preview (${currentFileIndex + 1}/${files.length})`
            : 'Configure Columns'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {currentStep === 'file-preview' ? (
          <>
            <Form.Group className="mb-4">
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
                        style={{ maxWidth: '200px' }}
                        isInvalid={!!renameError}
                      />
                      <Button size="sm" variant="success" onClick={handleRenameFile}>✓</Button>
                      <Button size="sm" variant="outline-secondary" onClick={cancelEditingFileName}>✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="fw-normal">{getFileKey(currentFile)}</span>
                      <Button size="sm" variant="outline-primary" onClick={() => {
                        setTempFileName(getFileKey(currentFile));
                        setEditingFileName(true);
                        setRenameError(null);
                      }}>
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
            <div className="p-3 mb-3 border rounded bg-light">
                <Form.Check
                    type="switch"
                    id="pivot-switch"
                    label="Pivot Data"
                    checked={isPivotMode}
                    onChange={(e) => {
                        setIsPivotMode(e.target.checked);
                        // Jeśli odznaczamy, resetujemy do oryginalnego pliku
                        if (!e.target.checked) {
                             loadFileForConfiguration(currentFileIndex);
                             setPivotError(null);
                        }
                    }}
                    className="mb-2 fw-bold"
                />

                {isPivotMode && (
                    <div className="d-flex gap-3 align-items-end flex-wrap">
                        <Form.Group style={{minWidth: '150px'}}>
                            <Form.Label className="small text-muted mb-1">Index (Date/Time)</Form.Label>
                            <Form.Select
                                size="sm"
                                value={pivotIndex}
                                onChange={(e) => setPivotIndex(e.target.value)}
                            >
                                {columnOptions.map(col => <option key={col} value={col}>{col}</option>)}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group style={{minWidth: '150px'}}>
                            <Form.Label className="small text-muted mb-1">Pivot Column (Category)</Form.Label>
                            <Form.Select
                                size="sm"
                                value={pivotColumn}
                                onChange={(e) => setPivotColumn(e.target.value)}
                            >
                                {columnOptions.map(col => <option key={col} value={col}>{col}</option>)}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group style={{minWidth: '150px'}}>
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
                            {isLoadingFile ? <Spinner size="sm" animation="border"/> : 'Apply Pivot'}
                        </Button>
                    </div>
                )}
                {pivotError && <Alert variant="danger" className="mt-2 py-1 small">{pivotError}</Alert>}
            </div>
            {/* --- SEKCJA PIVOT END --- */}

            {isLoadingFile && <p>Loading data...</p>}
            {errorParsingFile && !isPivotMode && <p style={{ color: 'red' }}>Error: {errorParsingFile}</p>}

            {!isLoadingFile && currentConfig?.rawData && (
              <div className="mt-4">
                <DataTable
                    data={currentConfig.rawData.slice(0, 5)}
                    title={isPivotMode ? "Preview (Transformed)" : "File Preview (Raw)"}
                />
                 {isPivotMode && currentConfig.rawData.length > 0 && (
                    <p className="text-muted small mt-1">
                        * New columns generated from <strong>{pivotColumn}</strong>.
                    </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <h5>Data Groups</h5>
            {groups.map((group) => (
              <div key={group.id} className="mb-4 p-3 border rounded">
                <Form.Group className="mb-3">
                  <Form.Label>Group Name</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    {editingGroupName === group.id ? (
                      <>
                        <Form.Control
                          type="text"
                          value={tempGroupName}
                          onChange={(e) => setTempGroupName(e.target.value)}
                          autoFocus
                          isInvalid={!!groupNameError}
                        />
                        <Button size="sm" variant="success" onClick={() => saveGroupName(group.id)}>✓</Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => { setEditingGroupName(null); setGroupNameError(null); }}>✕</Button>
                        {groupNameError && <Form.Control.Feedback type="invalid" style={{display:'block'}}>{groupNameError}</Form.Control.Feedback>}
                      </>
                    ) : (
                      <>
                        <span>{group.name}</span>
                        {group.id !== 'date' && (
                          <>
                            <Button size="sm" variant="outline-primary" onClick={() => startEditingGroupName(group.id, group.name)}>Rename</Button>
                            {group.id !== 'value' && (
                              <Button size="sm" variant="outline-danger" onClick={() => removeGroup(group.id)} className="ms-2">Remove</Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </Form.Group>

                <h6>File Mappings</h6>
                {Object.keys(fileConfigs).map((fileKey) => {
                  const fileColumns = fileConfigs[fileKey].rawData.length > 0 ? Object.keys(fileConfigs[fileKey].rawData[0]) : [];
                  const usedColumns = getUsedColumnsForFile(fileKey);
                  const currentSelection = group.fileMappings[fileKey] || 'none';
                  const availableColumns = fileColumns.filter(col => col === currentSelection || !usedColumns.includes(col));

                  return (
                    <Form.Group key={`${group.id}-${fileKey}`} className="mb-2">
                      <Form.Label>{fileKey}</Form.Label>
                      <Form.Select
                        value={currentSelection}
                        onChange={(e) => updateGroupMapping(group.id, fileKey, e.target.value)}
                      >
                        <option value="none">None</option>
                        {availableColumns.map((col) => (
                          <option key={`${group.id}-${fileKey}-${col}`} value={col}>{col}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  );
                })}
              </div>
            ))}
            <Button variant="outline-primary" onClick={addNewGroup}>+ Add New Group</Button>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {validationError && (
          <div className="alert alert-danger w-100 text-center p-2" role="alert">
            {validationError}
          </div>
        )}
        {!(currentStep === 'file-preview' && currentFileIndex === 0) && (
          <Button variant="secondary" onClick={handleBack}>Back</Button>
        )}
        <Button
          variant="primary"
          onClick={currentStep === 'file-preview' ? handleNextFilePreview : handleFinish}
          disabled={
            currentStep === 'file-preview'
              ? isLoadingFile || !!errorParsingFile || !!renameError || (isPivotMode && !!pivotError)
              : !!validationError
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