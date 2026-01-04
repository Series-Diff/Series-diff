import { useState, useEffect, useCallback } from 'react';
import { LocalPlugin } from './useLocalPlugins';
import { executePlugin } from '../services/pluginService';

export interface PluginResultsMap {
    [pluginId: string]: {
        [category: string]: {
            [file1: string]: {
                [file2: string]: number
            }
        }
    }
}

export interface UsePluginResultsReturn {
    pluginResults: PluginResultsMap;
    isLoadingPlugins: boolean;
    pluginError: string | null;
    refreshPluginResults: () => Promise<void>;
    resetPluginResults: () => void;
}

export const usePluginResults = (
    filenamesPerCategory: Record<string, string[]>,
    plugins: LocalPlugin[]
): UsePluginResultsReturn => {
    const [pluginResults, setPluginResults] = useState<PluginResultsMap>({});
    const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
    const [pluginError, setPluginError] = useState<string | null>(null);

    const refreshPluginResults = useCallback(async () => {
        const enabledPlugins = plugins.filter(p => p.enabled);

        if (Object.keys(filenamesPerCategory).length === 0 || enabledPlugins.length === 0) {
            return;
        }

        setIsLoadingPlugins(true);
        setPluginError(null);

        try {
            const newResults: PluginResultsMap = {};

            // For each plugin, execute per category
            for (const plugin of enabledPlugins) {
                newResults[plugin.id] = {};

                for (const category of Object.keys(filenamesPerCategory)) {
                    const files = filenamesPerCategory[category];

                    if (files.length < 2) {
                        newResults[plugin.id][category] = {};
                        continue;
                    }

                    try {
                        const pluginResult = await executePlugin(
                            plugin.code,
                            category,
                            files
                        );

                        if (pluginResult.error) {
                            console.warn(`Plugin error for ${plugin.name}/${category}:`, pluginResult.error);
                            newResults[plugin.id][category] = {};
                        } else if (pluginResult.results) {
                            // Results already in correct nested format
                            newResults[plugin.id][category] = pluginResult.results as any;
                        }
                    } catch (e) {
                        console.warn(`Error executing for ${plugin.name}/${category}`, e);
                        newResults[plugin.id][category] = {};
                    }
                }
            }
            setPluginResults(newResults);
        } catch (err: any) {
            console.error('Error fetching plugin results:', err);
            setPluginError(err.message || 'Failed to fetch plugin results');
        } finally {
            setIsLoadingPlugins(false);
        }
    }, [filenamesPerCategory, plugins]);

    // Auto-refresh when files or plugin definitions change
    useEffect(() => {
        if (Object.keys(filenamesPerCategory).length > 0 && plugins.length > 0) {
            refreshPluginResults();
        }
    }, [filenamesPerCategory, plugins, refreshPluginResults]);

    const resetPluginResults = useCallback(() => {
        setPluginResults({});
        setPluginError(null);
    }, []);

    return {
        pluginResults,
        isLoadingPlugins,
        pluginError,
        refreshPluginResults,
        resetPluginResults,
    };
};

export default usePluginResults;