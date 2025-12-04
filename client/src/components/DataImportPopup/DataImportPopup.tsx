// src/components/DataImportPopup/DataImportPopup.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { DataTable } from '../DataTable/DataTable';
import Papa from 'papaparse';

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
         // Zmieniamy typ, aby odzwierciedlał, że otrzymujemy jeden obiekt
  onComplete: (groupedData: Record<string, any>) => void;
}

export const DataImportPopup: React.FC<Props> = ({ show, files, onHide, onComplete }) => {
  const [metricName, setMetricName] = useState(''); // Główny klucz metryki
  const [currentStep, setCurrentStep] = useState<'file-preview' | 'column-config'>('file-preview');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileConfigs, setFileConfigs] = useState<Record<string, FileConfig>>({});
  const [columnOptions, setColumnOptions] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorParsingFile, setErrorParsingFile] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});
  const [editingFileName, setEditingFileName] = useState<boolean>(false);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState<string>('');
  const [groupCounter, setGroupCounter] = useState(1); // Counter for default group names
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);


  const resetState = () => {
    setCurrentStep('file-preview');
    setCurrentFileIndex(0);

    setMetricName('');

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
  };

    const loadFileForConfiguration = useCallback(async (fileIndex: number) => {
    if (!files || files.length === 0 || fileIndex >= files.length) return;
    setIsLoadingFile(true);
    setErrorParsingFile(null);
    const file = files[fileIndex];
    const fileKey = getFileKey(file);


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
          header: true, // traktuj pierwszy wiersz jako nagłówki (klucze obiektu)
          skipEmptyLines: true,
          dynamicTyping: true, // Automatycznie konwertuj liczby i booleany
        });

        if (result.errors.length > 0) {
          // Weź pierwszy błąd jako komunikat
          throw new Error(`CSV Parsing Error: ${result.errors[0].message}`);
        }
        dataArray = result.data;

      } else if (file.name.toLowerCase().endsWith('.json')) {
        // Istniejąca logika parsowania JSON
        const jsonData = JSON.parse(text);
        dataArray = Array.isArray(jsonData) ? jsonData : (typeof jsonData === 'object' && jsonData !== null ? [jsonData] : []);
      } else {
        // Obsługa nieznanego typu pliku
        throw new Error(`Unsupported file type: ${file.name}. Please upload .json or .csv files.`);
      }

