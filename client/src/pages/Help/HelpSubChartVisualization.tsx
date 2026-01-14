import { JSX } from "react";
import { Card, Alert } from "react-bootstrap";

export const HelpChartVisualization = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Chart visualization</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>Interactive charts for exploring time series data with zoom, pan, range selection, dual Y-axes, and series toggling.</Card.Text>
        <Alert variant="success">
          <Alert.Heading>Chart Features:</Alert.Heading>
          <ol>
            <li>Shift + LMB drag or use the range selector to select and zoom into a specific range.</li>
            <li>LMB drag to pan across the chart.</li>
            <li>Scroll to zoom in or out at the cursor position.</li>
            <li>Double-click to reset zoom to the full data range.</li>
            <li>Adjusting time range to show data and calculate metrics and statistics</li>
            <li>Custom Y-axis range with manual min/max input and apply/reset controls.</li>
            <li>Triple Y-axes configuration to compare multiple categories.</li>
            <li>Toggle data series visibility via legend clicks.</li>
            <li>Dynamic date format based on zoom level (day, day+hour, or full date-time).</li>
            <li>Toggleable markers for data points (visible for ranges under 3 hours).</li>
            <li>Interactive tooltips on hover for precise X and Y value inspection.</li>
            <li>Multiple data series with distinct colors and horizontal legend.</li>
            <li>Possibility to show moving averages for trend analysis on the chart.</li>
            <li>Toggle Color Synchronization across the same files.</li>
            <li>Show data on chart in two possible layouts: overlay or stacked.</li>
            <li>Set your own manual measurement units for Y-axes.</li>
            <li>Toggle between Standard chart and Difference Chart.</li>
          </ol>
        </Alert>
      </Card.Body>
    </Card>
  );
};
