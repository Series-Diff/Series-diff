/**
 * Shared test helpers and utilities for dashboard E2E tests
 */
import { type Page, type Route, type Locator, expect } from '@playwright/test';

// ============================================================
// Metrics & Statistics Configuration
// ============================================================

/**
 * Statistics - single file metrics (shown in grouped Metrics component)
 */
export const STATISTICS = {
  mean: { key: 'mean', label: 'Mean', apiPattern: '**/api/timeseries/mean*', response: { mean: 42.5 } },
  median: { key: 'median', label: 'Median', apiPattern: '**/api/timeseries/median*', response: { median: 41.0 } },
  variance: { key: 'variance', label: 'Variance', apiPattern: '**/api/timeseries/variance*', response: { variance: 12.5 } },
  std_dev: { key: 'std_dev', label: 'Standard Deviation', apiPattern: '**/api/timeseries/standard_deviation*', response: { standard_deviation: 3.54 } },
  autocorrelation: { key: 'autocorrelation', label: 'Autocorrelation', apiPattern: '**/api/timeseries/autocorrelation*', response: { autocorrelation: 0.85 } },
} as const;

/**
 * Pairwise metrics - require 2+ files (shown in tables)
 */
export const PAIRWISE_METRICS = {
  pearson_correlation: { key: 'pearson_correlation', label: 'Pearson Correlation', apiPattern: '**/api/timeseries/pearson_correlation*', response: { pearson_correlation: 0.95 } },
  cosine_similarity: { key: 'cosine_similarity', label: 'Cosine Similarity', apiPattern: '**/api/timeseries/cosine_similarity*', response: { cosine_similarity: 0.98 } },
  mae: { key: 'mae', label: 'MAE', apiPattern: '**/api/timeseries/mae*', response: { mae: 2.3 } },
  rmse: { key: 'rmse', label: 'RMSE', apiPattern: '**/api/timeseries/rmse*', response: { rmse: 3.1 } },
  dtw: { key: 'dtw', label: 'DTW', apiPattern: '**/api/timeseries/dtw*', response: { dtw_distance: 15.2 } },
  euclidean: { key: 'euclidean', label: 'Euclidean', apiPattern: '**/api/timeseries/euclidean*', response: { euclidean_distance: 8.5 } },
} as const;

/**
 * Special metrics (MA, Diff Chart)
 */
export const SPECIAL_METRICS = {
  moving_average: { key: 'moving_average', label: 'Moving Average', apiPattern: '**/api/timeseries/rolling_mean*', response: {} },
  difference_chart: { key: 'difference_chart', label: 'Difference Chart', apiPattern: null, response: null },
} as const;

export type StatisticKey = keyof typeof STATISTICS;
export type PairwiseMetricKey = keyof typeof PAIRWISE_METRICS;
export type SpecialMetricKey = keyof typeof SPECIAL_METRICS;
export type AllMetricKeys = StatisticKey | PairwiseMetricKey | SpecialMetricKey;

/**
 * All available metric keys for modal selection
 */
export const ALL_METRIC_KEYS: AllMetricKeys[] = [
  ...Object.keys(STATISTICS) as StatisticKey[],
  ...Object.keys(PAIRWISE_METRICS) as PairwiseMetricKey[],
  ...Object.keys(SPECIAL_METRICS) as SpecialMetricKey[],
];

// ============================================================
// UI Selectors for Metrics & Statistics
// ============================================================

/**
 * Selectors for statistics values and spinners in grouped Metrics component
 */
