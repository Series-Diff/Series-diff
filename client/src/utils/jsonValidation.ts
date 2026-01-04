/**
 * JSON Schema Validation for Time Series Data
 * 
 * This module provides validation for JSON time series data files.
 * It supports both pivoted and non-pivoted formats.
 */

import Ajv from 'ajv';

// Initialize Ajv with strict mode
const ajv = new Ajv({ allErrors: true });

/**
 * Interface for a single time series data point (generic)
 */
interface TimeSeriesDataPoint {
  [key: string]: unknown;
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
 * Normalizes various date formats to ISO-compatible format
 * Returns null if the value is not a valid date string
 */
export function normalizeToISODate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  if (value.trim() === '') return null;
  
  let dateString = value;
  
  // Handle YY-MM-DD format (e.g., "24-04-24 00:00:00")
  const yyMmDdMatch = value.match(/^(\d{2})[-./](\d{2})[-./](\d{2})(\s+.+)?$/);
  if (yyMmDdMatch) {
    // Convert YY to YYYY (assume 2000+ for years 00-99)
    const year = parseInt(yyMmDdMatch[1]) + 2000;
    const month = yyMmDdMatch[2];
    const day = yyMmDdMatch[3];
    const timePart = yyMmDdMatch[4] || '';
    dateString = `${year}-${month}-${day}${timePart}`;
  }
  
  // Handle DD-MM-YYYY or DD-MM-YY format (European)
  const ddMmYyyyMatch = value.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})(\s+.+)?$/);
  if (ddMmYyyyMatch && !yyMmDdMatch) {  // Only if not already matched as YY-MM-DD
    const day = ddMmYyyyMatch[1];
    const month = ddMmYyyyMatch[2];
    let year = ddMmYyyyMatch[3];
    const timePart = ddMmYyyyMatch[4] || '';
    
    // Convert YY to YYYY if needed
    if (year.length === 2) {
      year = String(parseInt(year) + 2000);
    }
    
    dateString = `${year}-${month}-${day}${timePart}`;
  }
  
  // Verify it's a parseable date
  const date = new Date(dateString);
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Validates if a value is a valid date string
 */
export function isValidDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.trim() === '') return false;
  
  // Check various date formats
  const datePatterns = [
    //  format ISO (YYYY-MM-DD lub YY-MM-DD)
    /^(\d{4}|\d{2})[-./](\d{1,2})[-./](\d{2}|\d{4})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,5})?)?Z?)?$/,

    //  format europejski (DD-MM-YYYY)
    /^(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,5})?)?)?$/,
  ];
  
  const matchesPattern = datePatterns.some(pattern => pattern.test(value));
  if (!matchesPattern) return false;
  
  // Use normalizeToISODate to verify parseability
  return normalizeToISODate(value) !== null;
}

/**
 * Validates if a value is numeric
 */
const isNumeric = (value: unknown): boolean => {
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
      const value = data[i]?.[column];
      if (value !== '' && value !== null && value !== undefined && isValidDateString(value)) {
        validDateCount++;
      }
    }
    
    // If most sampled values are dates, or name indicates date with significant valid dates, add to list
    // For name-based detection, require at least 20% valid values (not just 1)
    if (validDateCount >= sampleSize * 0.8 || (nameIndicatesDate && validDateCount >= sampleSize * 0.2)) {
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
 * Validates time series JSON data
 */
export function validateTimeSeriesJSON(data: unknown): ValidationResult {
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
      validate.errors.forEach((error: unknown) => {
        const err = error as Record<string, unknown>;
        const path = (err.instancePath || err.dataPath || '') as string;
        if (err.keyword === 'type' && path === '') {
          errors.push('Data must be a JSON array (enclosed in [ ])');
        } else if (err.keyword === 'minItems') {
          errors.push('Data array cannot be empty');
        } else {
          errors.push(`Schema error at ${path || 'root'}: ${err.message}`);
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
      'Accepted formats: ISO Standard (e.g., "2025-11-27T23:02:59.000Z"), "YYYY-MM-DD HH:mm:ss", and european formats (e.g., "27-11-2025 23:02:59").' 
    );
  }
  
  if (numericColumns.length === 0) {
    errors.push(
      'No numeric value field detected. Each object MUST have at least one field whose VALUE is a number (integer or float). ' +
      'Examples: "value": 4.94, "temperature": 19.0, "ec_low": 4. '
    );
  }
  
  // If basic requirements aren't met, return early
  if (errors.length > 0) {
    return { isValid: false, errors, warnings, dateColumns, numericColumns };
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
    // Allow empty/null values in date fields - just need ONE valid date field
    const hasValidDate = dateColumns.some(col => {
      const value = row[col];
      // Skip empty/null values - they don't count as invalid
      if (value === '' || value === null || value === undefined) return false;
      return isValidDateString(value);
    });
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
  
  // Step 9: Check for empty/null values in date fields (informational warning)
  if (dateColumns.length > 1) {
    // Check each date column for empty values
    const dateColumnsWithEmptyValues: string[] = [];
    for (const col of dateColumns) {
      let emptyCount = 0;
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i]?.[col];
        if (value === '' || value === null || value === undefined) {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        const percentage = Math.round((emptyCount / sampleSize) * 100);
        dateColumnsWithEmptyValues.push(`${col} (${percentage}% empty)`);
      }
    }
    
    if (dateColumnsWithEmptyValues.length > 0) {
      warnings.push(
        `Some date fields contain empty or null values: ${dateColumnsWithEmptyValues.join(', ')}. ` +
        'This is acceptable as long as at least one date field per row has valid values.'
      );
    }
  }
  
  // Final validation result
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    dateColumns,
    numericColumns,
  };
}

/**
 * Validates a JSON string
 */
export function validateTimeSeriesJSONString(jsonString: string): ValidationResult {
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
}

/**
 * Validates a file (JSON or CSV)
 * Returns a promise with validation result
 */
export async function validateTimeSeriesFile(file: File): Promise<ValidationResult> {
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
}
