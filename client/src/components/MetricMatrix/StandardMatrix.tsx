import React from "react";
import MetricMatrix from "../MetricMatrix/MetricMatrix";
import { BasicMetricInfo } from "../../constants/metricsDescriptions";

interface StandardMatrixProps {
    data: Record<string, Record<string, number>>;
    category: string;
    metric: string;
    metricKey?: string;
    showInfoIcon?: boolean;
    customInfo?: BasicMetricInfo;
    error?: string;
    isLoading?: boolean;
    onRetry?: () => void;
}

const StandardMatrix: React.FC<StandardMatrixProps> = ({
    data,
    category,
    metric,
    metricKey,
    showInfoIcon = true,
    customInfo,
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
            customInfo={customInfo}
            showInfoIcon={showInfoIcon}
            error={error}
            isLoading={isLoading}
            onRetry={onRetry}
            colorMode="standard"
        />
    );
};

export default StandardMatrix;