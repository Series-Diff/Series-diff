/**
 * JSON Schema Validation for Time Series Data
 * 
 * This module provides validation for JSON time series data files.
 * It supports both pivoted and non-pivoted formats.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Initialize Ajv with strict mode and format validation
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

/**
 * Interface for a single time series data point (generic)
 */
interface TimeSeriesDataPoint {
  [key: string]: any;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedFormat?: 'pivoted' | 'non-pivoted' | 'unknown';
  dateColumns?: string[];
  numericColumns?: string[];
}

/**
 * Base JSON Schema for time series data
 * Validates that input is an array of objects
 */
const baseSchema = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    required: [],
    additionalProperties: true,
  },
};

/**
 * Validates if a value is a valid date string
 */
const isValidDateString = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  
  // Check various date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,  // ISO 8601
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,              // YYYY-MM-DD HH:mm:ss
    /^\d{4}-\d{2}-\d{2}$/,                                // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,                              // MM/DD/YYYY
  ];
  
  const matchesPattern = datePatterns.some(pattern => pattern.test(value));
  if (!matchesPattern) return false;
  
  // Verify it's a parseable date
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Validates if a value is numeric
 */
const isNumeric = (value: any): boolean => {
  if (typeof value === 'number' && !isNaN(value)) return true;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num);
  }
  return false;
};

/**
 * Detects date columns in the data
 */
const detectDateColumns = (data: TimeSeriesDataPoint[]): string[] => {
  if (data.length === 0) return [];
  
  const sampleSize = Math.min(10, data.length);
  const columnCandidates = Object.keys(data[0]);
  const dateColumns: string[] = [];
  
  for (const column of columnCandidates) {
    // Check if column name suggests it's a date
    const nameIndicatesDate = /date|time|timestamp|created|updated|log/i.test(column);
    
    // Check if values look like dates
    let validDateCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (isValidDateString(data[i]?.[column])) {
        validDateCount++;
      }
    }
    
    // If most sampled values are dates, or name indicates date, add to list
    if (validDateCount >= sampleSize * 0.8 || (nameIndicatesDate && validDateCount > 0)) {
      dateColumns.push(column);
    }
  }
  
  return dateColumns;
};

/**
 * Detects numeric columns in the data
 */
const detectNumericColumns = (data: TimeSeriesDataPoint[]): string[] => {
  if (data.length === 0) return [];
  
  const sampleSize = Math.min(10, data.length);
  const columnCandidates = Object.keys(data[0]);
  const numericColumns: string[] = [];
  
  for (const column of columnCandidates) {
    let numericCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (isNumeric(data[i]?.[column])) {
        numericCount++;
      }
    }
    
    // If most sampled values are numeric, add to list
    if (numericCount >= sampleSize * 0.8) {
      numericColumns.push(column);
    }
  }
  
  return numericColumns;
};

/**
 * Detects if data is in pivoted format
 * Pivoted format characteristics:
 * - Has a column indicating category/type/metric (e.g., data_type, sensor_id)
 * - Has a single value column
 * - Multiple rows can have the same timestamp but different categories
 */
const detectPivotedFormat = (data: TimeSeriesDataPoint[]): boolean => {
  if (data.length < 2) return false;
  
  const sampleSize = Math.min(50, data.length);
  const sample = data.slice(0, sampleSize);
  const columns = Object.keys(sample[0]);
  
  // Look for category/type columns
  const categoryColumns = columns.filter(col => 
    /type|category|metric|sensor|name|kind|class/i.test(col)
  );
  
  // Look for value columns
  const valueColumns = columns.filter(col => 
    /^value$/i.test(col) || /^val$/i.test(col)
  );
  
  if (categoryColumns.length === 0 || valueColumns.length === 0) {
    return false;
  }
  
  // Check if multiple rows share the same timestamp but have different category values
  const dateColumns = detectDateColumns(sample);
  if (dateColumns.length === 0) return false;
  
  const dateCol = dateColumns[0];
  const categoryCol = categoryColumns[0];
  
  const dateMap = new Map<string, Set<any>>();
  for (const row of sample) {
    const dateValue = String(row[dateCol]);
    if (!dateMap.has(dateValue)) {
      dateMap.set(dateValue, new Set());
    }
    dateMap.get(dateValue)!.add(row[categoryCol]);
  }
  
  // If any timestamp has multiple different categories, it's likely pivoted
  return Array.from(dateMap.values()).some(categories => categories.size > 1);
};

