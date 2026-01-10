import React from "react";
import MetricMatrix from "../MetricMatrix/MetricMatrix";

interface CorrelationMatrixProps {
  data: Record<string, Record<string, number>>;
  category: string;
  onCellClick?: (file1: string, file2: string) => void;
  clickable?: boolean;
  metric: string;
  metricKey?: string;
  showInfoIcon?: boolean;
  error?: string;
  isLoading?: boolean;
  onRetry?: () => void;
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  data,
  category,
  onCellClick,
  clickable = true,
  metric,
  metricKey,
  showInfoIcon = true,
  error,
  isLoading = false,
  onRetry,
}) => {
  return (
    <MetricMatrix
      data={data}
      category={category}
      metric={metric}
      metricKey={metricKey}
      showInfoIcon={showInfoIcon}
      error={error}
      isLoading={isLoading}
      onRetry={onRetry}
      onCellClick={onCellClick}
      clickable={clickable}
      colorMode="correlation"
    />
  );
};

export default CorrelationMatrix;