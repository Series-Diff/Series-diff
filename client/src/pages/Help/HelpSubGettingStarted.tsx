import { JSX } from "react";
import { Card, Alert } from "react-bootstrap";

export const HelpGettingStarted = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">How to get started</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>Welcome to the SeriesDiff Application. This tool helps you analyze and compare multiple time series data sets from your files.</Card.Text>
        <Alert variant="info">
          <Alert.Heading>Quick Start Steps:</Alert.Heading>
          <ol>
            <li>Navigate to the <strong>Data</strong> or <strong>Dashboard</strong> page and click the <strong>Upload Data</strong> button.</li>
            <li>Select one or more files in <strong>CSV</strong> or <strong>JSON</strong> format containing time series data. Ensure each file includes a timestamp column and at least one value column. JSON files must be flat (non-nested).</li>
            <li>After uploading, view your data in table format, set a custom file name, and specify data types for each column.</li>
            <li>Group data by selecting the desired columns from each file to combine them for analysis.</li>
            <li>Click <strong>Finish</strong> to populate the <strong>Data</strong> and <strong>Dashboard</strong> page with your data.</li>
            <li>Start your analysis by adding metrics, selecting data for visualization on the primary or secondary axis, and toggling columns to show or hide them on the chart.</li>
          </ol>
        </Alert>
      </Card.Body>
    </Card>
  );
};