export const STATISTIC_SELECTORS = {
  // Main statistics container
  statisticsContainer: '[data-testid="statistics-container"], .metrics-container',
  // Main spinner for statistics (shown before any stat loads)
  statisticsMainSpinner: '[data-testid="statistics-spinner"], .metrics-container .spinner-border',
  
  // Individual statistic selectors
  mean: {
    value: '[data-testid="stat-mean-value"], :text("Mean:") + span',
    spinner: '[data-testid="stat-mean-spinner"]',
    error: '[data-testid="stat-mean-error"]',
    container: '[data-testid="stat-mean"], :has-text("Mean:")',
  },
  median: {
    value: '[data-testid="stat-median-value"], :text("Median:") + span',
    spinner: '[data-testid="stat-median-spinner"]',
    error: '[data-testid="stat-median-error"]',
    container: '[data-testid="stat-median"], :has-text("Median:")',
  },
  variance: {
    value: '[data-testid="stat-variance-value"], :text("Variance:") + span',
    spinner: '[data-testid="stat-variance-spinner"]',
    error: '[data-testid="stat-variance-error"]',
    container: '[data-testid="stat-variance"], :has-text("Variance:")',
  },
  std_dev: {
    value: '[data-testid="stat-stddev-value"], :text("Standard deviation:") + span',
    spinner: '[data-testid="stat-stddev-spinner"]',
    error: '[data-testid="stat-stddev-error"]',
    container: '[data-testid="stat-stddev"], :has-text("Standard deviation:")',
  },
  autocorrelation: {
    value: '[data-testid="stat-autocorrelation-value"], :text("Autocorrelation:") + span',
    spinner: '[data-testid="stat-autocorrelation-spinner"]',
    error: '[data-testid="stat-autocorrelation-error"]',
    container: '[data-testid="stat-autocorrelation"], :has-text("Autocorrelation:")',
  },
} as const;

/**
 * Selectors for pairwise metric tables
 */
export const METRIC_TABLE_SELECTORS = {
  pearson_correlation: {
    table: '[data-testid="table-pearson"], .card:has-text("Pearson Correlation")',
    spinner: '[data-testid="table-pearson-spinner"], .card:has-text("Pearson Correlation") .spinner-border',
    error: '[data-testid="table-pearson-error"], .card:has-text("Pearson Correlation") .alert-danger',
    values: '[data-testid="table-pearson"] td, .card:has-text("Pearson Correlation") td',
  },
  cosine_similarity: {
    table: '[data-testid="table-cosine"], .card:has-text("Cosine Similarity")',
    spinner: '[data-testid="table-cosine-spinner"], .card:has-text("Cosine Similarity") .spinner-border',
    error: '[data-testid="table-cosine-error"], .card:has-text("Cosine Similarity") .alert-danger',
    values: '[data-testid="table-cosine"] td, .card:has-text("Cosine Similarity") td',
  },
  mae: {
    table: '[data-testid="table-mae"], .card:has-text("MAE")',
    spinner: '[data-testid="table-mae-spinner"], .card:has-text("MAE") .spinner-border',
    error: '[data-testid="table-mae-error"], .card:has-text("MAE") .alert-danger',
    values: '[data-testid="table-mae"] td, .card:has-text("MAE") td',
  },
  rmse: {
    table: '[data-testid="table-rmse"], .card:has-text("RMSE")',
    spinner: '[data-testid="table-rmse-spinner"], .card:has-text("RMSE") .spinner-border',
    error: '[data-testid="table-rmse-error"], .card:has-text("RMSE") .alert-danger',
    values: '[data-testid="table-rmse"] td, .card:has-text("RMSE") td',
  },
  dtw: {
    table: '[data-testid="table-dtw"], .card:has-text("DTW")',
    spinner: '[data-testid="table-dtw-spinner"], .card:has-text("DTW") .spinner-border',
    error: '[data-testid="table-dtw-error"], .card:has-text("DTW") .alert-danger',
    values: '[data-testid="table-dtw"] td, .card:has-text("DTW") td',
  },
  euclidean: {
    table: '[data-testid="table-euclidean"], .card:has-text("Euclidean")',
    spinner: '[data-testid="table-euclidean-spinner"], .card:has-text("Euclidean") .spinner-border',
    error: '[data-testid="table-euclidean-error"], .card:has-text("Euclidean") .alert-danger',
    values: '[data-testid="table-euclidean"] td, .card:has-text("Euclidean") td',
  },
} as const;

/**
 * Selectors for plugins section
 */
export const PLUGIN_SELECTORS = {
  pluginsSection: '[data-testid="plugins-section"], .section-container:has-text("Plugins")',
  pluginTable: (pluginName: string) => `[data-testid="plugin-${pluginName}"], .card:has-text("${pluginName}")`,
  pluginSpinner: (pluginName: string) => `[data-testid="plugin-${pluginName}-spinner"], .card:has-text("${pluginName}") .spinner-border`,
  pluginError: (pluginName: string) => `[data-testid="plugin-${pluginName}-error"], .card:has-text("${pluginName}") .alert-danger`,
} as const;

/**
 * Selectors for MA and Diff Chart
 */
