import React, { useState } from "react";
import { Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import './Statistics.css';
import StatisticsInfoModal from './StatisticsInfoModal';

export type CombinedStatistic = {
  id: string;
  name: string;
  mean?: number;
  median?: number;
  variance?: number;
  stdDev?: number;
  autoCorrelation?: number;
};

interface StatisticsProps {
  groupedStatistics: Record<string, CombinedStatistic[]>;
  error?: string;
  isLoading?: boolean;
  selectedStatisticsForDisplay?: Set<string> | null;
  statisticLoading?: Record<string, boolean>;
  statisticError?: Record<string, string | null>;
  onRetryStatistic?: (metricKey: string) => void;
}

export const Statistics: React.FC<StatisticsProps> = ({ groupedStatistics, selectedStatisticsForDisplay, statisticLoading, statisticError, onRetryStatistic }) => {
  const [showModal, setShowModal] = useState(false);

  const STAT_FIELDS = ['mean','median','variance','std_dev','autocorrelation'];

  // Prepare derived values for rendering to keep JSX simple and strongly typed
  const groupEntries: [string, CombinedStatistic[]][] = Object.entries(groupedStatistics) as [string, CombinedStatistic[]][];

  const selectedSet: Set<string> | null = (selectedStatisticsForDisplay === undefined) ? null : selectedStatisticsForDisplay;
  const loading = statisticLoading ?? {};
  const errors = statisticError ?? {};

  // Determine which statistical fields are selected (null = defaults -> show all statistical fields)
  const statFieldsSet = new Set(STAT_FIELDS);
  const selectedStatFields = selectedSet === null ? STAT_FIELDS : Array.from(selectedSet).filter(m => statFieldsSet.has(m));
  const hasAnyStatSelected = selectedSet === null ? true : selectedStatFields.length > 0;

  // If user explicitly deselected all statistical fields, hide the whole component
  if (!hasAnyStatSelected) return null;

  // Collect failed statistics for the error summary message
  const failedStatistics: string[] = [];
  const failedStatisticsKeys: string[] = [];
  if (errors['meanValues']) { failedStatistics.push('Mean'); failedStatisticsKeys.push('meanValues'); }
  if (errors['medianValues']) { failedStatistics.push('Median'); failedStatisticsKeys.push('medianValues'); }
  if (errors['varianceValues']) { failedStatistics.push('Variance'); failedStatisticsKeys.push('varianceValues'); }
  if (errors['stdDevsValues']) { failedStatistics.push('Standard Deviation'); failedStatisticsKeys.push('stdDevsValues'); }
  if (errors['autoCorrelationValues']) { failedStatistics.push('Autocorrelation'); failedStatisticsKeys.push('autoCorrelationValues'); }

  // Handler to retry all failed statistics
  const handleRetryAll = () => {
    if (!onRetryStatistic) return;
    failedStatisticsKeys.forEach(key => onRetryStatistic(key));
  };

  // Helper to render a single statistic value or error
  const renderStatValue = (
    label: string, 
    value: number | undefined, 
    loadingKey: string, 
    errorKey: string
  ) => {
    if (loading[loadingKey]) {
      return (
        <p>{label}: <span className="d-inline-flex align-items-center"><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /></span></p>
      );
    }
    if (errors[errorKey]) {
      return (
        <p>{label}: <strong className="text-danger">Error</strong></p>
      );
    }
    if (value !== undefined) {
      return (
        <p>{label}: <strong>{value.toFixed(2)}</strong></p>
      );
    }
    return null;
  };

  const renderStatisticItem = (statistic: CombinedStatistic) => {
    const showMean = selectedSet === null || selectedSet.has('mean');
    const showMedian = selectedSet === null || selectedSet.has('median');
    const showVariance = selectedSet === null || selectedSet.has('variance');
    const showStdDev = selectedSet === null || selectedSet.has('std_dev');
    const showAutoCorrelation = selectedSet === null || selectedSet.has('autocorrelation');

    return (
      <div className="single-statistics-group" key={statistic.id}>
        <p className="single-statistics-group-title">{statistic.name}</p>

        {showMean && renderStatValue('Mean', statistic.mean, 'meanValues', 'meanValues')}
        {showMedian && renderStatValue('Median', statistic.median, 'medianValues', 'medianValues')}
        {showVariance && renderStatValue('Variance', statistic.variance, 'varianceValues', 'varianceValues')}
        {showStdDev && renderStatValue('Standard deviation', statistic.stdDev, 'stdDevsValues', 'stdDevsValues')}
        {showAutoCorrelation && renderStatValue('Autocorrelation', statistic.autoCorrelation, 'autoCorrelationValues', 'autoCorrelationValues')}
      </div>
    );
  };

  // Check if all statistics have errors (no data available)
  const allHaveErrors = failedStatistics.length > 0 && groupEntries.length === 0;

  // If all statistics failed, show error message
  if (allHaveErrors) {
    return (
      <>
        <div className="statistics-container">
          <div className="statistic-group">
            <div className="statistic-group-header">
              <h3 className="m-0">Statistics</h3>
            </div>
            <div className="statistics-error-summary">
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2">
                <span>{errors[failedStatisticsKeys[0]] || `Failed to calculate: ${failedStatistics.join(', ')}`}</span>
                {onRetryStatistic && (
                  <Button variant="outline-danger" size="sm" onClick={handleRetryAll} className="flex-shrink-0">
                    Retry All
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <StatisticsInfoModal
          show={showModal}
          onHide={() => setShowModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="statistics-container">
        {groupEntries.map(([groupName, statistics], index) => (
          <div key={groupName} className='statistic-group' id='pdf-content-statistics-horizontal'>
              <div className="statistic-group-header">
                <h3 className="m-0">{groupName} Statistics</h3>
                {index === 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowModal(true)}
                    className="p-0 position-absolute top-50 end-0 translate-middle-y statistics-info-btn"
                    title="Statistics information"
                    aria-label="Show statistics information"
                  >
                    <InfoCircle size={20} />
                  </Button>
                )}
              </div>
              {/* Error summary message between header and statistics */}
              {failedStatistics.length > 0 && index === 0 && (
                <div className="statistics-error-summary">
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2">
                    <span>{errors[failedStatisticsKeys[0]] || `Failed to calculate: ${failedStatistics.join(', ')}`}</span>
                    {onRetryStatistic && (
                      <Button variant="outline-danger" size="sm" onClick={handleRetryAll} className="flex-shrink-0">
                        Retry All
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="single-statistics-group-wrapper">
                  {(statistics as CombinedStatistic[]).map(renderStatisticItem)}
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


export default Statistics;