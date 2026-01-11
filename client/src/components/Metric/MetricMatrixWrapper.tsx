import React from 'react';
import { Alert } from 'react-bootstrap';

interface Props {
  metricId: string;
  Comp: any;
  dataMap: Record<string, any>;
  metricLabel: string;
  metricKey: string;
  isLoading?: boolean;
  error?: string;
  extraProps?: Record<string, any>;
  fallbackEmpty?: boolean;
  correlationClick?: boolean;
  selectedCategory?: string | null;
  secondaryCategory?: string | null;
  tertiaryCategory?: string | null;
  totalFilesLoaded: number;
  onCellClick?: (file1: string, file2: string, category: string) => void;
  shouldShow: boolean;
  onRetry?: () => void;
}

const MetricMatrixWrapper: React.FC<Props> = ({
  Comp,
  dataMap,
  metricLabel,
  metricKey,
  isLoading = false,
  error,
  extraProps = {},
  fallbackEmpty = false,
  correlationClick = false,
  selectedCategory,
  secondaryCategory,
  tertiaryCategory,
  totalFilesLoaded,
  onCellClick,
  shouldShow,
  onRetry,
}) => {
  if (!shouldShow) return null;
  if (!selectedCategory) return null;
  if (totalFilesLoaded < 2) return null;

  const getData = (cat?: string) => (cat ? (dataMap && dataMap[cat]) || (fallbackEmpty ? {} : undefined) : undefined);

  const primaryRaw = getData(selectedCategory);
  const primaryData = primaryRaw || {};

  const renderComp = (cat: string, rawData: any, showInfo = true) => {
    const dataToPass = rawData || {};
    // If an error exists for this metric, prefer showing the error Alert in place of the spinner.
    // Only show loading when there's an explicit loading flag and no error present.
    const localLoading = Boolean(isLoading && !error);

    const props: any = {
      data: dataToPass,
      category: cat,
      metric: metricLabel,
      metricKey,
      isLoading: localLoading,
      error,
      onRetry,
      ...extraProps,
    };

    if (correlationClick && onCellClick) {
      props.onCellClick = (file1: string, file2: string) => onCellClick(file1, file2, cat);
    }

    if (!showInfo) props.showInfoIcon = false;

    return <Comp {...props} />;
  };

  return (
    <div className="section-container p-3 d-flex flex-column gap-3" data-component="Metric-Matrix-Wrapper">
      {renderComp(selectedCategory!, primaryData, true)}
      {secondaryCategory && renderComp(secondaryCategory, getData(secondaryCategory) || {}, false)}
      {tertiaryCategory && renderComp(tertiaryCategory, getData(tertiaryCategory) || {}, false)}
      {/* {!primaryHasData && !isLoading && (
        <Alert variant="warning" className="mb-0 mt-3 text-center">
          Metric data is unavailable for the selected category.
        </Alert>
      )} */}
    </div>
  );
};

export default MetricMatrixWrapper;
