/**
 * Error Simulator for Demo/Presentation Purposes
 * 
 * Allows simulating errors for specific metrics, statistics, or plugins
 * to demonstrate error handling behavior during presentations.
 * 
 * Usage via browser console:
 *   - window.errorSimulator.enable('dtw')           // Enable error for DTW metric
 *   - window.errorSimulator.enable('pearson')       // Enable error for Pearson
 *   - window.errorSimulator.enable('mean')          // Enable error for Mean statistic
 *   - window.errorSimulator.enable('My Plugin')     // Enable error for a plugin by name
 *   - window.errorSimulator.enableAll()             // Enable errors for ALL metrics/stats/plugins
 *   - window.errorSimulator.disable('dtw')          // Disable error for DTW
 *   - window.errorSimulator.disableAll()            // Disable all simulated errors
 *   - window.errorSimulator.list()                  // List all active simulated errors
 *   - window.errorSimulator.isEnabled('dtw')        // Check if error is enabled
 *   - window.errorSimulator.help()                  // Show help with all available options
 */

const STORAGE_KEY = 'demo-error-simulation';
const PLUGINS_STORAGE_KEY = 'user-custom-metrics';

// Separate lists for different types - use EXACT names as used in metricType
const CORRELATION_METRICS = ['dtw', 'pearson_correlation'];
const COMPARISON_METRICS = ['mae', 'rmse', 'euclidean', 'cosine_similarity'];
const STATISTICS = ['mean', 'median', 'variance', 'std_dev', 'autocorrelation'];
const CHART_FEATURES = ['moving_average', 'difference_chart'];

// Aliases for user convenience (short names -> full names)
const METRIC_ALIASES: Record<string, string> = {
  'pearson': 'pearson_correlation',
  'cosine': 'cosine_similarity',
  'ma': 'moving_average',
  'diff': 'difference_chart',
  'difference': 'difference_chart',
};

// All available metric/statistic names for enableAll
const ALL_METRICS = [...CORRELATION_METRICS, ...COMPARISON_METRICS, ...STATISTICS, ...CHART_FEATURES];

interface ErrorSimulatorState {
  enabledErrors: Set<string>;
  enabledPluginNames: Set<string>; // Track plugin names separately for enableAll
}

