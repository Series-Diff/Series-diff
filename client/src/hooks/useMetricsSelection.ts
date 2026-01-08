import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Metric } from '../constants/metricsConfig';
import { LocalPlugin } from './useLocalPlugins';

interface CombinedMetric {
  id: string;
  name: string;
  mean?: number;
  median?: number;
  variance?: number;
  stdDev?: number;
  autoCorrelation?: number;
  [key: string]: any;
}

const METRIC_KEY_MAPPING: Record<string, keyof CombinedMetric> = {
  'mean': 'mean',
  'median': 'median',
  'variance': 'variance',
  'std_dev': 'stdDev',
  'autocorrelation': 'autoCorrelation'
};

export const useMetricsSelection = (
  groupedMetrics: Record<string, CombinedMetric[]>
) => {
  // Load plugins from localStorage and map to Metric format
  const [userMetrics, setUserMetrics] = useState<Metric[]>(() => {
    const storedPlugins = localStorage.getItem('user-custom-metrics');
    if (storedPlugins) {
      try {
        const plugins: LocalPlugin[] = JSON.parse(storedPlugins);
        return plugins.map(p => ({
          value: p.id,
          label: p.name,
          description: p.description,
          category: p.category,
        }));
      } catch (error) {
        console.error('Failed to parse plugins from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  // Computationally expensive or less common metrics - disabled by default
  // - DTW, Autocorrelation: expensive computation
  // - MAE, Euclidean, Cosine Similarity: redundant/less useful for time series
  // - Moving Average: included by default (acceptable performance O(n·w))
  const EXPENSIVE_METRICS = useMemo(() => new Set(['dtw', 'autocorrelation', 'mae', 'euclidean', 'cosine_similarity']), []);

  // All available metrics from groupedMetrics plus any user-defined metrics
  const ALL_AVAILABLE_METRICS = useMemo(() => {
    // Known statistical metrics (always available, regardless of data load state)
    const statisticalMetrics = ['mean', 'median', 'variance', 'std_dev', 'autocorrelation'];
    // Correlation/distance metrics (not in grouped metrics)
    const correlationMetrics = ['mae', 'rmse', 'pearson_correlation', 'dtw', 'euclidean', 'cosine_similarity', 'difference_chart'];
    // Temporal metrics (always available)
    const temporalMetrics = ['moving_average'];
    // Dynamic metrics from actual data (if available)
    const metricsFromGroupedMetrics = Object.values(groupedMetrics).flatMap(metrics =>
      metrics.flatMap(metric => Object.keys(METRIC_KEY_MAPPING).filter(key => metric[METRIC_KEY_MAPPING[key]] !== undefined))
    );
    // User-defined metrics
    const userMetricValues = userMetrics.map(m => m.value);
    return Array.from(new Set([
      ...statisticalMetrics,
      ...correlationMetrics,
      ...temporalMetrics,
      ...metricsFromGroupedMetrics,
      ...userMetricValues,
    ]));
  }, [groupedMetrics, userMetrics]);

  // Default selection: all metrics EXCEPT expensive ones
  const DEFAULT_METRICS = useMemo(() => 
    ALL_AVAILABLE_METRICS.filter(m => !EXPENSIVE_METRICS.has(m)),
    [ALL_AVAILABLE_METRICS, EXPENSIVE_METRICS]
  );

  // Load selected metrics from localStorage
  // null = show default set (no localStorage entry = first time user)
  // empty Set = show none (user explicitly deselected all)
  // Set with values = show only selected
  // Default: all metrics EXCEPT computationally expensive ones (DTW, Autocorrelation, Moving Average)
  const [selectedMetricsForDisplay, setSelectedMetricsForDisplay] = useState<Set<string> | null>(() => {
    const storedSelectedMetrics = localStorage.getItem('selectedMetricsForDisplay');
    if (storedSelectedMetrics) {
      try {
        const parsed = JSON.parse(storedSelectedMetrics);
        return new Set(parsed);
      } catch (error) {
        console.error('Failed to parse selected metrics from localStorage:', error);
        return null; // On error, default to showing default set
      }
    }
    return null; // No localStorage = show default set (expensive metrics disabled)
  });

  // Track whether we've already initialized default metrics in localStorage
  const hasInitializedSelectedMetrics = useRef(false);

  // Initialize localStorage with default metrics on first load
  useEffect(() => {
    if (hasInitializedSelectedMetrics.current) {
      return;
    }

    hasInitializedSelectedMetrics.current = true;

    if (selectedMetricsForDisplay === null) {
      // First time user: initialize localStorage with default metrics (without expensive ones)
      localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(DEFAULT_METRICS));
      // Also update state and notify listeners so the UI reflects defaults immediately
      setSelectedMetricsForDisplay(new Set(DEFAULT_METRICS));
      window.dispatchEvent(
        new CustomEvent('localStorageChange', {
          detail: { key: 'selectedMetricsForDisplay', value: DEFAULT_METRICS }
        })
      );
    }
  }, [selectedMetricsForDisplay, DEFAULT_METRICS]);

  // Modal visibility state
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Use ref to track current selectedMetricsForDisplay value for event handlers
  // This avoids re-registering event listeners when selectedMetricsForDisplay changes
  const selectedMetricsRef = useRef(selectedMetricsForDisplay);
  
  useEffect(() => {
    selectedMetricsRef.current = selectedMetricsForDisplay;
  }, [selectedMetricsForDisplay]);

  // Helper function to auto-add new plugin IDs to selectedMetricsForDisplay
  const autoAddNewPlugins = useCallback((
    prevMetrics: Metric[], 
    newUserMetrics: Metric[]
  ): Metric[] => {
    const prevIds = new Set(prevMetrics.map(m => m.value));
    const newIds = newUserMetrics.filter(m => !prevIds.has(m.value)).map(m => m.value);
    
    // If there are new plugin IDs, add them to selectedMetricsForDisplay
    if (newIds.length > 0) {
      let updatedSelection: Set<string>;
      
      if (selectedMetricsRef.current === null) {
        // If selectedMetricsForDisplay is null, initialize with DEFAULT_METRICS + new IDs
        updatedSelection = new Set([...DEFAULT_METRICS, ...newIds]);
      } else {
        // Otherwise, just add new IDs to current selection
        updatedSelection = new Set([...Array.from(selectedMetricsRef.current), ...newIds]);
      }
      
      setSelectedMetricsForDisplay(updatedSelection);
      
      // Save to localStorage
      localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(Array.from(updatedSelection)));
    }
    
    return newUserMetrics;
  }, [DEFAULT_METRICS]);

  // Sync userMetrics whenever localStorage changes
  // Note: selectedMetricsForDisplay is intentionally NOT in the dependency array
  // to avoid re-registering event listeners on every state change. We use a ref instead.
  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlugins = localStorage.getItem('user-custom-metrics');
      if (storedPlugins) {
        try {
          const plugins: LocalPlugin[] = JSON.parse(storedPlugins);
          const newUserMetrics = plugins.map(p => ({
            value: p.id,
            label: p.name,
            description: p.description,
            category: p.category,
          }));
          
          // Auto-add new plugin IDs to selectedMetricsForDisplay
          setUserMetrics(prevMetrics => autoAddNewPlugins(prevMetrics, newUserMetrics));
        } catch (error) {
          console.error('Failed to parse plugins from localStorage:', error);
        }
      }
    };

    // Handle custom event for same-tab changes
    const handleCustomStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.key === 'user-custom-metrics') {
        const plugins = customEvent.detail.value as LocalPlugin[];
        const newUserMetrics = plugins.map(p => ({
          value: p.id,
          label: p.name,
          description: p.description,
          category: p.category,
        }));
        
        // Auto-add new plugin IDs to selectedMetricsForDisplay
        setUserMetrics(prevMetrics => autoAddNewPlugins(prevMetrics, newUserMetrics));
      } else if (customEvent.detail?.key === 'selectedMetricsForDisplay') {
        // Update selectedMetricsForDisplay when changed in modal
        const selectedArray = customEvent.detail.value as string[];
        setSelectedMetricsForDisplay(new Set(selectedArray));
      }
    };

    // Listen to both cross-tab storage events and same-tab custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - listeners are registered once and use ref for current state

  // Track previous userMetrics to detect new plugins
  const prevUserMetricsRef = useRef<Metric[]>([]);

  // Auto-add new plugins when userMetrics changes
  useEffect(() => {
    const prevIds = new Set(prevUserMetricsRef.current.map(m => m.value));
    const currentIds = new Set(userMetrics.map(m => m.value));
    
    // Find new plugins
    const newIds = Array.from(currentIds).filter(id => !prevIds.has(id));
    
    if (newIds.length > 0) {
      // Add new plugin IDs to selectedMetricsForDisplay
      setSelectedMetricsForDisplay(prev => {
        if (prev === null) {
          // If selectedMetricsForDisplay is null, initialize with DEFAULT_METRICS + new IDs
          const updatedSelection = new Set([...DEFAULT_METRICS, ...newIds]);
          localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(Array.from(updatedSelection)));
          return updatedSelection;
        } else {
          // Otherwise, just add new IDs to current selection
          const updatedSelection = new Set([...Array.from(prev), ...newIds]);
          localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(Array.from(updatedSelection)));
          return updatedSelection;
        }
      });
    }
    
    // Update previous userMetrics reference
    prevUserMetricsRef.current = userMetrics;
  }, [userMetrics, DEFAULT_METRICS]);
  const filteredGroupedMetrics = useMemo(() => {
    return Object.entries(groupedMetrics).reduce((acc, [category, metrics]) => {

      // 1. If null, show default (all EXCEPT expensive metrics)
      if (selectedMetricsForDisplay === null) {
        acc[category] = metrics;
        return acc;
      }

      // 2. If empty, return nothing (user deselected all)
      if (selectedMetricsForDisplay.size === 0) {
        return acc;
      }

      // 3. Filter specific fields
      const filteredMetrics = metrics.map(metric => {
        // Start with basic ID info
        const filtered: CombinedMetric = {
          id: metric.id,
          name: metric.name
        };

        // Iterate through our explicit mapping
        Object.entries(METRIC_KEY_MAPPING).forEach(([configId, dataKey]) => {
          // If the metric is selected AND the data exists in the source
          if (selectedMetricsForDisplay.has(configId) && metric[dataKey] !== undefined) {
            filtered[dataKey] = metric[dataKey];
          }
        });

        return filtered;
      }).filter(metric => {
        // Keep the metric only if at least one numeric statistic ended up in the object
        return Object.values(METRIC_KEY_MAPPING).some(key => metric[key] !== undefined);
      });

      if (filteredMetrics.length > 0) {
        acc[category] = filteredMetrics;
      }

      return acc;
    }, {} as Record<string, CombinedMetric[]>);
  }, [groupedMetrics, selectedMetricsForDisplay]);

  // Helper function to check if a metric should be displayed
  const shouldShowMetric = (metricValue: string): boolean => {
    if (selectedMetricsForDisplay === null) {
      // This shouldn't happen after initialization, but fallback to default behavior
      return !EXPENSIVE_METRICS.has(metricValue);
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