export const SPECIAL_SELECTORS = {
  movingAverage: {
    toggle: '#ma-toggle',
    container: '[data-testid="ma-container"], .ma-controls',
    input: '[placeholder="e.g. 1d"]',
    applyButton: 'button:has-text("Set")',
    error: '[data-testid="ma-error"], .alert:has-text("Moving Average")',
    // NOTE: Current UI bug - MA toggle hides too much of the component. Update selector after fix.
    componentContainer: '.section-container:has(#ma-toggle)',
  },
  differenceChart: {
    switchButton: 'button:has-text("Switch to Difference Chart")',
    switchBackButton: 'button:has-text("Switch to Standard Chart")',
    toleranceInput: '[data-testid="tolerance-input"], input[placeholder*="tolerance"]',
    error: '[data-testid="diff-error"], .text-center:has-text("Unable to render")',
  },
} as const;

// ============================================================
// Test Data
// ============================================================

export const MULTI_FILE_TEST_DATA = {
  "2025-01-15T08:00:00Z": {
    "Temperature": { "SensorA.csv": 21.5, "SensorB.csv": 22.3 },
    "Humidity": { "SensorA.csv": 45.2, "SensorB.csv": 48.5 }
  },
  "2025-01-15T08:15:00Z": {
    "Temperature": { "SensorA.csv": 21.8, "SensorB.csv": 22.1 },
    "Humidity": { "SensorA.csv": 44.8, "SensorB.csv": 48.2 }
  },
  "2025-01-15T08:30:00Z": {
    "Temperature": { "SensorA.csv": 22.1, "SensorB.csv": 22.5 },
    "Humidity": { "SensorA.csv": 44.5, "SensorB.csv": 47.9 }
  }
};

export const SINGLE_FILE_TEST_DATA = {
  "2025-01-15T08:00:00Z": {
    "Temperature": { "SensorA.csv": 21.5 }
  },
  "2025-01-15T08:15:00Z": {
    "Temperature": { "SensorA.csv": 21.8 }
  }
};

export const NON_OVERLAPPING_TEST_DATA = {
  "2025-01-01T00:00:00Z": {
    "Temperature": { "SensorA.csv": 21.5 }
  },
  "2025-01-15T00:00:00Z": {
    "Temperature": { "SensorB.csv": 22.5 }
  }
};

/**
 * Large test data for storage quota tests
 */
export function generateLargeTestData(numTimestamps: number = 10000): Record<string, Record<string, Record<string, number>>> {
  const data: Record<string, Record<string, Record<string, number>>> = {};
  const baseTime = new Date('2025-01-01T00:00:00Z').getTime();
  
  for (let i = 0; i < numTimestamps; i++) {
    const timestamp = new Date(baseTime + i * 60000).toISOString(); // 1 minute intervals
    data[timestamp] = {
      "Temperature": { 
        "SensorA.csv": 20 + Math.random() * 10, 
        "SensorB.csv": 20 + Math.random() * 10 
      },
      "Humidity": { 
        "SensorA.csv": 40 + Math.random() * 20, 
        "SensorB.csv": 40 + Math.random() * 20 
      }
    };
  }
  return data;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert mock data to localStorage chart format
 */
export function convertToChartData(mockData: Record<string, Record<string, Record<string, number>>>) {
  const chartData: Record<string, Array<{x: string, y: number}>> = {};
  const filenamesPerCategory: Record<string, string[]> = {};
  
  for (const [timestamp, categories] of Object.entries(mockData)) {
    for (const [category, files] of Object.entries(categories)) {
      if (!filenamesPerCategory[category]) {
        filenamesPerCategory[category] = [];
      }
      for (const [filename, value] of Object.entries(files)) {
        const key = `${category}.${filename}`;
        if (!chartData[key]) {
          chartData[key] = [];
        }
        chartData[key].push({ x: timestamp, y: value });
        if (!filenamesPerCategory[category].includes(filename)) {
          filenamesPerCategory[category].push(filename);
        }
      }
    }
  }
  
  // Sort by timestamp
  for (const key of Object.keys(chartData)) {
    chartData[key].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  }
  
  return { chartData, filenamesPerCategory };
}

/**
 * Set up all metric API mocks with optional delays
 */
export async function setupMetricMocksWithDelays(
  page: Page, 
  delays: Record<string, number> = {}
) {
  const endpoints = [
    { pattern: '**/api/timeseries/mean*', response: { mean: 42.5 }, key: 'mean' },
    { pattern: '**/api/timeseries/median*', response: { median: 41.0 }, key: 'median' },
    { pattern: '**/api/timeseries/variance*', response: { variance: 12.5 }, key: 'variance' },
    { pattern: '**/api/timeseries/standard_deviation*', response: { standard_deviation: 3.54 }, key: 'std_dev' },
    { pattern: '**/api/timeseries/autocorrelation*', response: { autocorrelation: 0.85 }, key: 'autocorrelation' },
    { pattern: '**/api/timeseries/pearson_correlation*', response: { pearson_correlation: 0.95 }, key: 'pearson' },
    { pattern: '**/api/timeseries/cosine_similarity*', response: { cosine_similarity: 0.98 }, key: 'cosine' },
    { pattern: '**/api/timeseries/dtw*', response: { dtw_distance: 15.2 }, key: 'dtw' },
    { pattern: '**/api/timeseries/euclidean*', response: { euclidean_distance: 8.5 }, key: 'euclidean' },
    { pattern: '**/api/timeseries/mae*', response: { mae: 2.3 }, key: 'mae' },
    { pattern: '**/api/timeseries/rmse*', response: { rmse: 3.1 }, key: 'rmse' },
  ];

  for (const { pattern, response, key } of endpoints) {
    const delay = delays[key] || 0;
    await page.route(pattern, async (route: Route) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      await route.fulfill({ json: response });
    });
  }
}