/**
 * Validates time series JSON data
 */
export const validateTimeSeriesJSON = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Step 1: Check if input is an object with date-like keys (invalid format)
  if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      // Check if keys look like dates
      const firstKey = keys[0];
      if (isValidDateString(firstKey) || /\d{2,4}[./-]\d{2}[./-]\d{2,4}/.test(firstKey)) {
        errors.push(
          'Invalid format: Data appears to be an object with date keys instead of an array of objects. ' +
          'Each data point must be an object IN an array with a date field (e.g., [{"date": "2023-10-05", "value": 65}, ...]), ' +
          'not an object where dates are keys (e.g., {"2023-10-05": {...}}).'
        );
        return { isValid: false, errors, warnings };
      }
      
      // Generic object error
      errors.push(
        'Data must be a JSON array (enclosed in [ ]), not an object (enclosed in { }). ' +
        'Example: [{"date": "2023-10-05", "value": 65}, {"date": "2023-10-06", "value": 70}]'
      );
      return { isValid: false, errors, warnings };
    }
  }
  
  // Step 2: Basic structure validation (must be array)
  const validate = ajv.compile(baseSchema);
  const isValidStructure = validate(data);
  
  if (!isValidStructure) {
    if (validate.errors) {
      validate.errors.forEach((error: any) => {
        const path = error.instancePath || error.dataPath || '';
        if (error.keyword === 'type' && path === '') {
          errors.push('Data must be a JSON array (enclosed in [ ])');
        } else if (error.keyword === 'minItems') {
          errors.push('Data array cannot be empty');
        } else {
          errors.push(`Schema error at ${path || 'root'}: ${error.message}`);
        }
      });
    }
    return { isValid: false, errors, warnings };
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('Input must be a non-empty array of objects');
    return { isValid: false, errors, warnings };
  }
  
  // Step 3: Validate each item is an object
  const nonObjects = data.filter((item, idx) => typeof item !== 'object' || item === null || Array.isArray(item));
  if (nonObjects.length > 0) {
    errors.push(`Found ${nonObjects.length} items that are not objects. Each array element must be an object.`);
    return { isValid: false, errors, warnings };
  }
  
  // Step 4: Detect date and numeric columns
  const dateColumns = detectDateColumns(data);
  const numericColumns = detectNumericColumns(data);
  
  if (dateColumns.length === 0) {
    errors.push(
      'No date/time field detected. Each object MUST have at least one field whose VALUE is a date/timestamp. ' +
      'Accepted formats: ISO 8601 (e.g., "2025-11-27T23:02:59.000Z"), "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD". ' +
      'Common field names: "log_date", "time", "created", "timestamp", but any name is acceptable as long as the value is a date.'
    );
  }
  
  if (numericColumns.length === 0) {
    errors.push(
      'No numeric value field detected. Each object MUST have at least one field whose VALUE is a number (integer or float). ' +
      'Examples: "value": 4.94, "temperature": 19.0, "ec_low": 4. ' +
      'The field name can be anything, but the value must be numeric.'
    );
  }
  
  // If basic requirements aren't met, return early
  if (errors.length > 0) {
    return { isValid: false, errors, warnings, dateColumns, numericColumns };
  }
  
  // Step 5: Detect format (pivoted vs non-pivoted)
  const isPivoted = detectPivotedFormat(data);
  const detectedFormat = isPivoted ? 'pivoted' : 'non-pivoted';
  
  // Step 6: Format-specific validation and warnings
  if (isPivoted) {
    // Pivoted format should have category, date, and value columns
    const categoryColumns = Object.keys(data[0]).filter(col => 
      /type|category|metric|sensor|name|kind|class/i.test(col)
    );
    
    if (categoryColumns.length === 0) {
      warnings.push(
        'Pivoted format detected but no clear category column found. ' +
        'Expected columns like "data_type", "sensor_id", "metric_name" to distinguish different measurement types.'
      );
    } else {
      warnings.push(
        `Detected pivoted format (long format). Category column: "${categoryColumns[0]}". ` +
        'You may want to enable "Pivot Data" option during import to transform this data into wide format.'
      );
    }
  } else {
    // Non-pivoted format should have multiple numeric columns
    if (numericColumns.length === 1) {
      warnings.push(
        'Only one numeric column detected. This might be pivoted (long) format. ' +
        'If multiple measurements share the same timestamp, consider enabling "Pivot Data" option.'
      );
    }
  }
  
  // Step 7: Check for common issues
  const firstRow = data[0];
  const columnCount = Object.keys(firstRow).length;
  
  // Check if objects are too simple (might be missing required fields)
  if (columnCount < 2) {
    errors.push(
      'Each object must have at least 2 fields: one for date/time and one for numeric value. ' +
      `Found only ${columnCount} field(s) in objects.`
    );
    return { isValid: false, errors, warnings, dateColumns, numericColumns };
  }
  
  // Warn if rows have inconsistent structure
  const inconsistentRows = data.filter((row, idx) => {
    const rowColumnCount = Object.keys(row).length;
    return rowColumnCount !== columnCount;
  });
  
  if (inconsistentRows.length > 0) {
    warnings.push(
      `${inconsistentRows.length} out of ${data.length} rows have different number of fields than the first row. ` +
      'This may cause issues during processing.'
    );
  }
  
  // Step 8: Validate sample of actual data values (strict validation)
  const sampleSize = Math.min(20, data.length);
  let rowsWithInvalidDates = 0;
  let rowsWithoutNumericValues = 0;
  const invalidRows: number[] = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const row = data[i];
    let rowHasIssue = false;
    
    // Check if row has at least one valid date VALUE (not key)
    const hasValidDate = dateColumns.some(col => isValidDateString(row[col]));
    if (!hasValidDate) {
      rowsWithInvalidDates++;
      rowHasIssue = true;
    }
    
    // Check if row has at least one numeric VALUE
    const hasNumericValue = numericColumns.some(col => isNumeric(row[col]));
    if (!hasNumericValue) {
      rowsWithoutNumericValues++;
      rowHasIssue = true;
    }
    
    if (rowHasIssue) {
      invalidRows.push(i);
    }
  }
  
  // Strict validation - if too many rows are invalid, fail
  if (rowsWithInvalidDates > sampleSize * 0.5) {
    errors.push(
      `More than 50% of sampled rows (${rowsWithInvalidDates}/${sampleSize}) have invalid or missing date VALUES. ` +
      'Remember: dates must be field VALUES, not object keys. ' +
      `Example rows with issues: ${invalidRows.slice(0, 3).map(i => `#${i + 1}`).join(', ')}`
    );
  } else if (rowsWithInvalidDates > 0) {
    const percentage = Math.round((rowsWithInvalidDates / sampleSize) * 100);
    warnings.push(
      `${percentage}% of sampled rows have invalid or missing date values. ` +
      `Rows with issues: ${invalidRows.slice(0, 5).map(i => `#${i + 1}`).join(', ')}`
    );
  }
  
  if (rowsWithoutNumericValues > sampleSize * 0.5) {
    errors.push(
      `More than 50% of sampled rows (${rowsWithoutNumericValues}/${sampleSize}) have no numeric measurement VALUES. ` +
      'Each object must have at least one field with a numeric value (integer or float). ' +
      `Example rows with issues: ${invalidRows.slice(0, 3).map(i => `#${i + 1}`).join(', ')}`
    );
  } else if (rowsWithoutNumericValues > 0) {
    const percentage = Math.round((rowsWithoutNumericValues / sampleSize) * 100);
    warnings.push(
      `${percentage}% of sampled rows have no numeric measurement values. ` +
      `Rows with issues: ${invalidRows.slice(0, 5).map(i => `#${i + 1}`).join(', ')}`
    );
  }
  
  // Final validation result
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    detectedFormat,
    dateColumns,
    numericColumns,
  };
};

/**
 * Validates a JSON string
 */
export const validateTimeSeriesJSONString = (jsonString: string): ValidationResult => {
  try {
    const data = JSON.parse(jsonString);
    return validateTimeSeriesJSON(data);
  } catch (error) {
    return {
      isValid: false,
      errors: [`Invalid JSON syntax: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
};

/**
 * Validates a file (JSON or CSV)
 * Returns a promise with validation result
 */
export const validateTimeSeriesFile = async (file: File): Promise<ValidationResult> => {
  try {
    const text = await file.text();
    
    if (file.name.toLowerCase().endsWith('.json')) {
      return validateTimeSeriesJSONString(text);
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      // For CSV files, we'll need to parse them first
      // This will be handled by the existing Papa Parse logic
      return {
        isValid: true,
        errors: [],
        warnings: ['CSV file validation will be performed after parsing'],
      };
    } else {
      return {
        isValid: false,
        errors: [`Unsupported file type: ${file.name}. Only .json and .csv files are supported.`],
        warnings: [],
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
};
