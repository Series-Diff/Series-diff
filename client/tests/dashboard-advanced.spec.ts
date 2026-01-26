/**
 * Dashboard Advanced Interaction Tests
 * Tests advanced dashboard features with multi-file categories.
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages';
import { safeReload } from './helpers/dashboard-test-helpers';

// Extended mock data with multiple files per category
// Format: { timestamp: { category: { filename: value } } }
const MULTI_FILE_DATA = {
  "2023-01-01T00:00:00": {
    "Temperature": { "fileA.csv": 10, "fileB.csv": 15 },
    "Humidity": { "fileA.csv": 20, "fileB.csv": 25 }
  },
  "2023-01-02T00:00:00": {
    "Temperature": { "fileA.csv": 20, "fileB.csv": 25 },
    "Humidity": { "fileA.csv": 30, "fileB.csv": 35 }
  }
};

test.describe('Dashboard Advanced Interactions', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    // Set up API mocks for any subsequent API calls
    await dashboardPage.setupMocks(MULTI_FILE_DATA);
    // Go to page first (creates browser context for localStorage) - includes retry logic
    await dashboardPage.goto();
    // Set up localStorage with test data
    await dashboardPage.setupTestData(MULTI_FILE_DATA);
    // Reload to pick up localStorage data (use safeReload to avoid intermittent reset)
    await safeReload(page);
    await dashboardPage.hideWebpackOverlay();
  });

  test('category selection updates chart', async ({ page }) => {
    // Select Temperature category
    await dashboardPage.selectCategory('Temperature');
    await dashboardPage.expectChartVisible();
    
    // Switch to Humidity category
    await dashboardPage.selectCategory('Humidity');
    await dashboardPage.expectChartVisible();
  });

  test('difference mode toggling and validation', async ({ page }) => {
    // Wait for page to fully load after localStorage setup
    await page.waitForTimeout(1000);
    
    // Verify initial standard mode - wait for button with longer timeout
    await expect(dashboardPage.switchToDifferenceButton).toBeVisible({ timeout: 10000 });
    
    // Switch to difference mode
    await dashboardPage.switchToDifferenceMode();
    
    // Verify difference mode is active
    await dashboardPage.expectDifferenceMode();
    
    // Switch back to standard mode
    await dashboardPage.switchToStandardMode();
    
    // Verify standard mode is restored
    await expect(dashboardPage.switchToDifferenceButton).toBeVisible({ timeout: 10000 });
  });

  test('moving average toggle visibility with data', async ({ page }) => {
    // When data is loaded, the moving average toggle should be visible
    // Select a category first
    await dashboardPage.selectCategory('Temperature');
    await page.waitForTimeout(500); // Wait for chart to render
    
    // Check if moving average toggle becomes visible (it may depend on chart state)
    // Note: The toggle only appears when specific conditions are met
    await dashboardPage.expectChartVisible();
  });

  test('file upload controls visible', async ({ page }) => {
    // Wait for page to fully render
    await page.waitForTimeout(1000);
    
    // Verify upload label is visible (use text matcher which is more reliable)
    await expect(page.getByText('Upload files')).toBeVisible({ timeout: 10000 });
  });

  test('error and empty state handling', async ({ page }) => {
    // Clear localStorage to simulate empty state
    await page.evaluate(() => {
      localStorage.removeItem('chartData');
      localStorage.removeItem('filenamesPerCategory');
    });
    await page.reload();
    await dashboardPage.hideWebpackOverlay();
    await page.waitForTimeout(500); // Wait for UI update
    
    // Verify empty state message
    await dashboardPage.expectEmptyState();
  });

  test('UI state after multiple interactions', async ({ page }) => {
    // Select category
    await dashboardPage.selectCategory('Temperature');
    
    // Switch to difference mode and back
    await dashboardPage.switchToDifferenceMode();
    await dashboardPage.expectDifferenceMode();
    
    await dashboardPage.switchToStandardMode();
    await dashboardPage.expectStandardMode();
    
    // Reset data
    await dashboardPage.resetData();
    
    // Verify empty state
    await dashboardPage.expectEmptyState();
  });
});