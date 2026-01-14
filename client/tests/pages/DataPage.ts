/**
 * Data Page Object Model.
 * Contains locators and methods for interacting with the Data page.
 */
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

// Sample test data based on actual sensor readings
// Format: { timestamp: { category: { filename: value } } }
export const MOCK_SENSOR_DATA = {
  "2025-11-30T00:01:33.000Z": {
    "temperature": { "Sensor_200308.csv": 45.04, "Sensor_200309.csv": 52.89 },
    "humidity": { "Sensor_200308.csv": 2.25, "Sensor_200309.csv": 3.14 },
    "pressure": { "Sensor_200308.csv": 19.40, "Sensor_200309.csv": 20.60 }
  },
  "2025-11-30T00:04:33.000Z": {
    "temperature": { "Sensor_200308.csv": 45.03, "Sensor_200309.csv": 52.84 },
    "humidity": { "Sensor_200308.csv": 2.25, "Sensor_200309.csv": 3.14 },
    "pressure": { "Sensor_200308.csv": 19.40, "Sensor_200309.csv": 20.60 }
  },
  "2025-11-30T00:07:33.000Z": {
    "temperature": { "Sensor_200308.csv": 45.01, "Sensor_200309.csv": 52.78 },
    "humidity": { "Sensor_200308.csv": 2.25, "Sensor_200309.csv": 3.14 },
    "pressure": { "Sensor_200308.csv": 19.40, "Sensor_200309.csv": 20.60 }
  }
};

export const MOCK_RZ_DATA = {
  "2025-01-15T08:00:00Z": {
    "temperature": { "RZ3221102.csv": 21.5, "RZ3221108.csv": 20.8 },
    "humidity": { "RZ3221102.csv": 45.2, "RZ3221108.csv": 48.5 },
    "pressure": { "RZ3221102.csv": 1013.25, "RZ3221108.csv": 1012.80 }
  },
  "2025-01-15T08:15:00Z": {
    "temperature": { "RZ3221102.csv": 21.8, "RZ3221108.csv": 21.0 },
    "humidity": { "RZ3221102.csv": 44.8, "RZ3221108.csv": 48.2 },
    "pressure": { "RZ3221102.csv": 1013.30, "RZ3221108.csv": 1012.85 }
  },
  "2025-01-15T08:30:00Z": {
    "temperature": { "RZ3221102.csv": 22.1, "RZ3221108.csv": 21.2 },
    "humidity": { "RZ3221102.csv": 44.5, "RZ3221108.csv": 47.9 },
    "pressure": { "RZ3221102.csv": 1013.35, "RZ3221108.csv": 1012.90 }
  }
};

export class DataPage extends BasePage {
  // File/category buttons
  readonly temperatureButton: Locator;
  readonly humidityButton: Locator;
  readonly pressureButton: Locator;

  // Data table
  readonly dataTable: Locator;

  // Messages
  readonly noDataMessage: Locator;

  constructor(page: Page) {
    super(page);

    // File/category buttons
    this.temperatureButton = page.getByRole('button', { name: /temperature/i }).first();
    this.humidityButton = page.getByRole('button', { name: /humidity/i }).first();
    this.pressureButton = page.getByRole('button', { name: /pressure/i }).first();

    // Data table
    this.dataTable = page.locator('table');

    // Messages
    this.noDataMessage = page.getByText(/no data/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/data');
    await this.hideWebpackOverlay();
  }

  /**
   * Set up mock routes for data API calls.
   */
  async setupMocks(data?: Record<string, unknown>): Promise<void> {
    const mockData = data ?? MOCK_SENSOR_DATA;
    
    await this.page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: mockData });
    });
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
   * Set up test data in localStorage format that the app expects.
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
    
    await this.page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }, {
      chartData,
      filenamesPerCategory,
      selectedCategory: Object.keys(filenamesPerCategory)[0] || ''
    });
  }

  /**
   * Click on a data category button by name.
   */
  async selectCategory(categoryName: string): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(categoryName, 'i') }).first();
    await this.clickAfterScroll(button);
  }

  /**
   * Verify sensor is visible in the UI.
   */
  async expectSensorVisible(sensorName: string): Promise<void> {
    const sensor = this.page.getByText(new RegExp(sensorName));
    await this.expectVisibleAfterScroll(sensor);
  }

  /**
   * Verify column header exists in data table.
   */
  async expectColumnHeader(headerName: string): Promise<void> {
    const header = this.page.getByRole('columnheader', { name: new RegExp(headerName, 'i') });
    await this.expectVisibleAfterScroll(header);
  }

  /**
   * Verify cell value exists in data table.
   */
  async expectCellValue(value: string): Promise<void> {
    const cell = this.page.getByRole('cell', { name: value });
    await this.expectVisibleAfterScroll(cell);
  }

  /**
   * Verify empty state message is displayed.
   */
  async expectEmptyState(): Promise<void> {
    await this.expectVisibleAfterScroll(this.noDataMessage);
  }
}