/**
 * Clear all localStorage and sessionStorage
 */
export async function clearAllStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set up localStorage with test data
 */
export async function setupLocalStorageWithData(page: Page, mockData: Record<string, Record<string, Record<string, number>>>) {
  const { chartData, filenamesPerCategory } = convertToChartData(mockData);
  await page.evaluate(({ chartData, filenamesPerCategory }) => {
    localStorage.setItem('chartData', JSON.stringify(chartData));
    localStorage.setItem('filenamesPerCategory', JSON.stringify(filenamesPerCategory));
    localStorage.setItem('selectedCategory', Object.keys(filenamesPerCategory)[0] || '');
  }, { chartData, filenamesPerCategory });
}

/**
 * Safe page reload with retries to handle intermittent dev server connection resets
 */
export async function safeReload(page: Page, attempts: number = 3) {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      return;
    } catch (e) {
      lastError = e;
      console.warn(`safeReload attempt ${i + 1} failed:`, e);
      await page.waitForTimeout(1000 * (i + 1));
    }
  }
  throw lastError;
}

/**
 * Safe page navigation with retries to handle intermittent dev server resets
 */
export async function safeGoto(page: Page, path: string = '/', attempts: number = 3) {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(path, { waitUntil: 'load', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      return;
    } catch (e) {
      lastError = e;
      console.warn(`safeGoto attempt ${i + 1} failed:`, e);
      await page.waitForTimeout(1000 * (i + 1));
    }
  }
  throw lastError;
}

/**
 * Setup metric mocks that fail with errors
 */
export async function setupMetricMocksWithErrors(
  page: Page,
  failingMetrics: string[],
  errorStatus: number = 500
) {
  const allEndpoints = [
    { pattern: '**/api/timeseries/mean*', response: { mean: 42.5 }, key: 'mean' },
    { pattern: '**/api/timeseries/median*', response: { median: 41.0 }, key: 'median' },
    { pattern: '**/api/timeseries/variance*', response: { variance: 12.5 }, key: 'variance' },
    { pattern: '**/api/timeseries/standard_deviation*', response: { standard_deviation: 3.54 }, key: 'std_dev' },
    { pattern: '**/api/timeseries/autocorrelation*', response: { autocorrelation: 0.85 }, key: 'autocorrelation' },
    { pattern: '**/api/timeseries/pearson_correlation*', response: { pearson_correlation: 0.95 }, key: 'pearson_correlation' },
    { pattern: '**/api/timeseries/cosine_similarity*', response: { cosine_similarity: 0.98 }, key: 'cosine_similarity' },
    { pattern: '**/api/timeseries/dtw*', response: { dtw_distance: 15.2 }, key: 'dtw' },
    { pattern: '**/api/timeseries/euclidean*', response: { euclidean_distance: 8.5 }, key: 'euclidean' },
    { pattern: '**/api/timeseries/mae*', response: { mae: 2.3 }, key: 'mae' },
    { pattern: '**/api/timeseries/rmse*', response: { rmse: 3.1 }, key: 'rmse' },
    { pattern: '**/api/plugins/execute*', response: { result: 100 }, key: 'plugin' },
  ];

  for (const { pattern, response, key } of allEndpoints) {
    await page.route(pattern, async (route: Route) => {
      if (failingMetrics.includes(key)) {
        await route.fulfill({ 
          status: errorStatus, 
          json: { error: `${key} calculation failed` } 
        });
      } else {
        await route.fulfill({ json: response });
      }
    });
  }
}

