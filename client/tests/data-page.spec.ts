/**
 * Data Page Tests
 * Tests the data page functionality for viewing uploaded time series data.
 */
import { test, expect } from '@playwright/test';
import { DataPage, MOCK_SENSOR_DATA, MOCK_RZ_DATA } from './pages';

test.describe('Data Page', () => {
  let dataPage: DataPage;

  test.beforeEach(async ({ page }) => {
    dataPage = new DataPage(page);
    await dataPage.setupMocks();
    // Go to page first to create browser context
    await dataPage.goto();
    // Set up test data in localStorage
    await dataPage.setupTestData(MOCK_SENSOR_DATA);
    // Reload to pick up localStorage data
    await page.reload();
    await dataPage.hideWebpackOverlay();
  });

  test('should display available files', async ({ page }) => {
    // Based on MOCK_SENSOR_DATA: Sensor_200308.csv, Sensor_200309.csv appear as file buttons
    await expect(page.getByRole('button', { name: /Sensor_200308/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sensor_200309/i })).toBeVisible();
  });

  test('should display data table for selected file', async ({ page }) => {
    const dataPage = new DataPage(page);
    // Click on a file button (use clickAfterScroll)
    const fileButton = page.getByRole('button', { name: /Sensor_200308/i });
    await dataPage.clickAfterScroll(fileButton);
    
    // Check table shows data - verify category columns exist
    await expect(page.getByRole('columnheader', { name: /temperature/i })).toBeVisible();
    
    // Check values from mock data are displayed
    await expect(page.getByText('45.04')).toBeVisible();
  });

  test('should handle RZ data format', async ({ page }) => {
    // Clear existing data and set up with RZ data
    await page.evaluate(() => {
      localStorage.removeItem('chartData');
      localStorage.removeItem('filenamesPerCategory');
    });
    await dataPage.setupTestData(MOCK_RZ_DATA);
    await page.reload();
    await dataPage.hideWebpackOverlay();
    await page.waitForTimeout(500); // Wait for data to load

    // Check for RZ sensor file names in the sidebar buttons
    // The files are RZ3221102.csv and RZ3221108.csv, displayed as buttons
    await expect(page.getByRole('button', { name: /RZ3221102/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /RZ3221108/i })).toBeVisible();
  });

  // TODO: Uncomment when Data page UI is updated to show proper empty state message
  // test('should show message when no data is loaded', async ({ page }) => {
  //   await dataPage.setupEmptyDataMock();
  //   await page.reload();
  //   await dataPage.expectEmptyState();
  // });
});
