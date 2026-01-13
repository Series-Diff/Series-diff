import { JSX } from "react";
import { Card, Alert, ListGroup } from "react-bootstrap";

export const HelpTroubleshooting = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Troubleshooting</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          This section provides solutions to common issues you might encounter when using SeriesDiff.
        </Card.Text>

        <Alert variant="danger">
          <Alert.Heading>Data Upload Issues</Alert.Heading>
          <ListGroup>
            <ListGroup.Item>
              <strong>Problem:</strong> "File format not supported" error
              <ul>
                <li><strong>Solution:</strong> Ensure you're uploading CSV or JSON files. For JSON, verify the structure is flat (no nested objects)</li>
              </ul>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Problem:</strong> "No timestamp column detected" error
              <ul>
                <li><strong>Solution:</strong> Make sure your file includes a column with timestamp data. Assign it as "Timestamp" type during import</li>
              </ul>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Problem:</strong> Data appears incorrect after upload
              <ul>
                <li><strong>Solution:</strong> Review the data preview on the Data page. Check that columns are correctly typed and timestamps are in recognized format</li>
              </ul>
            </ListGroup.Item>
          </ListGroup>
        </Alert>

        <Alert variant="warning">
          <Alert.Heading>Chart and Visualization Issues</Alert.Heading>
          <ListGroup>
            <ListGroup.Item>
              <strong>Problem:</strong> Chart not displaying data
              <ul>
                <li><strong>Solution:</strong> Verify data is loaded on the Dashboard. Select data categories and ensure at least one series is visible</li>
              </ul>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Problem:</strong> Zoom or pan not working
              <ul>
                <li><strong>Solution:</strong> Try double-clicking the chart to reset zoom. Ensure you're using the correct interaction method (Shift+LMB for zoom, drag for pan)</li>
              </ul>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Problem:</strong> Y-axis values look incorrect
              <ul>
                <li><strong>Solution:</strong> Check if custom Y-axis ranges are applied. Click "Reset" to restore automatic scaling</li>
              </ul>
            </ListGroup.Item>
          </ListGroup>
        </Alert>

        <Alert variant="info">
          <Alert.Heading>Metrics and Calculations</Alert.Heading>
          <ListGroup>
            <ListGroup.Item>
              <strong>Problem:</strong> Metrics not calculating or showing "N/A"
              <ul>
                <li><strong>Solution:</strong> Ensure you have selected at least 2 data series for comparison metrics. Some metrics require specific data characteristics</li>
              </ul>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Problem:</strong> Moving average values look wrong
              <ul>
                <li><strong>Solution:</strong> Verify the window size is appropriate for your data frequency. Larger windows smooth more but lose detail</li>
              </ul>
            </ListGroup.Item>
          </ListGroup>
        </Alert>

        <Alert variant="secondary">
          <Alert.Heading>General Tips</Alert.Heading>
          <ul>
            <li>Use the <strong>Reset</strong> button to clear all filters and start fresh</li>
            <li>Check the browser console (F12) for error messages if issues persist</li>
            <li>Ensure your data files are not corrupted or incomplete</li>
            <li>Try clearing your browser cache if display issues occur</li>
          </ul>
        </Alert>
      </Card.Body>
    </Card>
  );
};
