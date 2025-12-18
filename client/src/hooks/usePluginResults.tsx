import { useState, useEffect, useCallback } from 'react';
import { LocalPlugin } from './useLocalPlugins';
import { executePluginCode } from '../services/pluginService';

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

            // Iterujemy przez aktywne pluginy
            for (const plugin of enabledPlugins) {
                newResults[plugin.id] = {};

                // Iterujemy przez kategorie
                for (const category of Object.keys(filenamesPerCategory)) {
                    newResults[plugin.id][category] = {};
                    
                    const files = filenamesPerCategory[category];

                    for (const file1 of files) {
                        newResults[plugin.id][category][file1] = {};
                        for (const file2 of files) {
                            try {
                                const result = await executePluginCode(
                                    plugin.code, 
                                    file1, 
                                    file2, 
                                    category
                                );
                                newResults[plugin.id][category][file1][file2] = result.result || 0;
                            } catch (e) {
                                console.warn(`Error calc ${plugin.name} for ${file1}-${file2}`, e);
                            }
                        }
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

    // Automatyczne odświeżanie, gdy zmienią się pliki lub definicje pluginów
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