/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

// Sample test data based on actual sensor readings
const MOCK_SENSOR_DATA = {
  "2025-11-30T00:01:33.000Z": {
    "Sensor_200308": { "temperature": 45.04, "humidity": 2.25, "pressure": 19.40 },
    "Sensor_200309": { "temperature": 52.89, "humidity": 3.14, "pressure": 20.60 }
  },
  "2025-11-30T00:04:33.000Z": {
    "Sensor_200308": { "temperature": 45.03, "humidity": 2.25, "pressure": 19.40 },
    "Sensor_200309": { "temperature": 52.84, "humidity": 3.14, "pressure": 20.60 }
  },
  "2025-11-30T00:07:33.000Z": {
    "Sensor_200308": { "temperature": 45.01, "humidity": 2.25, "pressure": 19.40 },
    "Sensor_200309": { "temperature": 52.78, "humidity": 3.14, "pressure": 20.60 }
  }
};

const MOCK_RZ_DATA = {
  "2025-01-15T08:00:00Z": {
    "RZ3221102": { "Bridge.temperature": 21.5, "Bridge.humidity": 45.2, "Bridge.pressure": 1013.25 },
    "RZ3221108": { "Bridge.temperature": 20.8, "Bridge.humidity": 48.5, "Bridge.pressure": 1012.80 }
  },
  "2025-01-15T08:15:00Z": {
    "RZ3221102": { "Bridge.temperature": 21.8, "Bridge.humidity": 44.8, "Bridge.pressure": 1013.30 },
    "RZ3221108": { "Bridge.temperature": 21.0, "Bridge.humidity": 48.2, "Bridge.pressure": 1012.85 }
  },
  "2025-01-15T08:30:00Z": {
    "RZ3221102": { "Bridge.temperature": 22.1, "Bridge.humidity": 44.5, "Bridge.pressure": 1013.35 },
    "RZ3221108": { "Bridge.temperature": 21.2, "Bridge.humidity": 47.9, "Bridge.pressure": 1012.90 }
  }
};

test.describe('Data Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API with sensor data
    await page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: MOCK_SENSOR_DATA });
    });

    await page.goto('/data');
    
    // Hide webpack overlay that might block clicks
    await page.addStyleTag({ content: '#webpack-dev-server-client-overlay { display: none !important; }' });
  });

  test('should display available files', async ({ page }) => {
    // Based on MOCK_SENSOR_DATA: Sensor_200308, Sensor_200309
    await expect(page.getByRole('button', { name: /temperature/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /humidity/i })).toBeVisible();
  });

  test('should display data table for selected file', async ({ page }) => {
    // Click on temperature data
    await page.getByRole('button', { name: /temperature/i }).first().click();
    
    // Check table shows sensor data
    await expect(page.getByRole('columnheader', { name: /Sensor_200308/i })).toBeVisible();
    
    // Check values from mock data
    await expect(page.getByRole('cell', { name: '45.04' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '45.03' })).toBeVisible();
  });

  test('should handle RZ data format', async ({ page }) => {
    // Mock API with RZ data format
    await page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: MOCK_RZ_DATA });
    });

    await page.reload();

    // Check for RZ sensor names
    await expect(page.getByText(/RZ3221102/)).toBeVisible();
    await expect(page.getByText(/RZ3221108/)).toBeVisible();
  });

  // TODO: Uncomment when Data page UI is updated to show proper empty state message
  // test('should show message when no data is loaded', async ({ page }) => {
  //   // Mock empty data
  //   await page.route('**/api/timeseries', async route => {
  //     await route.fulfill({ json: {} });
  //   });
  //
  //   await page.reload();
  //
  //   // Verify message is displayed
  //   await expect(page.getByText(/no data/i)).toBeVisible();
  // });
});
