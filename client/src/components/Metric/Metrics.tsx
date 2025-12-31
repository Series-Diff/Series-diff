import React from "react";
import { Alert } from "react-bootstrap";
import './Metrics.css';

export type CombinedMetric = {
  id: string;
  name: string;
  mean?: number;
  median?: number;
  variance?: number;
  stdDev?: number;
  autoCorrelation?: number;
};

interface MetricsProps {
  groupedMetrics: Record<string, CombinedMetric[]>;
  error?: string;
  isLoading?: boolean;
}

export const Metrics: React.FC<MetricsProps> = ({ groupedMetrics, error, isLoading = false }) => {
  const hasAnyMetrics = Object.values(groupedMetrics).some((metrics) => Array.isArray(metrics) && metrics.length > 0);

  // If there's an error, show ONLY the error alert, hide all metrics
  if (error) {
    return (
      <Alert variant="danger" className="mb-0 mt-3 text-center">
        <strong>Statistics unavailable:</strong> {error}
      </Alert>
    );
  }

  // Show loading state - even if data exists from previous load
  if (isLoading) {
    return (
      <div className="Metrics-container d-flex justify-content-center align-items-center" style={{ minHeight: 180 }}>
        <div className="text-center text-muted py-3">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          Loading statistics...
        </div>
      </div>
    );
  }

  if (!hasAnyMetrics) {
    return (
      <Alert variant="warning" className="mb-0 mt-3 text-center">
        Statistics are unavailable for the loaded data.
      </Alert>
    );
  }

  return (
    <div className="Metrics-container">
      {Object.entries(groupedMetrics).map(([groupName, metrics]) => (
        <div key={groupName} className='Metric-group' id='pdf-content-statistics-horizontal'>
          <div className="Metrics-header">
            <h3>{groupName} Statistics</h3>
          </div>
          <div className="Metric-wrapper">
            {metrics.map((metric) => (
              <div className="single-metric" key={metric.id}>
                <p className="single-metric-title">{metric.name}</p>
                {metric.mean !== undefined && (
                  <p>
                    Mean: <strong>{metric.mean.toFixed(2)}</strong>
                  </p>
                )}
                {metric.median !== undefined && (
                  <p>
                    Median: <strong>{metric.median.toFixed(2)}</strong>
                  </p>
                )}
                {metric.variance !== undefined && (
                  <p>
                    Variance: <strong>{metric.variance.toFixed(2)}</strong>
                  </p>
                )}
                {metric.stdDev !== undefined && (
                  <p>
                    Standard deviation: <strong>{metric.stdDev.toFixed(2)}</strong>
                  </p>
                )}
                {metric.autoCorrelation !== undefined && (
                  <p>
                    Autocorrelation: <strong>{metric.autoCorrelation.toFixed(2)}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Metrics;