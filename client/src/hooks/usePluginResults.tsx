import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalPlugin } from './useLocalPlugins';
import { executePlugin } from '../services/pluginService';
import { useGlobalCache } from '../contexts/CacheContext';

export interface PluginResultsMap {
    [pluginId: string]: {
        [category: string]: {
            [file1: string]: {
                [file2: string]: number
            }
        }
    }
}

export interface PluginErrorsMap {
    [pluginId: string]: {
        [category: string]: string | null
    }
}

export interface UsePluginResultsReturn {
    pluginResults: PluginResultsMap;
    isLoadingPlugins: boolean;
    pluginErrors: PluginErrorsMap;
    refreshPluginResults: () => Promise<void>;
    resetPluginResults: () => void;
}

export const usePluginResults = (
    filenamesPerCategory: Record<string, string[]>,
    plugins: LocalPlugin[],
    selectedMetrics: Set<string> | null,
    start?: string | null,
    end?: string | null,
    timeRangePending?: boolean,
    defaultMinDateForBounds?: Date | null,
    defaultMaxDateForBounds?: Date | null
): UsePluginResultsReturn => {
    const globalCache = useGlobalCache();
    const [pluginResults, setPluginResults] = useState<PluginResultsMap>({});
    const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
    const [pluginErrors, setPluginErrors] = useState<PluginErrorsMap>({});
    const isExecutingRef = useRef(false);

    const refreshPluginResults = useCallback(async () => {
        // Prevent concurrent executions
        if (isExecutingRef.current) {
            return;
        }

        // Filter enabled plugins by selection
        // Note: selectedMetrics === null means "show all" (modal not yet opened)
        // selectedMetrics.size === 0 means "hide all" (user deselected everything)
        const shouldShow = (metricId: string) => 
            selectedMetrics === null || (selectedMetrics.size > 0 && selectedMetrics.has(metricId));
        
        const enabledPlugins = plugins.filter(p => p.enabled && shouldShow(p.id));

        if (Object.keys(filenamesPerCategory).length === 0 || enabledPlugins.length === 0) {
            return;
        }

        isExecutingRef.current = true;
        setIsLoadingPlugins(true);
        setPluginErrors({});

        try {
            const newResults: PluginResultsMap = {};
            const newErrors: PluginErrorsMap = {};

            // For each plugin, execute per category
            for (const plugin of enabledPlugins) {
                newResults[plugin.id] = {};
                newErrors[plugin.id] = {};

                for (const category of Object.keys(filenamesPerCategory)) {
                    const files = filenamesPerCategory[category];

                    if (files.length < 2) {
                        newResults[plugin.id][category] = {};
                        continue;
                    }

                    try {
                        // Normalize nulls to bounds for cache keys to avoid refetch on toggle
                        // Use memoized default bounds to stabilize cache keys when toggling full range
                        const defaultMinIso = defaultMinDateForBounds ? new Date(defaultMinDateForBounds.getTime()).toISOString() : null;
                        const defaultMaxIso = defaultMaxDateForBounds ? new Date(defaultMaxDateForBounds.getTime()).toISOString() : null;
                        const cacheStart = start === null ? defaultMinIso : start;
                        const cacheEnd = end === null ? defaultMaxIso : end;

                        const pluginResult = await executePlugin(
                            plugin.code,
                            category,
                            files,
                            cacheStart,
                            cacheEnd
                        );

                        if (pluginResult.error) {
                            // Store the specific error for this plugin/category
                            newErrors[plugin.id][category] = pluginResult.error;
                            console.warn(`Plugin error for ${plugin.name}/${category}:`, pluginResult.error);
                        } else if (pluginResult.results) {
                            // Results already in correct nested format
                            newResults[plugin.id][category] = pluginResult.results as any;
                        }
                    } catch (e: any) {
                        const errorMessage = e.message || 'Unknown execution error';
                        newErrors[plugin.id][category] = errorMessage;
                        console.warn(`Error executing for ${plugin.name}/${category}`, e);
                    }
                }
            }
            setPluginResults(newResults);
            setPluginErrors(newErrors);
        } catch (err: any) {
            console.error('Critical error in plugin execution loop:', err);
        } finally {
            setIsLoadingPlugins(false);
            isExecutingRef.current = false;
        }
    }, [filenamesPerCategory, plugins, selectedMetrics, start, end, defaultMinDateForBounds, defaultMaxDateForBounds]);

    // Auto-refresh when files or plugin definitions change
    // Note: Don't include refreshPluginResults in deps to avoid infinite loop
    useEffect(() => {
        // If date range is required but not ready yet, skip
        if (timeRangePending) {
            return;
        }
        // Early return if selectedMetrics explicitly excludes all plugins
        // Note: selectedMetrics === null means "show all" (modal not yet opened)
        // selectedMetrics.size === 0 means "hide all" (user deselected everything)
        if (selectedMetrics !== null && selectedMetrics.size === 0) {
            // User explicitly deselected all metrics - don't fetch anything
            return;
        }
        
        if (selectedMetrics !== null && selectedMetrics.size > 0) {
            // Check if any plugins are enabled AND selected in metrics
            const shouldShow = (metricId: string) => selectedMetrics.has(metricId);
            const hasEnabledPlugins = plugins.some(p => p.enabled && shouldShow(p.id));
            
            if (!hasEnabledPlugins) {
                // No enabled plugins are selected - don't fetch
                return;
            }
        }
        
        // If selectedMetrics is null, check if any plugins are enabled at all
        const hasAnyEnabledPlugins = plugins.some(p => p.enabled);
        
        if (Object.keys(filenamesPerCategory).length > 0 && hasAnyEnabledPlugins) {
            refreshPluginResults();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filenamesPerCategory, plugins, selectedMetrics, start, end, timeRangePending]);

    const resetPluginResults = useCallback(() => {
        setPluginResults({});
        setPluginErrors({});
        }, []);

    return {
        pluginResults,
        isLoadingPlugins,
        pluginErrors,
        refreshPluginResults,
        resetPluginResults,
    };
};

export default usePluginResults;