class ErrorSimulator {
  private state: ErrorSimulatorState = {
    enabledErrors: new Set(),
    enabledPluginNames: new Set(),
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.enabledErrors = new Set(parsed.enabledErrors || []);
        this.state.enabledPluginNames = new Set(parsed.enabledPluginNames || []);
      }
    } catch (e) {
      console.warn('Failed to load error simulator state:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const toSave = {
        enabledErrors: Array.from(this.state.enabledErrors),
        enabledPluginNames: Array.from(this.state.enabledPluginNames),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save error simulator state:', e);
    }
  }

  /**
   * Resolve alias to full metric name
   */
  private resolveAlias(name: string): string {
    const normalized = name.toLowerCase().trim();
    return METRIC_ALIASES[normalized] || normalized;
  }

  /**
   * Load all plugins from localStorage
   */
  private loadPluginsFromStorage(): Array<{name: string}> {
    try {
      const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load plugins from storage:', e);
    }
    return [];
  }

  /**
   * Enable error simulation for a metric, statistic, or plugin
   * @param name - metric key (e.g., 'dtw', 'pearson', 'mae', 'rmse', 'euclidean', 'cosine', 'mean', 'median', 'variance', 'std_dev', 'autocorrelation') 
   *               or plugin NAME (e.g., 'My Custom Plugin')
   */
  enable(name: string): void {
    const resolvedName = this.resolveAlias(name);
    this.state.enabledErrors.add(resolvedName);
    // If it's not a known metric, it might be a plugin name - track it
    if (!ALL_METRICS.includes(resolvedName)) {
      this.state.enabledPluginNames.add(resolvedName);
    }
    this.saveToStorage();
    console.log(`✓ Error simulation ENABLED for: ${name}${resolvedName !== name.toLowerCase().trim() ? ` (resolved to: ${resolvedName})` : ''}`);
    console.log('  Refresh the page or change date range to trigger the error.');
  }

  /**
   * Enable error simulation for ALL metrics, statistics, and ALL current plugins
   */
  enableAll(): void {
    ALL_METRICS.forEach(metric => {
      this.state.enabledErrors.add(metric);
    });
    // Load and enable ALL plugins currently in localStorage
    const plugins = this.loadPluginsFromStorage();
    plugins.forEach(plugin => {
      const pluginName = plugin.name.toLowerCase().trim();
      this.state.enabledErrors.add(pluginName);
      this.state.enabledPluginNames.add(pluginName);
    });
    this.state.enabledPluginNames.forEach(pluginName => {
      this.state.enabledErrors.add(pluginName);
    });
    this.saveToStorage();
    console.log('✓ Error simulation ENABLED for ALL:');
    console.log('  Correlation Metrics: ' + CORRELATION_METRICS.join(', '));
    console.log('  Comparison Metrics: ' + COMPARISON_METRICS.join(', '));
    console.log('  Statistics: ' + STATISTICS.join(', '));
    console.log('  Chart Features: ' + CHART_FEATURES.join(', '));
    if (this.state.enabledPluginNames.size > 0) {
      console.log(`  Plugins: ${Array.from(this.state.enabledPluginNames).join(', ')}`);
    }
    console.log('  Refresh the page or change date range to trigger errors.');
  }

  /**
   * Enable error simulation for all METRICS only (correlation + comparison)
   */
  enableAllMetrics(): void {
    [...CORRELATION_METRICS, ...COMPARISON_METRICS].forEach(metric => {
      this.state.enabledErrors.add(metric);
    });
    this.saveToStorage();
    console.log('✓ Error simulation ENABLED for ALL METRICS:');
    console.log('  Correlation: ' + CORRELATION_METRICS.join(', '));
    console.log('  Comparison: ' + COMPARISON_METRICS.join(', '));
    console.log('  Refresh the page or change date range to trigger errors.');
  }

  /**
   * Enable error simulation for all STATISTICS only
   */
  enableAllStats(): void {
    STATISTICS.forEach(stat => {
      this.state.enabledErrors.add(stat);
    });
    this.saveToStorage();
    console.log('✓ Error simulation ENABLED for ALL STATISTICS:');
    console.log('  ' + STATISTICS.join(', '));
    console.log('  Refresh the page or change date range to trigger errors.');
  }

  /**
   * Enable error simulation for all PLUGINS (loads from localStorage)
   */
  enableAllPlugins(): void {
    const plugins = this.loadPluginsFromStorage();
    if (plugins.length === 0) {
      console.log('⚠ No plugins found in localStorage.');
      return;
    }
    plugins.forEach(plugin => {
      const pluginName = plugin.name.toLowerCase().trim();
      this.state.enabledErrors.add(pluginName);
      this.state.enabledPluginNames.add(pluginName);
    });
    this.saveToStorage();
    console.log('✓ Error simulation ENABLED for ALL PLUGINS:');
    console.log('  ' + plugins.map(p => p.name).join(', '));
    console.log('  Refresh the page or change date range to trigger errors.');
  }

  /**
   * Disable error simulation for a metric/plugin
   */
  disable(name: string): void {
    const resolvedName = this.resolveAlias(name);
    this.state.enabledErrors.delete(resolvedName);
    this.state.enabledPluginNames.delete(resolvedName);
    this.saveToStorage();
    console.log(`✗ Error simulation DISABLED for: ${name}${resolvedName !== name.toLowerCase().trim() ? ` (resolved to: ${resolvedName})` : ''}`);
  }

  /**
   * Disable all error simulations
   */
  disableAll(): void {
    this.state.enabledErrors.clear();
    this.saveToStorage();
    console.log('✗ All error simulations DISABLED');
  }

  /**
   * Disable all METRICS only (correlation + comparison)
   */
  disableAllMetrics(): void {
    [...CORRELATION_METRICS, ...COMPARISON_METRICS].forEach(metric => {
      this.state.enabledErrors.delete(metric);
    });
    this.saveToStorage();
    console.log('✗ All METRICS error simulations DISABLED');
  }

  /**
   * Disable all STATISTICS only
   */
  disableAllStats(): void {
    STATISTICS.forEach(stat => {
      this.state.enabledErrors.delete(stat);
    });
    this.saveToStorage();
    console.log('✗ All STATISTICS error simulations DISABLED');
  }

  /**
   * Disable all PLUGINS only
   */
  disableAllPlugins(): void {
    this.state.enabledPluginNames.forEach(pluginName => {
      this.state.enabledErrors.delete(pluginName);
    });
    this.saveToStorage();
    console.log('✗ All PLUGINS error simulations DISABLED');
  }

  /**
   * Check if error simulation is enabled for a metric/plugin
   */
  isEnabled(name: string): boolean {
    const resolvedName = this.resolveAlias(name);
    return this.state.enabledErrors.has(resolvedName);
  }

  /**
   * List all active error simulations
   */
  list(): string[] {
    const errors = Array.from(this.state.enabledErrors);
    if (errors.length === 0) {
      console.log('No error simulations active.');
    } else {
      console.log('Active error simulations:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    return errors;
  }

  /**
   * Check if error should be thrown for a metric/plugin and throw if enabled
   * @throws Error if simulation is enabled for this name
   */
  checkAndThrow(name: string): void {
    if (this.isEnabled(name)) {
      throw new Error(`[SIMULATED ERROR] ${name.toUpperCase()} calculation failed`);
    }
  }

  /**
   * Get error message if simulation is enabled, otherwise null
   */
  getError(name: string): string | null {
    if (this.isEnabled(name)) {
      return `[SIMULATED ERROR] ${name.toUpperCase()} calculation failed`;
    }
    return null;
  }

  /**
   * Print help to console
   */
  help(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          ERROR SIMULATOR HELP                                 ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ENABLE COMMANDS:                                                             ║
║    errorSimulator.enable('name')      - Enable error for specific item        ║
║    errorSimulator.enableAll()         - Enable ALL (metrics, stats, features) ║
║    errorSimulator.enableAllMetrics()  - Enable all METRICS only               ║
║    errorSimulator.enableAllStats()    - Enable all STATISTICS only            ║
║    errorSimulator.enableAllPlugins()  - Enable all current PLUGINS            ║
║                                                                               ║
║  DISABLE COMMANDS:                                                            ║
║    errorSimulator.disable('name')     - Disable specific item                 ║
║    errorSimulator.disableAll()        - Disable ALL simulated errors          ║
║    errorSimulator.disableAllMetrics() - Disable all METRICS only              ║
║    errorSimulator.disableAllStats()   - Disable all STATISTICS only           ║
║    errorSimulator.disableAllPlugins() - Disable all PLUGINS only              ║
║                                                                               ║
║  OTHER COMMANDS:                                                              ║
║    errorSimulator.list()              - List currently active errors          ║
║    errorSimulator.isEnabled('name')   - Check if error is enabled             ║
║    errorSimulator.getError('name')    - Get error message if enabled          ║
║    errorSimulator.help()              - Show this help message                ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  CORRELATION METRICS (pairwise tables):                                       ║
║    'dtw', 'pearson' (pearson_correlation)                                     ║
║                                                                               ║
║  COMPARISON METRICS (single-value tables):                                    ║
║    'mae', 'rmse', 'euclidean', 'cosine' (cosine_similarity)                   ║
║                                                                               ║
║  STATISTICS (per-series):                                                     ║
║    'mean', 'median', 'variance', 'std_dev', 'autocorrelation'                 ║
║                                                                               ║
║  CHART FEATURES:                                                              ║
║    'ma' (moving_average)  - Moving Average overlay on standard chart          ║
║    'diff' (difference_chart) - Difference chart view                          ║
║                                                                               ║
║  PLUGINS:                                                                     ║
║    Use the plugin NAME (case-insensitive)                                     ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  NOTES:                                                                       ║
║    - Errors appear in UI alerts (above chart or in table headers)             ║
║    - Standard view and Diff view errors are independent                       ║
║    - After enabling/disabling, refresh page or change filters to apply        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);
  }
}

// Create singleton instance
export const errorSimulator = new ErrorSimulator();

// Make it globally available for console access
if (typeof window !== 'undefined') {
  (window as any).errorSimulator = errorSimulator;
  
  // Print help on first load if no errors are set
  if (errorSimulator.list().length === 0) {
    console.log('%c💡 Error Simulator available! Type: errorSimulator.help()', 'color: #fcce00; font-weight: bold;');
  }
}