/**
 * Setup mock for individual metric with specific delay and response
 */
export async function setupSingleMetricMock(
  page: Page,
  metricKey: StatisticKey | PairwiseMetricKey,
  options: {
    delay?: number;
    fail?: boolean;
    failStatus?: number;
    customResponse?: Record<string, unknown>;
  } = {}
) {
  const metricConfig = STATISTICS[metricKey as StatisticKey] || PAIRWISE_METRICS[metricKey as PairwiseMetricKey];
  if (!metricConfig) {
    throw new Error(`Unknown metric: ${metricKey}`);
  }

  await page.route(metricConfig.apiPattern, async (route: Route) => {
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
    if (options.fail) {
      await route.fulfill({ 
        status: options.failStatus || 500, 
        json: { error: `${metricKey} calculation failed` } 
      });
    } else {
      await route.fulfill({ json: options.customResponse || metricConfig.response });
    }
  });
}

/**
 * Wait for all spinners to disappear
 */
export async function waitForAllSpinnersToDisappear(page: Page, timeout: number = 10000) {
  await expect(page.locator('.spinner-border')).toHaveCount(0, { timeout });
}

/**
 * Verify statistic displays correct value
 */
export async function verifyStatisticValue(
  page: Page,
  statisticKey: StatisticKey,
  expectedValue?: number
) {
  const selector = STATISTIC_SELECTORS[statisticKey];
  const container = page.locator(selector.container).first();
  await expect(container).toBeVisible({ timeout: 5000 });
  
  if (expectedValue !== undefined) {
    await expect(container).toContainText(expectedValue.toString());
  }
}

/**
 * Verify metric table displays correctly
 */
export async function verifyMetricTable(
  page: Page,
  metricKey: PairwiseMetricKey
) {
  const selector = METRIC_TABLE_SELECTORS[metricKey];
  const table = page.locator(selector.table).first();
  await expect(table).toBeVisible({ timeout: 5000 });
}

/**
 * Setup metrics selection in localStorage
 */
export async function setupMetricsSelection(
  page: Page,
  enabledMetrics: AllMetricKeys[]
) {
  await page.evaluate((metrics) => {
    localStorage.setItem('visibleMetrics', JSON.stringify(metrics));
  }, enabledMetrics);
}

/**
 * Setup with all metrics disabled except specified ones
 */
export async function setupOnlySelectedMetrics(
  page: Page,
  enabledMetrics: AllMetricKeys[]
) {
  await page.evaluate((metrics) => {
    localStorage.setItem('visibleMetrics', JSON.stringify(metrics));
  }, enabledMetrics);
}

/**
 * Get localStorage usage info
 */
export async function getStorageInfo(page: Page): Promise<{
  used: number;
  available: number;
  items: Record<string, number>;
}> {
  return page.evaluate(() => {
    let totalSize = 0;
    const items: Record<string, number> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([key + value]).size;
        items[key] = size;
        totalSize += size;
      }
    }
    
    return {
      used: totalSize,
      available: 5 * 1024 * 1024 - totalSize, // 5MB typical limit
      items
    };
  });
}

/**
 * Setup plugins mock
 */
export async function setupPluginsMock(
  page: Page,
  plugins: Array<{ name: string; code: string }> = []
) {
  await page.route('**/api/plugins*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: { plugins } });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newPlugin = { name: body.name, code: body.code };
      plugins.push(newPlugin);
      await route.fulfill({ json: { success: true, plugin: newPlugin } });
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { success: true } });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/plugins/execute*', async (route: Route) => {
    await route.fulfill({ json: { result: 99.9 } });
  });
}

/**
 * Verify error alert is shown for a specific metric
 */
