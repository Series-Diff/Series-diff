/**
 * Dashboard Interaction Tests
 * Tests dashboard interactions with mocked API data.
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages';

// Mock data for testing - will be converted to localStorage format
const MOCK_DATA = {
  "2023-01-01T00:00:00": {
    "Category A": { "file1.csv": 10 },
    "Category B": { "file2.csv": 15 }
  },
  "2023-01-02T00:00:00": {
    "Category A": { "file1.csv": 20 },
    "Category B": { "file2.csv": 25 }
  }
};

test.describe('Dashboard Interaction', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.setupMocks();
    // Go to page first to create browser context
    await dashboardPage.goto();
    // Set up test data in localStorage
    await dashboardPage.setupTestData(MOCK_DATA);
    // Reload to pick up localStorage data
    await page.reload();
    await dashboardPage.hideWebpackOverlay();
  });

  test('should display category selector when data is loaded', async ({ page }) => {
    // Wait for the page to fully load after localStorage setup
    await page.waitForTimeout(500);
    
    // Wait for the dropdown to be visible
    const dropdown = dashboardPage.categoryDropdown;
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    
    // Check if options are populated
    await expect(dropdown).toContainText('Category A');
    await expect(dropdown).toContainText('Category B');
  });

  test('should display chart when category is selected', async ({ page }) => {
    // Select 'Category A'
    await dashboardPage.selectCategory('Category A');

    // Verify chart is visible
    await dashboardPage.expectChartVisible();
  });
  
  test('should allow switching to difference mode', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(500);
    
    // Verify switch button is visible with increased timeout
    await expect(dashboardPage.switchToDifferenceButton).toBeVisible({ timeout: 10000 });
    
    // Switch to difference mode
    await dashboardPage.switchToDifferenceMode();
    
    // Verify we are now in difference mode
    await dashboardPage.expectDifferenceMode();
    
    // Verify message about requiring 2 files appears
    // (Our mock has only 1 file per category)
    await expect(dashboardPage.differenceRequiresFilesMessage).toBeVisible();
  });

  test('should not display switch button when no data is loaded', async ({ page }) => {
    // Clear localStorage to simulate no data state
    await page.evaluate(() => {
      localStorage.removeItem('chartData');
      localStorage.removeItem('filenamesPerCategory');
    });
    
    // Reload the page
    await page.reload();
    await dashboardPage.hideWebpackOverlay();
    await page.waitForTimeout(1000); // Wait for page to render
    
    // Verify the button is hidden
    await expect(dashboardPage.switchToDifferenceButton).toBeHidden({ timeout: 10000 });
    
    // Verify empty state message or no data indicator is shown
    // The page shows either "Load data to visualize" or just an empty chart area
    const emptyIndicator = page.getByText(/Load data to visualize|No data to display|Upload files/i).first();
    await expect(emptyIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should clear localStorage on reset except preserved keys', async ({ page }) => {
    // Setup initial localStorage with various keys
    await dashboardPage.setLocalStorage({
      chartData: { test: 'data' },
      filenamesPerCategory: { cat: ['file1'] },
      selectedCategory: 'TestCategory',
      secondaryCategory: 'SecondaryCategory',
      lastHelpTab: 'FAQ',
      session_token: 'test-token-123',
      userMetrics: [{ id: 1, name: 'Custom' }],
      someOtherKey: 'should-be-preserved'
    });

    // Mock the clear-timeseries endpoint
    await dashboardPage.setupClearTimeseriesMock();

    // Click reset button
    await dashboardPage.resetData();

    // Verify removed keys
    await dashboardPage.expectLocalStorageCleared([
      'chartData',
      'filenamesPerCategory',
      'selectedCategory',
      'secondaryCategory'
    ]);

    // Verify preserved keys
    await dashboardPage.expectLocalStoragePreserved({
      lastHelpTab: 'FAQ',
      session_token: 'test-token-123'
    });

    // Verify userMetrics is preserved (check not null)
    const userMetrics = await dashboardPage.getLocalStorageItem('userMetrics');
    expect(userMetrics).toBeTruthy();

    // Verify dashboard shows no data message
    await dashboardPage.expectEmptyState();
  });

  test('should display error message on 429 response', async ({ page }) => {
    // Mock 429 response from backend
    await dashboardPage.setupClearTimeseriesMock({
      status: 429,
      body: 'Too Many Requests - Please wait and try again'
    });

    // Click reset button
    await dashboardPage.resetData();

    // Verify error message is shown (the error contains the response body)
    // When reset fails, error is set to "Failed to clear data on server: ..."
    await expect(page.getByText(/Failed to clear data|Too Many Requests/i)).toBeVisible();
  });
});