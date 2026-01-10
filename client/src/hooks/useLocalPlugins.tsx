import { useState, useEffect, useCallback, useRef } from 'react';

export interface LocalPlugin {
    id: string;
    name: string;
    description: string;
    category: string;
    code: string;
    enabled: boolean;
}

const STORAGE_KEY = 'user-custom-metrics';

function generatePluginId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}_${random}`;
}

function loadPluginsFromStorage(): LocalPlugin[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading plugins from localStorage:', error);
    }
    return [];
}

function savePluginsToStorage(plugins: LocalPlugin[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
        // Dispatch custom event to notify other components in the same tab
        window.dispatchEvent(new CustomEvent('localStorageChange', { 
            detail: { key: STORAGE_KEY, value: plugins } 
        }));
    } catch (error) {
        console.error('Error saving plugins to localStorage:', error);
    }
}

export function useLocalPlugins() {
    const [plugins, setPlugins] = useState<LocalPlugin[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadedPlugins = loadPluginsFromStorage();
        setPlugins(loadedPlugins);
        setIsLoading(false);
    }, []);

    // Skip the initial save that runs immediately after loading from localStorage
    // to avoid dispatching a `localStorageChange` event with unchanged data on boot.
    const hasSavedOnceRef = useRef(false);
    useEffect(() => {
        if (isLoading) return;
        if (!hasSavedOnceRef.current) {
            hasSavedOnceRef.current = true;
            return;
        }
        savePluginsToStorage(plugins);
    }, [plugins, isLoading]);

    const createPlugin = useCallback((
        name: string,
        description: string,
        category: string,
        code: string,
    ): LocalPlugin => {
        const newPlugin: LocalPlugin = {
            id: generatePluginId(name),
            name,
            description,
            category,
            code,
            enabled: true
        };

        setPlugins(prev => [...prev, newPlugin]);
        
        // Auto-add new plugin to selectedMetricsForDisplay
        try {
            const storedSelection = localStorage.getItem('selectedMetricsForDisplay');
            if (storedSelection) {
                const currentSelection: string[] = JSON.parse(storedSelection);
                if (!currentSelection.includes(newPlugin.id)) {
                    const updatedSelection = [...currentSelection, newPlugin.id];
                    localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(updatedSelection));
                    // Dispatch event to notify other components
                    window.dispatchEvent(new CustomEvent('localStorageChange', {
                        detail: { key: 'selectedMetricsForDisplay', value: updatedSelection }
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to auto-add plugin to selectedMetricsForDisplay:', error);
        }
        
        return newPlugin;
    }, []);

    const updatePlugin = useCallback((
        pluginId: string,
        updates: Partial<Omit<LocalPlugin, 'id'>>
    ): LocalPlugin | null => {
        let updatedPlugin: LocalPlugin | null = null;

        setPlugins(prev => prev.map(plugin => {
            if (plugin.id === pluginId) {
                updatedPlugin = { ...plugin, ...updates };
                return updatedPlugin;
            }
            return plugin;
        }));

        return updatedPlugin;
    }, []);

    const deletePlugin = useCallback((pluginId: string): boolean => {
        let found = false;
        setPlugins(prev => {
            const newPlugins = prev.filter(p => {
                if (p.id === pluginId) {
                    found = true;
                    return false;
                }
                return true;
            });
            return newPlugins;
        });
        return found;
    }, []);

    const getPlugin = useCallback((pluginId: string): LocalPlugin | undefined => {
        return plugins.find(p => p.id === pluginId);
    }, [plugins]);

    return {
        plugins,
        isLoading,
        createPlugin,
        updatePlugin,
        deletePlugin,
        getPlugin
    };
}