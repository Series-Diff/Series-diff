import React, { useState } from "react";
import { Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import './Metrics.css';
import StatisticsInfoModal from './StatisticsInfoModal';

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
}

export const Metrics: React.FC<MetricsProps> = ({ groupedMetrics }) => {
  const [showModal, setShowModal] = useState(false);
  const hasAnyMetrics = Object.keys(groupedMetrics).length > 0;

  if (!hasAnyMetrics) {
    return <p style={{ textAlign: 'center', padding: '10px' }}>No metrics available.</p>;
  }

  return (
    <>
      <div className="Metrics-container">
        {Object.entries(groupedMetrics).map(([groupName, metrics], index) => (
          <div key={groupName} className='Metric-group' id='pdf-content-statistics-horizontal'>
            <div className="Metrics-header" style={{ position: 'relative' }}>
              <h3>{groupName} Statistics</h3>
              {index === 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowModal(true)}
                  className="p-0 position-absolute top-50 end-0 translate-middle-y me-3"
                  title="Statistics information"
                >
                  <InfoCircle size={20} />
                </Button>
              )}
            </div>
          <div className="Metric-wrapper">
            {metrics.map((metric) => (
              <div className="single-metric" key={metric.id}>
                <p className="single-metric-title">{metric.name}</p>
                {metric.mean !== undefined &&
                    <p>
                        Mean: <strong>{metric.mean.toFixed(2)}
                    </strong>
                    </p>}
                {metric.median !== undefined &&
                    <p>Median: <strong>{metric.median.toFixed(2)}
                    </strong>
                    </p>}
                {metric.variance !== undefined &&
                    <p>Variance: <strong>{metric.variance.toFixed(2)}
                    </strong></p>}
                {metric.stdDev !== undefined &&
                    <p>Standard deviation: <strong>{metric.stdDev.toFixed(2)}
                    </strong></p>}
                {metric.autoCorrelation !== undefined &&
                    <p>Autocorrelation: <strong>{metric.autoCorrelation.toFixed(2)}
                    </strong></p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    
    <StatisticsInfoModal
      show={showModal}
      onHide={() => setShowModal(false)}
    />
  </>
  );
};


export default Metrics;