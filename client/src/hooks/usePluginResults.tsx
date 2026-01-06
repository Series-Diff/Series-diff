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
    plugins: LocalPlugin[]
): UsePluginResultsReturn => {
    const [pluginResults, setPluginResults] = useState<PluginResultsMap>({});
    const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
    const [pluginErrors, setPluginErrors] = useState<PluginErrorsMap>({});

    const refreshPluginResults = useCallback(async () => {
        const enabledPlugins = plugins.filter(p => p.enabled);

        if (Object.keys(filenamesPerCategory).length === 0 || enabledPlugins.length === 0) {
            return;
        }

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
                        const pluginResult = await executePlugin(
                            plugin.code,
                            category,
                            files
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