import { useState, useEffect, useMemo } from 'react';
import { Metric } from '../constants/metricsConfig';

interface CombinedMetric {
  id: string;
  name: string;
  mean?: number;
  median?: number;
  variance?: number;
  stdDev?: number;
  autoCorrelation?: number;
}

export const useMetricsSelection = (
  groupedMetrics: Record<string, CombinedMetric[]>
) => {
  // Load user metrics from localStorage
  const [userMetrics, setUserMetrics] = useState<Metric[]>(() => {
    const storedMetrics = localStorage.getItem('userMetrics');
    if (storedMetrics) {
      try {
        return JSON.parse(storedMetrics);
      } catch (error) {
        console.error('Failed to parse user metrics from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  // Load selected metrics from localStorage
  // null = show all (no localStorage entry = first time user)
  // empty Set = show none (user explicitly deselected all)
  // Set with values = show only selected
  const [selectedMetricsForDisplay, setSelectedMetricsForDisplay] = useState<Set<string> | null>(() => {
    const storedSelectedMetrics = localStorage.getItem('selectedMetricsForDisplay');
    if (storedSelectedMetrics) {
      try {
        const parsed = JSON.parse(storedSelectedMetrics);
        return new Set(parsed);
      } catch (error) {
        console.error('Failed to parse selected metrics from localStorage:', error);
        return null; // On error, default to showing all
      }
    }
    return null; // No localStorage = show all
  });

  // Modal visibility state
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Sync userMetrics whenever localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedMetrics = localStorage.getItem('userMetrics');
      if (storedMetrics) {
        try {
          setUserMetrics(JSON.parse(storedMetrics));
        } catch (error) {
          console.error('Failed to parse user metrics from localStorage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter metrics based on selected metrics
  const filteredGroupedMetrics = useMemo(() => {
    return Object.entries(groupedMetrics).reduce((acc, [category, metrics]) => {
      if (selectedMetricsForDisplay === null) {
        // null = no selection made yet, show all
        acc[category] = metrics;
      } else if (selectedMetricsForDisplay.size === 0) {
        // Empty Set = user explicitly deselected all, show nothing
        // Don't add this category at all
      } else {
        // Filter metrics to show only selected statistic fields
        acc[category] = metrics.map(metric => {
          const filtered: typeof metric = {
            id: metric.id,
            name: metric.name
          };
          
          // Map selected metric values to CombinedMetric fields
          if (selectedMetricsForDisplay.has('mean') && metric.mean !== undefined) {
            filtered.mean = metric.mean;
          }
          if (selectedMetricsForDisplay.has('median') && metric.median !== undefined) {
            filtered.median = metric.median;
          }
          if (selectedMetricsForDisplay.has('variance') && metric.variance !== undefined) {
            filtered.variance = metric.variance;
          }
          if (selectedMetricsForDisplay.has('std_dev') && metric.stdDev !== undefined) {
            filtered.stdDev = metric.stdDev;
          }
          if (selectedMetricsForDisplay.has('autocorrelation') && metric.autoCorrelation !== undefined) {
            filtered.autoCorrelation = metric.autoCorrelation;
          }
          
          return filtered;
        }).filter(metric => {
          // Keep metric only if it has at least one statistic value
          return metric.mean !== undefined || metric.median !== undefined || 
                 metric.variance !== undefined || metric.stdDev !== undefined || 
                 metric.autoCorrelation !== undefined;
        });
        
        // Remove empty categories
        if (acc[category].length === 0) {
          delete acc[category];
        }
      }
      return acc;
    }, {} as Record<string, typeof groupedMetrics[keyof typeof groupedMetrics]>);
  }, [groupedMetrics, selectedMetricsForDisplay]);

  // Helper function to check if a metric should be displayed
  const shouldShowMetric = (metricValue: string): boolean => {
    if (selectedMetricsForDisplay === null) {
      // null = no selection made yet, show all
      return true;
    }
    if (selectedMetricsForDisplay.size === 0) {
      // Empty Set = user explicitly deselected all, show nothing
      return false;
    }
    return selectedMetricsForDisplay.has(metricValue);
  };

  return {
    userMetrics,
    selectedMetricsForDisplay,
    setSelectedMetricsForDisplay,
    showMetricsModal,
    setShowMetricsModal,
    filteredGroupedMetrics,
    shouldShowMetric
  };
};
