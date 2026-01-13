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
  // Date range for metrics display
  appliedStartDate?: Date | null;
  appliedEndDate?: Date | null;
  dataMinDate?: Date | null;
  dataMaxDate?: Date | null;
  ignoreTimeRange?: boolean;
}

const StatisticsWrapper: React.FC<Props> = ({ groupedStatistics, statisticLoading, statisticError, selectedStatisticsForDisplay, onOpenStatisticsModal, onExportClick, isExporting, onRetryStatistic, appliedStartDate, appliedEndDate, dataMinDate, dataMaxDate, ignoreTimeRange }) => {
  const isLoading = !!(statisticLoading['meanValues'] || statisticLoading['medianValues'] || statisticLoading['varianceValues'] || statisticLoading['stdDevsValues'] || statisticLoading['autoCorrelationValues']);

  // Track previous selection to avoid showing a large global spinner when user
  // explicitly had no stats selected and then selects one quick-to-fetch metric.
  const prevSelectedRef = useRef<Set<string> | null | undefined>(undefined);
  useEffect(() => {
    prevSelectedRef.current = selectedStatisticsForDisplay;
  }, [selectedStatisticsForDisplay]);

  // Format date as dd.mm.yyyy hh:mm
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Calculate the effective date range for metrics display
  const getDateRangeLabel = (): string | null => {
    if (!dataMinDate || !dataMaxDate) return null;

    // If ignoreTimeRange is true, metrics are calculated on full data range
    if (ignoreTimeRange) {
      return `${formatDate(dataMinDate)} - ${formatDate(dataMaxDate)} (full range)`;
    }

    if (!appliedStartDate || !appliedEndDate) return null;

    // Helper: compare dates ignoring seconds/milliseconds (match up to minute)
    const sameMinute = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate() &&
      a.getHours() === b.getHours() &&
      a.getMinutes() === b.getMinutes();

    // Clamp applied dates to data bounds
    const effectiveStart = appliedStartDate < dataMinDate ? dataMinDate : appliedStartDate;
    const effectiveEnd = appliedEndDate > dataMaxDate ? dataMaxDate : appliedEndDate;

    // Check if ends were clamped (user selected outside data bounds)
    const startWasClamped = appliedStartDate < dataMinDate;
    const endWasClamped = appliedEndDate > dataMaxDate;

    // Also treat as full range if effective range equals data bounds (ignoring seconds)
    const isFullRange = (startWasClamped && endWasClamped) || (sameMinute(effectiveStart, dataMinDate) && sameMinute(effectiveEnd, dataMaxDate));

    if (isFullRange) {
      return `${formatDate(effectiveStart)} - ${formatDate(effectiveEnd)} (full range)`;
    }

    return `${formatDate(effectiveStart)} - ${formatDate(effectiveEnd)}`;
  };

  const dateRangeLabel = getDateRangeLabel();

  return (
    <div className="section-container p-3 d-flex flex-column gap-3" data-component="Statistics-Main-Wraper">
      <div className="d-flex justify-content-between align-items-center gap-2">
        {dateRangeLabel && (
          <span className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
            Metrics were calculated for: {dateRangeLabel}
          </span>
        )}
        {!dateRangeLabel && <span />}
        <div className="d-flex align-items-center gap-2">
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
