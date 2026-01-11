/**
 * Dashboard Page Object Model.
 * Contains locators and methods for interacting with the Dashboard page.
 */
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Category selection
  readonly categoryDropdown: Locator;
  readonly secondaryCategoryDropdown: Locator;

  // Chart elements
  readonly chartContainer: Locator;
  readonly plotlyChart: Locator;

  // Mode switching
  readonly switchToDifferenceButton: Locator;
  readonly switchToStandardButton: Locator;

  // Moving average controls
  readonly movingAvgToggle: Locator;
  readonly movingAvgInput: Locator;
  readonly applyButton: Locator;

  // Data controls
  readonly resetButton: Locator;
  readonly uploadButton: Locator;

  // Messages
  readonly emptyStateMessage: Locator;
  readonly rateLimitMessage: Locator;
  readonly differenceRequiresFilesMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Category selection
    this.categoryDropdown = page.locator('select#category-select');
    this.secondaryCategoryDropdown = page.locator('select').nth(1);

    // Chart elements
    this.chartContainer = page.locator('.Chart-container');
    this.plotlyChart = page.locator('.js-plotly-plot');

    // Mode switching
    this.switchToDifferenceButton = page.getByRole('button', { name: 'Switch to Difference Chart' });
    this.switchToStandardButton = page.getByRole('button', { name: 'Switch to Standard Chart' });

    // Moving average controls
    this.movingAvgToggle = page.locator('#ma-toggle');
    this.movingAvgInput = page.getByPlaceholder('e.g. 1d');
    this.applyButton = page.getByRole('button', { name: /Set/i }).first();

    // Data controls
    this.resetButton = page.getByRole('button', { name: /Reset Data/i });
    this.uploadButton = page.locator('label[for="file-upload"]');

    // Messages
    this.emptyStateMessage = page.getByText(/Load data to visualize|No data to display/i);
    this.rateLimitMessage = page.getByText(/rate limit/i);
    this.differenceRequiresFilesMessage = page.getByText('Difference chart requires at least 2 files');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.hideWebpackOverlay();
  }

  /**
   * Set up standard mock routes for dashboard API calls.
   */
  async setupMocks(data?: Record<string, unknown>): Promise<void> {
    const mockData = data ?? {
      "2023-01-01T00:00:00": {
        "Category A": { "file1.csv": 10 },
        "Category B": { "file2.csv": 15 }
      },
      "2023-01-02T00:00:00": {
        "Category A": { "file1.csv": 20 }
      }
    };

    await this.page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: mockData });
    });

    // Mock metric endpoints
    await this.page.route('**/api/timeseries/mean*', async route => 
      route.fulfill({ json: { mean: 0 } }));
    await this.page.route('**/api/timeseries/variance*', async route => 
      route.fulfill({ json: { variance: 0 } }));
    await this.page.route('**/api/timeseries/median*', async route => 
      route.fulfill({ json: { median: 0 } }));
    await this.page.route('**/api/timeseries/standard_deviation*', async route => 
      route.fulfill({ json: { standard_deviation: 0 } }));
    await this.page.route('**/api/timeseries/autocorrelation*', async route => 
      route.fulfill({ json: { autocorrelation: 0 } }));
    await this.page.route('**/api/timeseries/pearson_correlation*', async route => 
      route.fulfill({ json: { pearson_correlation: 0 } }));
    await this.page.route('**/api/timeseries/cosine_similarity*', async route => 
      route.fulfill({ json: { cosine_similarity: 0 } }));
    await this.page.route('**/api/timeseries/dtw*', async route => 
      route.fulfill({ json: { dtw_distance: 0 } }));
  }

  /**
   * Set up mock for empty data response.
   */
  async setupEmptyDataMock(): Promise<void> {
    await this.page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: {} });
    });
  }

  /**
   * Set up mock for clear-timeseries endpoint.
   */
  async setupClearTimeseriesMock(options?: { status?: number; body?: string }): Promise<void> {
    const { status = 200, body = 'OK' } = options ?? {};
    await this.page.route('**/api/clear-timeseries', async route => {
      await route.fulfill({ status, body });
    });
  }

  /**
   * Select a category from the dropdown.
   */
  async selectCategory(categoryName: string): Promise<void> {
    await this.categoryDropdown.selectOption({ label: categoryName });
  }

  /**
   * Open metrics selection modal.
   */
  async openMetricsSelectionModal(): Promise<Locator> {
    const selectMetricsButton = this.page.getByRole('button', { name: /Select Metrics/i });
    await this.clickAfterScroll(selectMetricsButton);
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();
    return modal;
  }

  /**
   * Switch to difference chart mode.
   */
  async switchToDifferenceMode(): Promise<void> {
    await this.clickAfterScroll(this.switchToDifferenceButton);
  }

  /**
   * Switch to standard chart mode.
   */
  async switchToStandardMode(): Promise<void> {
    await this.clickAfterScroll(this.switchToStandardButton);
  }

  /**
   * Enable moving average and set window.
   */
  async enableMovingAverage(window: string): Promise<void> {
    await this.scrollIntoView(this.movingAvgToggle);
    await this.movingAvgToggle.check();
    await this.scrollIntoView(this.movingAvgInput);
    await this.movingAvgInput.fill(window);
    await this.clickAfterScroll(this.applyButton);
  }

  /**
   * Reset dashboard data.
   */
  async resetData(): Promise<void> {
    await this.clickAfterScroll(this.resetButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify chart is visible.
   */
  async expectChartVisible(): Promise<void> {
    await this.expectVisibleAfterScroll(this.chartContainer);
    await this.expectVisibleAfterScroll(this.plotlyChart);
  }

  /**
   * Verify empty state is displayed.
   */
  async expectEmptyState(): Promise<void> {
    await this.expectVisibleAfterScroll(this.emptyStateMessage);
  }

  /**
   * Verify difference mode is active.
   */
  async expectDifferenceMode(): Promise<void> {
    await this.expectVisibleAfterScroll(this.switchToStandardButton);
  }

  /**
   * Verify standard mode is active.
   */
  async expectStandardMode(): Promise<void> {
    await this.expectVisibleAfterScroll(this.switchToDifferenceButton);
  }

  /**
   * Set localStorage items for testing.
   */
  async setLocalStorage(items: Record<string, unknown>): Promise<void> {
    await this.page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }, items);
  }

  /**
   * Set up test data in localStorage format that the app expects.
   * This converts the simple mock format to the proper localStorage format.
   * 
   * @param mockData - API response format data { timestamp: { category: { filename: value } } }
   */
  async setupTestData(mockData: Record<string, Record<string, Record<string, number>>>): Promise<void> {
    // Convert to chartData format: { "Category.filename": [{x: timestamp, y: value}, ...] }
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
    
    // Sort each series by timestamp
    for (const key of Object.keys(chartData)) {
      chartData[key].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
    }
    
    await this.setLocalStorage({
      chartData,
      filenamesPerCategory,
      selectedCategory: Object.keys(filenamesPerCategory)[0] || ''
    });
  }

  /**
   * Get localStorage item value.
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Verify localStorage items have been cleared.
   */
  async expectLocalStorageCleared(keys: string[]): Promise<void> {
    for (const key of keys) {
      const value = await this.getLocalStorageItem(key);
      expect(value).toBeNull();
    }
  }

  /**
   * Verify localStorage items are preserved.
   */
  async expectLocalStoragePreserved(items: Record<string, string>): Promise<void> {
    for (const [key, expectedValue] of Object.entries(items)) {
      const value = await this.getLocalStorageItem(key);
      expect(value).toBe(expectedValue);
    }
  }
}