const flattenedDataArray = dataArray.map(entry => flattenObject(entry));
    console.log(flattenedDataArray[0]);

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
  }, [files, fileConfigs]);

  useEffect(() => {
    if (show && files.length > 0) {
      resetState();
      loadFileForConfiguration(0);
    }
  }, [show, files]);

  useEffect(() => {
    if (show && files.length > 0 && currentStep === 'file-preview') {
      setValidationError(null); // Clear validation errors when moving back to file preview
      setRenameError(null);
      setEditingFileName(false);
      loadFileForConfiguration(currentFileIndex);
    }
  }, [show, files.length, currentFileIndex, currentStep, loadFileForConfiguration]);

  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  let result: Record<string, any> = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Rekursywnie spłaszcz
      const nested = flattenObject(value, prefixedKey);
      result = { ...result, ...nested };
    } else {
      result[prefixedKey] = value;
    }
  }

  return result;
};

  const handleNextFilePreview = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setEditingFileName(false);
    } else {
      setCurrentStep('column-config');
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

  const updateGroupName = (groupId: string, name: string) => {
    setGroups(groups.map(group =>
      group.id === groupId ? { ...group, name } : group
    ));
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

    // Check if the name is already used by another group
    const nameExists = groups.some(
      group => group.id !== groupId && group.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      setGroupNameError('A group with this name already exists');
      return;
    }

    updateGroupName(groupId, trimmedName);
    setEditingGroupName(null);
    setTempGroupName('');
    setGroupNameError(null);
  };

  const cancelEditingGroupName = () => {
    setEditingGroupName(null);
    setTempGroupName('');
    setGroupNameError(null);
  };

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
      const { [originalKey]: config, ...rest } = prev;
      return { ...rest, [newKey]: config };
    });

    setGroups(prevGroups =>
      prevGroups.map(group => {
        const originalMapping = group.fileMappings[originalKey];
        const { [originalKey]: _, ...otherMappings } = group.fileMappings;
        return {
          ...group,
          fileMappings: {
            ...otherMappings,
            [newKey]: originalMapping
          }
        };
      })
    );

    setRenamedFiles(prev => ({
      ...prev,
      [originalKey]: newKey,
      ...Object.fromEntries(
        Object.entries(prev)
          .filter(([_, value]) => value !== originalKey)
      )
    }));

    setEditingFileName(false);
  };

  const cancelEditingFileName = () => {
    setEditingFileName(false);
    setTempFileName('');
    setRenameError(null);
  };

  const validateDataMappings = (): string | null => {
    for (const group of groups) {
      for (const fileKey in group.fileMappings) {
        const columnName = group.fileMappings[fileKey];
        if (!columnName || columnName === 'none') continue;

        const config = fileConfigs[fileKey];
        if (!config || config.rawData.length === 0) continue;

        // Znajdź pierwszy wiersz w pliku, który ma jakąkolwiek wartość w danej kolumnie
        const sampleRow = config.rawData.find(row => row[columnName] !== undefined && row[columnName] !== null);

        // Jeśli nie znaleziono żadnego wiersza z danymi, przejdź dalej
        if (!sampleRow) continue;

        const value = sampleRow[columnName];

        // Walidacja dla grupy 'Date'
        if (group.id === 'date') {
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
                return `Column '${columnName}' in file '${fileKey}' appears to contain an invalid date format (checked value: '${value}').`;
            }

        }
        // Walidacja dla wszystkich innych grup (muszą być numeryczne)
        else {
            if (isNaN(parseFloat(value as any)) || !isFinite(value as any)) {
                return `Column '${columnName}' in file '${fileKey}' for group '${group.name}' appears to contain a non-numeric value (checked value: '${value}').`;
            }
        }
      }
    }
    return null; // Brak błędów
  };

  const groupAndTransformData = () => {
    const result: Record<string, any> = {};
    // Find date group
    const dateGroup = groups.find(g => g.id === 'date');
    if (!dateGroup) return result;

    Object.entries(fileConfigs).forEach(([fileKey, config]) => {
      const dateColumn = dateGroup.fileMappings[fileKey];
      if (!dateColumn) return;

      config.rawData.forEach(row => {
        const dateValue = row[dateColumn];
        if (dateValue === undefined) return;

        // Create Date object first
        const dateObj = new Date(dateValue);
        if (isNaN(dateObj.getTime())) return; // Skip invalid dates

        // Format date as ISO string for the chart
        const isoDateString = dateObj.toISOString();

        // Initialize entry for this date if not exists
        if (!result[isoDateString]) {
          result[isoDateString] = {};
        }

        // Add values from all groups except date group
        groups.forEach(group => {
          if (group.id === 'date') return;

          const column = group.fileMappings[fileKey];
          if (!column || column === 'none' || row[column] === undefined) return;

          // Use group name as the main category
          if (!result[isoDateString][group.name]) {
            result[isoDateString][group.name] = {};
          }

          // Add value for this file, converting it to a number
          const value = row[column]
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

    // Validate that all groups have names
    const unnamedGroups = groups.filter(group => !group.name.trim());
    if (unnamedGroups.length > 0) {
      alert('Please provide names for all groups before finishing.');
      return;
    }

    // Check for duplicate group names
    const groupNames = groups.map(group => group.name.toLowerCase());
    const uniqueNames = new Set(groupNames);
    if (groupNames.length !== uniqueNames.size) {
      alert('Please ensure all group names are unique before finishing.');
      return;
    }

    const mappingError = validateDataMappings();
    if (mappingError) {
      setValidationError(mappingError);
      return; // Zatrzymaj, jeśli są błędy
    }
    const groupedData = groupAndTransformData();
    onComplete(groupedData);
    onHide();
  };

  // Get all selected columns for a specific file across all groups
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

  const currentFile = files[currentFileIndex];
  const getFileKey = (file?: File) => {
    if (!file) return '';
    const originalKey = file.name.replace(/\.(json|csv)$/i, '');
    return renamedFiles[originalKey] || originalKey;
  };
  const currentFileKey = getFileKey(currentFile);
  const currentConfig = currentFileKey ? fileConfigs[currentFileKey] : null;

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
                      {renameError && (
                        <Form.Control.Feedback type="invalid" style={{ position: 'static', display: 'block', marginTop: '5px' }}>
                          {renameError}
                        </Form.Control.Feedback>
                      )}
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

            {isLoadingFile && <p>Loading file...</p>}
            {errorParsingFile && <p style={{ color: 'red' }}>Error: {errorParsingFile}</p>}


            {!isLoadingFile && currentConfig?.rawData && (

              <div className="mt-4">
                <DataTable data={currentConfig.rawData.slice(0, 5)} title="File Preview" />
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
                        <Button size="sm" variant="outline-secondary" onClick={cancelEditingGroupName}>✕</Button>
                        {groupNameError && (
                          <Form.Control.Feedback type="invalid" style={{ position: 'static', display: 'block', marginTop: '5px' }}>
                            {groupNameError}
                          </Form.Control.Feedback>
                        )}
                      </>
                    ) : (
                      <>
                        <span>{group.name}</span>
                        {group.id !== 'date' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => startEditingGroupName(group.id, group.name)}
                            >
                              Rename
                            </Button>
                            {group.id !== 'value' && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => removeGroup(group.id)}
                                className="ms-2"
                              >
                                Remove
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>

                </Form.Group>

                <h6>File Mappings</h6>
                {Object.keys(fileConfigs).map((fileKey) => {

                  const fileColumns = fileConfigs[fileKey].rawData.length > 0
                    ? Object.keys(fileConfigs[fileKey].rawData[0])
                    : [];

                  // Get all used columns for this file
                  const usedColumns = getUsedColumnsForFile(fileKey);
                  // Get current selection for this group and file
                  const currentSelection = group.fileMappings[fileKey] || 'none';

                  // Available columns are:
                  // 1. The currently selected column (if any)
                  // 2. All columns not used by other groups
                  // 3. "none" option
                  const availableColumns = fileColumns.filter(col =>
                    col === currentSelection || !usedColumns.includes(col)
                  );

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

            <Button variant="outline-primary" onClick={addNewGroup}>
              + Add New Group
            </Button>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {/* NOWOŚĆ: Wyświetlanie błędu walidacji */}
        {validationError && (
          <div className="alert alert-danger w-100 text-center p-2" role="alert">
            {validationError}
          </div>
        )}

        {!(currentStep === 'file-preview' && currentFileIndex === 0) && (
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          onClick={currentStep === 'file-preview' ? handleNextFilePreview : handleFinish}
          disabled={
            currentStep === 'file-preview'
              ? isLoadingFile || !!errorParsingFile || !!renameError
              // ZMIANA: Dodano blokadę przycisku w przypadku błędu walidacji
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