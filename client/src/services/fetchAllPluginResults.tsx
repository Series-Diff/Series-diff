/**
 * Service for fetching plugin results for all enabled plugins.
 * Works with localStorage-based plugins.
 */

import { LocalPlugin } from '../hooks/useLocalPlugins';
import { executePluginCode } from './pluginService';

export interface PluginResult {
    pluginId: string;
    pluginName: string;
    category: string;
    file1: string;
    file2: string;
    result: number | null;
    error?: string;
}

export type PluginResultsMap = Record<string, Record<string, Record<string, Record<string, number>>>>;
// Structure: { pluginId: { category: { file1: { file2: value } } } }

const STORAGE_KEY = 'series-diff-plugins';

/**
 * Load enabled plugins from localStorage.
 */
function getEnabledPluginsFromStorage(): LocalPlugin[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const plugins: LocalPlugin[] = JSON.parse(stored);
            return plugins.filter(p => p.enabled);
        }
    } catch (error) {
        console.error('Error loading plugins from localStorage:', error);
    }
    return [];
}

/**
 * Fetch results for all enabled plugins for all file pairs in each category.
 */
export async function fetchAllPluginResults(
    filenamesPerCategory: Record<string, string[]>
): Promise<{ results: PluginResultsMap; plugins: LocalPlugin[] }> {
    // Get enabled plugins from localStorage
    const plugins = getEnabledPluginsFromStorage();

    if (plugins.length === 0) {
        return { results: {}, plugins: [] };
    }

    const results: PluginResultsMap = {};

    // Initialize structure for each plugin
    for (const plugin of plugins) {
        results[plugin.id] = {};
    }

    // For each category
    for (const category of Object.keys(filenamesPerCategory)) {
        const files = filenamesPerCategory[category];

        // For each plugin
        for (const plugin of plugins) {
            if (!results[plugin.id][category]) {
                results[plugin.id][category] = {};
            }

            // For each file pair
            for (const f1 of files) {
                if (!results[plugin.id][category][f1]) {
                    results[plugin.id][category][f1] = {};
                }

                for (const f2 of files) {
                    if (f1 === f2) continue;

                    try {
                        // Execute plugin code directly
                        const execResult = await executePluginCode(
                            plugin.code,
                            f1,
                            f2,
                            category
                        );

                        if (execResult.result !== undefined) {
                            results[plugin.id][category][f1][f2] = execResult.result;
                        }
                    } catch (err) {
                        console.warn(`Plugin ${plugin.name} failed for ${f1} vs ${f2}:`, err);
                    }
                }
            }
        }
    }

    return { results, plugins };
}

/**
 * Fetch plugin result for a single pair (useful for on-demand calculation).
 */
export async function fetchSinglePluginResult(
    pluginCode: string,
    filename1: string,
    filename2: string,
    category: string
): Promise<number | null> {
    try {
        const result = await executePluginCode(pluginCode, filename1, filename2, category);
        return result.result ?? null;
    } catch {
        return null;
    }
}
