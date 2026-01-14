import { JSX } from "react";
import { Card, Alert } from "react-bootstrap";

export const HelpReports = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Reports and Exports</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          SeriesDiff provides option to export your data to PDF file to save and share your analysis results.
        </Card.Text>

        <Alert variant="success">
          <Alert.Heading>Creating Reports:</Alert.Heading>
          <ol>
            <li>Prepare your analysis on the <strong>Dashboard</strong> or other analysis pages</li>
            <li>Click the <strong>Export to PDF</strong> button (below chart in the header of statistics)</li>
            <li>Enter a title for your report (optional)</li>
            <li>You can choose which sections to include by clicking <strong>Select Metrics</strong> next to the export button</li>
            <li>Click <strong>Export</strong> to create and download your report</li>
          </ol>
        </Alert>
        <Alert variant="secondary">
          <Alert.Heading>Report Structure:</Alert.Heading>
          <ul>
            <li>On the top you can see the report title</li>
            <li>Below the title you will find the copy of chart with all selected categories, structure and time range</li>
            <li>Following the chart, there are listed statistics for category and file</li>
            <li>At the end of the report, you will find tables with all metrics</li>
          </ul>
        </Alert>
      </Card.Body>
    </Card>
  );
};
