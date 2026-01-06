import React from 'react';
import { Alert } from 'react-bootstrap';
import { ValidationResult } from '../../utils/jsonValidation';
import './ValidationErrorDisplay.css';

interface Props {
  validationResult?: ValidationResult;
  fileName?: string;
  filePreview?: string;
  error?: string;
}

export const ValidationErrorDisplay: React.FC<Props> = ({ validationResult, fileName, filePreview, error }) => {
  // Handle error prop for simple error display
  if (error && !validationResult) {
    return (
      <Alert variant="danger" className="validation-alert">
        <Alert.Heading className="validation-heading">
          <strong>❌ Error {fileName && `in "${fileName}"`}</strong>
        </Alert.Heading>
        <div className="validation-content">
          <p className="mb-0">{error}</p>
        </div>
        {filePreview && (
          <>
            <hr />
            <Alert.Heading className="validation-heading text-muted">
              <small>📄 File Preview</small>
            </Alert.Heading>
            <pre className="validation-example" style={{ maxHeight: '300px', overflow: 'auto', fontSize: '0.85em' }}>
{filePreview}
            </pre>
          </>
        )}
      </Alert>
    );
  }

  if (!validationResult) {
    return null;
  }

  const { isValid, errors, warnings, detectedFormat, dateColumns, numericColumns } = validationResult;

  if (isValid && errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="validation-display">
      {/* File Preview Section - only show when there are errors */}
      {filePreview && errors.length > 0 && (
        <Alert variant="info" className="validation-alert">
          <Alert.Heading className="validation-heading">
            <strong>📄 File Preview {fileName && `- "${fileName}"`}</strong>
          </Alert.Heading>
          <pre className="validation-example" style={{ maxHeight: '300px', overflow: 'auto', fontSize: '0.85em' }}>
{filePreview}
          </pre>
          <small className="text-muted">Showing first lines of the file</small>
        </Alert>
      )}
      
      {errors.length > 0 && (
        <Alert variant="danger" className="validation-alert">
          <Alert.Heading className="validation-heading">
            <strong>❌ Validation Errors {fileName && `in "${fileName}"`}</strong>
          </Alert.Heading>
          <div className="validation-content">
            <p className="mb-2">The file does not meet the required format:</p>
            <ul className="mb-0">
              {errors.map((error: string, idx: number) => (
                <li key={idx} className="validation-item">{error}</li>
              ))}
            </ul>
          </div>
          
          <hr />
          
          <div className="validation-help">
            <strong>Required Format:</strong>
            <ol className="mt-2 mb-2">
              <li>Data must be a <strong>JSON array</strong> (starts with [ and ends with ])</li>
              <li>Each item in the array must be an <strong>object</strong> (enclosed in &#123; &#125;)</li>
              <li>Each object must have at least one field with a <strong>date/time VALUE</strong></li>
              <li>Each object must have at least one field with a <strong>numeric VALUE</strong></li>
            </ol>
            
            <strong>Valid Example:</strong>
            <pre className="validation-example">
{`[
  {
    "log_date": "2025-11-27T23:02:59.000Z",
    "data_type": 30,
    "value": 78.92
  },
  {
    "log_date": "2025-11-27T23:05:59.000Z",
    "data_type": 30,
    "value": 78.88
  }
]`}
            </pre>
          </div>
        </Alert>
      )}
    </div>
  );
};
