import { JSX } from "react";
import { Card, Alert, Table } from "react-bootstrap";

export const HelpDataTypes = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Data Types and Formats</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          SeriesDiff supports multiple data formats and automatically handles data type detection. 
          Proper data format ensures accurate analysis and visualization.
        </Card.Text>

        <Alert variant="info">
          <Alert.Heading>Supported File Formats:</Alert.Heading>
          <ol>
            <li><strong>CSV (Comma-Separated Values)</strong>
              <ul>
                <li>Standard format with headers in the first row</li>
                <li>Columns separated by commas</li>
                <li>Must include timestamp and at least one value column</li>
                <li>Example: <code>timestamp,temperature,humidity</code></li>
              </ul>
            </li>
            <li><strong>JSON (JavaScript Object Notation)</strong>
              <ul>
                <li>Must be flat structure (no nested objects)</li>
                <li>Array of objects format</li>
                <li>Each object represents a data point with timestamp and values</li>
                <li>Example: <code>{`[{"timestamp":"2024-01-13T10:00:00Z","temperature":25.5}]`}</code></li>
              </ul>
            </li>
          </ol>
          <strong>Note:</strong> Application provides support for pivoting data. If your data is in a wide format, application will detect it, you can then select multiple value columns to be treated as separate series during the upload process.
        </Alert>

        <Alert variant="success">
          <Alert.Heading>Column Configuration:</Alert.Heading>
          <Table striped bordered size="sm" className="mt-2">
            <thead>
              <tr>
                <th>Type</th>
                <th>Required</th>
                <th>Purpose</th>
                <th>Accepted Formats</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Timestamp</strong></td>
                <td>Yes</td>
                <td>Time-based indexing</td>
                <td>ISO 8601, Unix timestamp, YYYY-MM-DD HH:MM:SS</td>
              </tr>
              <tr>
                <td><strong>Value</strong></td>
                <td>Yes (1+)</td>
                <td>Numeric measurement data</td>
                <td>Integers, decimals (positive/negative)</td>
              </tr>
              <tr>
                <td><strong>Category</strong></td>
                <td>No</td>
                <td>Grouping and filtering</td>
                <td>Text, strings</td>
              </tr>
              <tr>
                <td><strong>Ignore</strong></td>
                <td>No</td>
                <td>Skip column during import</td>
                <td>Any data</td>
              </tr>
            </tbody>
          </Table>
        </Alert>

        <Alert variant="warning">
          <Alert.Heading>Data Upload Process:</Alert.Heading>
          <ol>
            <li>Upload one or more files in CSV or JSON format</li>
            <li>Review data preview in table format</li>
            <li>Specify a custom name for each file</li>
            <li>Assign data types to each column (Timestamp, Value, Category, or Ignore)</li>
            <li>Select columns to group data across files for comparison</li>
            <li>Click Finish to load data into the application</li>
          </ol>
        </Alert>

        <Alert variant="secondary">
          <Alert.Heading>Data Quality Tips:</Alert.Heading>
          <ul>
            <li>Ensure timestamps are in ascending order for best performance</li>
            <li>Handle missing values appropriately before upload (remove or use null)</li>
            <li>Keep file sizes reasonable for optimal performance (current limit: 16 MB)</li>
            <li>Use consistent units and decimal places across similar metrics</li>
            <li>Remove or mark invalid/corrupt data points before importing</li>
          </ul>
        </Alert>
      </Card.Body>
    </Card>
  );
};
