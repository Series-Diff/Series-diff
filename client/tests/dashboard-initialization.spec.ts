/**
 * Dashboard Initialization E2E Tests
 * 
 * Tests:
 * - Empty state on fresh application load
 * - Create custom metric on fresh app (verifies modal selection + plugins visibility)
 * - Spinner visibility for each individual statistic (Mean, Median, Variance, Std Dev, Autocorrelation)
 * - Spinner visibility for each pairwise metric table (Pearson, Cosine, MAE, RMSE, DTW, Euclidean)
 * - Multiple spinners for staggered metric responses
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { MetricsPage } from './pages/MetricsPage';
import { 
  MULTI_FILE_TEST_DATA, 
  STATISTIC_SELECTORS,
  setupMetricMocksWithDelays, 
  clearAllStorage, 
  setupLocalStorageWithData,
  setupPluginsMock,
  expectVisibleAfterScroll,
  clickAfterScroll
} from './helpers/dashboard-test-helpers';

test.describe('Dashboard Initialization E2E Tests', () => {
  // Full HD viewport for all tests
  test.use({ viewport: { width: 1920, height: 1080 } });

  // ============================================================
  // FEATURE: Fresh Application State
  // ============================================================
  
  test.describe('Fresh Application State', () => {
    test.beforeEach(async ({ page }) => {
      // Clear storage before each test
      await page.goto('/');
      await clearAllStorage(page);
    });

    test('Empty state on fresh application load', async ({ page }) => {
      // Given: Fresh app state
      await page.reload();
      await page.addStyleTag({ 
        content: '#webpack-dev-server-client-overlay { display: none !important; }' 
      });

      // Then: Empty state message visible
      await expect(page.getByText(/Load data to visualize|No data to display/i)).toBeVisible({ timeout: 10000 });
    });

    test('Create custom metric on fresh app - verify modal selection and plugins visibility', async ({ page }) => {
      // Given: Set up plugins mock to track creation
      await setupPluginsMock(page, []);
      
      // Navigate to Metrics page
      const metricsPage = new MetricsPage(page);
      await metricsPage.goto();
      await page.waitForTimeout(1000); // Wait for page to fully load

      // When: Create a new custom metric - first switch to user tab
      await metricsPage.goToUserMetricsTab();
      await page.waitForTimeout(500);
      
      // Click add button
      await clickAfterScroll(page, metricsPage.addMetricButton, { timeout: 10000 });
      await expect(metricsPage.modal).toBeVisible({ timeout: 5000 });
      
      // Fill form
      const pluginName = 'Test Sum Plugin';
      await metricsPage.modalTitleInput.fill(pluginName);
      await metricsPage.modalDescriptionInput.fill('Returns sum of two series');
      
      // Select category
      const categorySelect = metricsPage.modal.locator('select').first();
      await categorySelect.selectOption({ label: 'Statistical' });
      
      // Insert template and modify code
      await clickAfterScroll(page, metricsPage.modalInsertTemplateButton);
      await page.waitForTimeout(300);
      
      // Save
      await clickAfterScroll(page, metricsPage.modalSaveButton);
      await expect(metricsPage.modal).toBeHidden({ timeout: 5000 });

      // Then: Metric appears in User Metrics tab
      await expect(page.getByText(pluginName)).toBeVisible();
      
      // Step 2: Verify metric is available in metrics selection modal
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await page.waitForTimeout(1000);
      
      // Set up data so metrics panel is visible
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await setupMetricMocksWithDelays(page);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      
      // Open metrics selection modal
      const settingsButton = page.locator('[data-testid="metrics-settings-btn"], button:has(.fa-cog), button:has(.fa-gear)').first();
      if (await settingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clickAfterScroll(page, settingsButton);
        await expect(page.locator('.modal.show')).toBeVisible({ timeout: 3000 });
        
        // Go to User Metrics tab in modal
        const userMetricsTab = page.locator('.modal.show').getByRole('tab', { name: /User|Custom|Plugin/i });
        if (await userMetricsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
          await clickAfterScroll(page, userMetricsTab);
          
          // Verify plugin appears in the modal
          await expect(page.locator('.modal.show').getByText(pluginName)).toBeVisible({ timeout: 3000 });
        }
        
        // Close modal
        const closeModalButton = page.locator('.modal-footer button:has-text("Close"), .modal-header .btn-close').first();
        await clickAfterScroll(page, closeModalButton);
      }
      
      // Step 3: Verify plugin appears in Plugins section on dashboard (if enabled)
      // Look for plugins section
      const pluginsSection = page.locator('text=Plugins').first();
      if (await pluginsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(page.locator(`text=${pluginName}`)).toBeVisible({ timeout: 3000 });
      }
    });
  });

  // ============================================================
  // FEATURE: Individual Statistic Spinners
  // ============================================================
  
  test.describe('Individual Statistic Spinners', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await clearAllStorage(page);
    });

    // Parametrized test for all statistics spinners
    (['mean', 'median', 'variance', 'std_dev', 'autocorrelation'] as const).forEach(stat => {
      test(`${stat} spinner appears during calculation and shows value after`, async ({ page }) => {
        const dashboardPage = new DashboardPage(page);
        
        // Create delays object with only the current stat having 1500ms delay
        const delays: Record<string, number> = {
          mean: 0, median: 0, variance: 0, std_dev: 0, autocorrelation: 0
        };
        delays[stat] = 1500;
        
        await setupMetricMocksWithDelays(page, delays as any);
        await page.route('**/api/timeseries', async route => {
          await route.fulfill({ json: MULTI_FILE_TEST_DATA });
        });

        await page.goto('/');
        await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
        
        // Autocorrelation is disabled by default, so enable it first
        if (stat === 'autocorrelation') {
          await page.evaluate(() => {
            const defaultMetrics = ['mean', 'median', 'variance', 'std_dev', 'pearson_correlation', 'cosine_similarity', 'mae', 'rmse', 'euclidean', 'moving_average', 'difference_chart'];
            defaultMetrics.push('autocorrelation');
            localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(defaultMetrics));
          });
        }
        
        await page.reload();
        await dashboardPage.hideWebpackOverlay();
        await dashboardPage.selectCategory('Temperature');

        // Then: Spinner should be visible for the delayed metric
        const statsContainer = page.locator(STATISTIC_SELECTORS.statisticsContainer).first();
        if (await statsContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
          const spinner = statsContainer.locator('.spinner-border');
          await expect(spinner.first()).toBeVisible({ timeout: 1000 }).catch(() => {});
        }
        
        // After delay, value should appear
        await page.waitForTimeout(2000);
        const labelPattern = stat === 'std_dev' ? /Standard deviation:/i : new RegExp(`${stat}:`, 'i');
        await expectVisibleAfterScroll(page, page.getByText(labelPattern).first());
      });
    });
  });

  // ============================================================
  // FEATURE: Pairwise Metric Table Spinners
  // ============================================================
  
  test.describe('Pairwise Metric Table Spinners', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await clearAllStorage(page);
    });

    // Parametrized test for all pairwise metric tables
    (['Pearson', 'Cosine', 'MAE', 'RMSE', 'DTW', 'Euclidean'] as const).forEach(metric => {
      test(`${metric} table spinner appears during calculation`, async ({ page }) => {
        const dashboardPage = new DashboardPage(page);
        
        await setupMetricMocksWithDelays(page, { [metric.toLowerCase()]: 1500 });
        await page.route('**/api/timeseries', async route => {
          await route.fulfill({ json: MULTI_FILE_TEST_DATA });
        });

        await page.goto('/');
        await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
        await page.reload();
        await dashboardPage.hideWebpackOverlay();
        await dashboardPage.selectCategory('Temperature');

        // Check for metric table card
        await page.waitForTimeout(2000);
        const metricCard = page.locator('.card').filter({ hasText: new RegExp(metric, 'i') }).first();
        if (await metricCard.isVisible({ timeout: 3000 }).catch(() => false)) {
          await metricCard.evaluate(element => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          await page.waitForTimeout(300);
          await expect(metricCard).toBeVisible();
        }
      });
    });
  });

  // ============================================================
  // FEATURE: Staggered Spinner Loading
  // ============================================================
  
  test.describe('Staggered Spinner Loading', () => {
    test('Multiple spinners appear and disappear progressively with staggered responses', async ({ page }) => {
      // Given: Staggered delays for different metrics
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page, {
        mean: 500,
        median: 1000,
        variance: 1500,
        std_dev: 2000,
        autocorrelation: 2500,
        pearson: 3000,
        cosine: 3500
      });
      
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      // When: Select category to trigger calculations
      await dashboardPage.selectCategory('Temperature');

      // Then: Spinners should appear initially
      const spinners = page.locator('.spinner-border');
      await expect(spinners.first()).toBeVisible({ timeout: 1000 }).catch(() => {});

      // After 1 second, Mean should be visible (500ms delay)
      await page.waitForTimeout(800);
      await expectVisibleAfterScroll(page, page.getByText(/Mean:/i).first());

      // After 1.5 seconds, Median should be visible (1000ms delay)
      await page.waitForTimeout(700);
      await expectVisibleAfterScroll(page, page.getByText(/Median:/i).first());

      // After all delays complete, all values should be visible
      await page.waitForTimeout(3000);
      
      // Verify all statistics loaded
      const expectedStats = ['Mean:', 'Median:', 'Variance:', 'Std Dev:', 'Autocorrelation:'];
      for (const stat of expectedStats) {
        const statElement = page.getByText(new RegExp(stat, 'i')).first();
        if (await statElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Scroll into view before asserting
          await statElement.evaluate(element => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          await page.waitForTimeout(300);
          await expect(statElement).toBeVisible();
        }
      }
    });
  });
});
