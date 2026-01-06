import { useState, useEffect, useMemo, useRef } from 'react';
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
}

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

  // Use ref to track current selectedMetricsForDisplay value for event handlers
  // This avoids re-registering event listeners when selectedMetricsForDisplay changes
  const selectedMetricsRef = useRef(selectedMetricsForDisplay);
  
  useEffect(() => {
    selectedMetricsRef.current = selectedMetricsForDisplay;
  }, [selectedMetricsForDisplay]);

  // Helper function to auto-add new plugin IDs to selectedMetricsForDisplay
  const autoAddNewPlugins = (
    prevMetrics: Metric[], 
    newUserMetrics: Metric[]
  ): Metric[] => {
    const prevIds = new Set(prevMetrics.map(m => m.value));
    const newIds = newUserMetrics.filter(m => !prevIds.has(m.value)).map(m => m.value);
    
    // Use ref to get current value without dependency on selectedMetricsForDisplay
    if (newIds.length > 0 && selectedMetricsRef.current !== null) {
      // Add new plugin IDs to selection
      const updatedSelection = new Set([...Array.from(selectedMetricsRef.current), ...newIds]);
      setSelectedMetricsForDisplay(updatedSelection);
      
      // Save to localStorage
      localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(Array.from(updatedSelection)));
    }
    
    return newUserMetrics;
  };

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
