import { JSX } from "react";
import { Card, Alert, Table } from "react-bootstrap";

export const HelpMetrics = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Metrics and Statistics</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Metrics are statistical measures that quantify relationships and differences between time series data.
          Statistics on the other hand are descriptive summaries of individual time series. <br />
          SeriesDiff provides multiple built-in metrics and statistics to help you analyze and compare your data.
        </Card.Text>

        <Alert variant="info">
          <Alert.Heading>Available Statistics:</Alert.Heading>
          <Table striped bordered size="sm" className="mt-2">
            <thead>
              <tr>
                <th>Statistic</th>
                <th>Purpose</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Mean (Average)</strong></td>
                <td>Central tendency of the data</td>
                <td>-∞ to +∞</td>
              </tr>
              <tr>
                <td><strong>Median</strong></td>
                <td>Middle value when sorted</td>
                <td>-∞ to +∞</td>
              </tr>
              <tr>
                <td><strong>Variance</strong></td>
                <td>Squared dispersion of data</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>Standard Deviation</strong></td>
                <td>Spread of data around mean</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>Autocorrelation</strong></td>
                <td>Correlation of a signal with a delayed copy of itself</td>
                <td>-1 to +1</td>
              </tr>
            </tbody>
          </Table>
        </Alert>

         <Alert variant="info">
          <Alert.Heading>Available Metrics:</Alert.Heading>
          <Table striped bordered size="sm" className="mt-2">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Purpose</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>MAE (Mean Absolute Error)</strong></td>
                <td>Average absolute difference between two series</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>RMSE (Root Mean Square Error)</strong></td>
                <td>Quadratic mean of differences</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>Pearson Correlation</strong></td>
                <td>Linear relationship between series</td>
                <td>-1 to +1</td>
              </tr>
              <tr>
                <td><strong>DTW (Dynamic Time Warping)</strong></td>
                <td>Distance accounting for temporal shifts</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>Euclidean Distance</strong></td>
                <td>Straight-line distance in n-dimensional space</td>
                <td>0 to +∞</td>
              </tr>
              <tr>
                <td><strong>Cosine Similarity</strong></td>
                <td>Angular similarity between vectors</td>
                <td>-1 to +1</td>
              </tr>
            </tbody>
          </Table>
        </Alert>

        <Alert variant="warning">
          <Alert.Heading>How to Use Metrics:</Alert.Heading>
          <ol>
            <li>Navigate to the <strong>Metrics</strong> page to view all available metrics for your data.</li>
            <li>Select specific data series from the filters to compare metrics between different combinations.</li>
            <li>Use the <strong>Dashboard</strong> page to display selected metrics alongside your chart visualization.</li>
            <li>Metrics update automatically when you change time ranges or data selection.</li>
          </ol>
        </Alert>
      </Card.Body>
    </Card>
  );
};
