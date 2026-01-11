import React, { useRef, useEffect } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import Statistics from './Statistics';

interface Props {
  groupedStatistics: Record<string, any>;
  statisticLoading: Record<string, boolean>;
  statisticError: Record<string, string | null>;
  selectedStatisticsForDisplay: Set<string> | null;
  filenamesPerCategory?: Record<string, string[]>;
  selectedCategory?: string | null;
  secondaryCategory?: string | null;
  tertiaryCategory?: string | null;
  onOpenStatisticsModal: () => void;
  onExportClick: () => void;
  isExporting: boolean;
  onRetryStatistic?: (metricKey: string) => void;
}

const StatisticsWrapper: React.FC<Props> = ({ groupedStatistics, statisticLoading, statisticError, selectedStatisticsForDisplay, onOpenStatisticsModal, onExportClick, isExporting, onRetryStatistic }) => {
  const isLoading = !!(statisticLoading['meanValues'] || statisticLoading['medianValues'] || statisticLoading['varianceValues'] || statisticLoading['stdDevsValues'] || statisticLoading['autoCorrelationValues']);

  // Track previous selection to avoid showing a large global spinner when user
  // explicitly had no stats selected and then selects one quick-to-fetch metric.
  const prevSelectedRef = useRef<Set<string> | null | undefined>(undefined);
  useEffect(() => {
    prevSelectedRef.current = selectedStatisticsForDisplay;
  }, [selectedStatisticsForDisplay]);

  return (
    <div className="section-container p-3 d-flex flex-column gap-3" data-component="Statistics-Main-Wraper">
      <div className="d-flex justify-content-end align-items-center gap-2">
        <Button
          variant="outline-secondary"
          onClick={onOpenStatisticsModal}
        >
          Select Metrics
        </Button>
        <Button
          variant="secondary"
          onClick={onExportClick}
          disabled={!Object.keys(groupedStatistics).length || isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </Button>
        {isExporting && <Spinner animation="border" size="sm" />}
      </div>

      {(() => {
        const statsKeys = ['meanValues', 'medianValues', 'varianceValues', 'stdDevsValues', 'autoCorrelationValues'] as const;
        const isStatsSelected = selectedStatisticsForDisplay === null
          ? true
          : statsKeys.some(k => {
            const map: Record<string, string> = {
              meanValues: 'mean',
              medianValues: 'median',
              varianceValues: 'variance',
              stdDevsValues: 'std_dev',
              autoCorrelationValues: 'autocorrelation'
            };
            return selectedStatisticsForDisplay.has(map[k]);
          });
        const isStatsLoading = statsKeys.some(k => !!statisticLoading[k]);
        const prevWasExplicitlyEmpty = prevSelectedRef.current && prevSelectedRef.current.size === 0;
        const currentSelectedSize = selectedStatisticsForDisplay === null ? statsKeys.length : selectedStatisticsForDisplay.size;
        // Show the large spinner unless the previous selection was explicitly empty AND the new selection is small (1 or 0)
        // This avoids flashing a large loader when user selects a single quick metric but still shows it for bulk selections.
        const shouldShowSpinner = Object.keys(groupedStatistics).length === 0 && isStatsSelected && isStatsLoading && !(prevWasExplicitlyEmpty && currentSelectedSize <= 1);
        if (shouldShowSpinner) {
          return (
            <div className="d-flex align-items-center justify-content-center py-3">
              <Spinner animation="border" role="status" />
              <span className="ms-2">Calculating statistics...</span>
            </div>
          );
        }
        return (
          <Statistics
            groupedStatistics={groupedStatistics}
            isLoading={isLoading}
            selectedStatisticsForDisplay={selectedStatisticsForDisplay}
            statisticLoading={statisticLoading}
            statisticError={statisticError}
            onRetryStatistic={onRetryStatistic}
          />
        );
      })()}
    </div>
  );
};

export default StatisticsWrapper;