export async function verifyMetricError(
  page: Page,
  metricType: 'statistic' | 'pairwise' | 'plugin',
  metricKey: string
) {
  let errorSelector: string;
  
  if (metricType === 'statistic') {
    errorSelector = STATISTIC_SELECTORS[metricKey as StatisticKey]?.error || '';
  } else if (metricType === 'pairwise') {
    errorSelector = METRIC_TABLE_SELECTORS[metricKey as PairwiseMetricKey]?.error || '';
  } else {
    errorSelector = PLUGIN_SELECTORS.pluginError(metricKey);
  }
  
  if (errorSelector) {
    await expect(page.locator(errorSelector).first()).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Setup rolling mean (MA) mock
 */
export async function setupRollingMeanMock(
  page: Page,
  options: { delay?: number; fail?: boolean } = {}
) {
  await page.route('**/api/timeseries/rolling_mean*', async (route: Route) => {
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
    if (options.fail) {
      await route.fulfill({ 
        status: 400, 
        json: { error: 'Invalid window parameter' } 
      });
    } else {
      // Return rolling mean data based on request
      await route.fulfill({ 
        json: { 
          rolling_mean: [
            { timestamp: '2025-01-15T08:00:00Z', value: 21.5 },
            { timestamp: '2025-01-15T08:15:00Z', value: 21.65 },
            { timestamp: '2025-01-15T08:30:00Z', value: 21.8 },
          ]
        } 
      });
    }
  });
}

// ============================================================
// Modal Selection Helpers
// ============================================================

/**
 * Select/deselect metrics in the selection modal
 */
export async function toggleMetricInModal(
  page: Page,
  metricKey: AllMetricKeys,
  enabled: boolean
) {
  // Find the checkbox/switch for the metric
  const metricLabel = getMetricLabel(metricKey);
  const row = page.locator(`.modal-body`).locator(`text=${metricLabel}`).locator('..').locator('..');
  const checkbox = row.locator('input[type="checkbox"]').first();
  
  // Scroll into view before clicking
  await checkbox.evaluate(element => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(300);
  
  const isChecked = await checkbox.isChecked();
  if (isChecked !== enabled) {
    await checkbox.click();
  }
}

/**
 * Get display label for a metric
 */
export function getMetricLabel(metricKey: AllMetricKeys): string {
  if (metricKey in STATISTICS) {
    return STATISTICS[metricKey as StatisticKey].label;
  }
  if (metricKey in PAIRWISE_METRICS) {
    return PAIRWISE_METRICS[metricKey as PairwiseMetricKey].label;
  }
  if (metricKey in SPECIAL_METRICS) {
    return SPECIAL_METRICS[metricKey as SpecialMetricKey].label;
  }
  return metricKey;
}

/**
 * Open metrics selection modal and perform actions
 */
export async function openMetricsModalAndSelect(
  page: Page,
  metricsToEnable: AllMetricKeys[],
  metricsToDisable: AllMetricKeys[] = []
) {
  // Click settings/gear button to open modal
  const settingsButton = page.locator('[data-testid="metrics-settings-btn"], button:has(.fa-cog), button:has(.fa-gear)').first();
  await settingsButton.evaluate(element => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(300);
  await settingsButton.click();
  await expect(page.locator('.modal.show')).toBeVisible({ timeout: 3000 });
  
  // Enable specified metrics
  for (const metric of metricsToEnable) {
    await toggleMetricInModal(page, metric, true);
  }
  
  // Disable specified metrics
  for (const metric of metricsToDisable) {
    await toggleMetricInModal(page, metric, false);
  }
  
  // Apply and close
  const applyButton = page.locator('.modal-footer button:has-text("Apply")');
  await applyButton.evaluate(element => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(300);
  await applyButton.click();
  await expect(page.locator('.modal.show')).not.toBeVisible({ timeout: 3000 });
}

/**
 * Scroll an element into view and then assert its visibility.
 * Useful for metrics that require scrolling to see in videos/traces.
 */
export async function expectVisibleAfterScroll(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate(element => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(300);
  await expect(locator).toBeVisible();
}

/**
 * Scroll an element into view and click it. Keeps click options support for timeouts, etc.
 */
export async function clickAfterScroll(
  page: Page,
  locator: Locator,
  options?: Parameters<Locator['click']>[0]
): Promise<void> {
  // Wait for element to be visible/attached before scrolling - reduces flakes
  try {
    await locator.waitFor({ state: 'visible', timeout: (options as any)?.timeout || 10000 });
  } catch (e) {
    // If not visible, fall back to attached state
    await locator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  }
  await locator.evaluate(element => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(300);
  await locator.click(options);
}
