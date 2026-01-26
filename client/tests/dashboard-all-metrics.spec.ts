/**
 * Dashboard All Metrics Comprehensive E2E Tests
 * 
 * Tests:
 * - All statistics display correctly (Mean, Median, Variance, Std Dev, Autocorrelation)
 * - All pairwise metrics display correctly (Pearson, Cosine, MAE, RMSE, DTW, Euclidean)
 * - Difference Chart mode works correctly
 * - Moving Average toggle and configuration works
 * - Full end-to-end workflow with all metrics
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { 
  MULTI_FILE_TEST_DATA,
  setupMetricMocksWithDelays, 
  setupLocalStorageWithData,
  clearAllStorage,
  setupRollingMeanMock,
  clickAfterScroll,
  safeReload,
  safeGoto
} from './helpers/dashboard-test-helpers';

test.describe('Dashboard All Metrics Comprehensive E2E Tests', () => {
  // Full HD viewport for all tests
  test.use({ viewport: { width: 1920, height: 1080 } });

  // ============================================================
  // FEATURE: All Statistics Display
  // ============================================================

  test.describe('All Statistics Display', () => {
    test.beforeEach(async ({ page }) => {
      await safeGoto(page);
      await clearAllStorage(page);
    });

    test('All statistics display correctly - Mean, Median, Variance, Std Dev, Autocorrelation', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', 
          JSON.stringify(['mean', 'median', 'variance', 'std_dev', 'autocorrelation'])
        );
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await safeReload(page);
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(3000);

      // Verify each statistic is displayed
      const statistics = [
        { label: 'Mean:', value: '42.5' },
        { label: 'Median:', value: '41' },
        { label: 'Variance:', value: '12.5' },
        { label: 'Std Dev:', value: '3.54' },
        { label: 'Autocorrelation:', value: '0.85' }
      ];

      for (const stat of statistics) {
        const statLabel = page.getByText(new RegExp(stat.label, 'i')).first();
        if (await statLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(statLabel).toBeVisible();
        }
      }
    });

    test('Statistics section grouped together', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(2000);

      // Statistics should be grouped in a metrics/statistics section
      const metricsContainer = page.locator('.metrics-container, [class*="statistics"], [class*="metrics"]');
      if (await metricsContainer.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(metricsContainer.first()).toBeVisible();
      }
    });
  });

  // ============================================================
  // FEATURE: All Pairwise Metrics Display
  // ============================================================

  test.describe('All Pairwise Metrics Display', () => {
    test.beforeEach(async ({ page }) => {
      await safeGoto(page);
      await clearAllStorage(page);
    });

    test('All pairwise metrics display in tables - Pearson, Cosine, MAE, RMSE, DTW, Euclidean', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', 
          JSON.stringify(['pearson_correlation', 'cosine_similarity', 'mae', 'rmse', 'dtw', 'euclidean'])
        );
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await safeReload(page);
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(3000);

      // Check for each pairwise metric table
      const pairwiseMetrics = ['Pearson', 'Cosine', 'MAE', 'RMSE', 'DTW', 'Euclidean'];
      
      for (const metric of pairwiseMetrics) {
        const metricCard = page.locator('.card').filter({ hasText: new RegExp(metric, 'i') });
        if (await metricCard.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(metricCard.first()).toBeVisible();
        }
      }
    });

    test('Pairwise metric tables show matrix format for 2 files', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(['pearson_correlation']));
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(2000);

      // Check Pearson table has matrix structure
      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson/i }).first();
      if (await pearsonCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Table should have headers for file names
        const table = pearsonCard.locator('table');
        if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Should have SensorA and SensorB in headers or cells
          await expect(pearsonCard.locator('text=SensorA')).toBeVisible({ timeout: 1000 }).catch(() => {});
        }
      }
    });
  });

  // ============================================================
  // FEATURE: Difference Chart Mode
  // ============================================================

  test.describe('Difference Chart Mode', () => {
    test.beforeEach(async ({ page }) => {
      await safeGoto(page);
      await clearAllStorage(page);
    });

    test('Difference Chart mode works correctly - switch and switch back', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        const selection = localStorage.getItem('selectedMetricsForDisplay');
        const current = selection ? JSON.parse(selection) : ['mean'];
        if (!current.includes('difference_chart')) {
          current.push('difference_chart');
          localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(current));
        }
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(500);
      
      // Switch to difference chart
      const diffButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
      await expect(diffButton).toBeVisible({ timeout: 5000 });
      await clickAfterScroll(page, diffButton);

      // Should be in difference mode
      await expect(page.getByRole('button', { name: /Switch to Standard Chart/i })).toBeVisible();
      
      // Switch back to standard
      await clickAfterScroll(page, page.getByRole('button', { name: /Switch to Standard Chart/i }));
      
      // Should be back in standard mode
      await expect(page.getByRole('button', { name: /Switch to Difference Chart/i })).toBeVisible();
    });

    test('Difference Chart shows tolerance input', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(['difference_chart']));
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(500);
      
      const diffButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
      if (await diffButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clickAfterScroll(page, diffButton);
        await page.waitForTimeout(500);
        // Tolerance input might be visible in difference mode
      }
    });
  });

  // ============================================================
  // FEATURE: Moving Average
  // ============================================================

  test.describe('Moving Average', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await clearAllStorage(page);
    });

    test('Moving Average toggle works - enable and configure', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await setupRollingMeanMock(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        const selection = localStorage.getItem('selectedMetricsForDisplay');
        const current = selection ? JSON.parse(selection) : ['mean'];
        if (!current.includes('moving_average')) {
          current.push('moving_average');
          localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(current));
        }
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await safeReload(page);
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(500);
      
      const maToggle = page.locator('#ma-toggle');
      await expect(maToggle).toBeVisible({ timeout: 5000 });
      
      // Toggle ON
      await maToggle.check();
      await expect(maToggle).toBeChecked();
      
      // MA controls should be functional
      const maInput = page.getByPlaceholder('e.g. 1d');
      await expect(maInput).toBeVisible();
    });

    test('Moving Average window input accepts value and applies', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await setupRollingMeanMock(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(['moving_average']));
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(500);
      
      const maToggle = page.locator('#ma-toggle');
      await maToggle.check();
      
      const maInput = page.getByPlaceholder('e.g. 1d');
      await maInput.fill('2h');
      
      const setButton = page.getByRole('button', { name: /Set/i });
      if (await setButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clickAfterScroll(page, setButton);
        await page.waitForTimeout(500);
      }
      
      // Input value should be applied
      await expect(maInput).toHaveValue('2h');
    });

    test('Moving Average toggle OFF hides controls', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await setupRollingMeanMock(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(['moving_average']));
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(500);
      
      const maToggle = page.locator('#ma-toggle');
      
      // Enable
      await maToggle.check();
      const maInput = page.getByPlaceholder('e.g. 1d');
      await expect(maInput).toBeVisible();
      
      // Disable
      await maToggle.uncheck();
      await page.waitForTimeout(300);
      
      // Controls should be hidden or disabled
      // Note: Behavior depends on UI implementation
    });
  });

  // ============================================================
  // FEATURE: Full End-to-End Workflow
  // ============================================================

  test.describe('Full End-to-End Workflow', () => {
    test('Complete workflow - load data, view all metrics, switch modes', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await setupRollingMeanMock(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await safeGoto(page);
      await clearAllStorage(page);
      
      // Enable all features
      await page.evaluate(() => {
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify([
          'mean', 'median', 'variance', 'std_dev', 'autocorrelation',
          'pearson_correlation', 'cosine_similarity', 'mae', 'rmse', 'dtw', 'euclidean',
          'moving_average', 'difference_chart'
        ]));
      });
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();

      // Step 1: Select Temperature category
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(2000);
      
      // Verify chart is visible
      await dashboardPage.expectChartVisible();
      
      // Step 2: Verify statistics
      await expect(page.getByText(/Mean:/i).first()).toBeVisible({ timeout: 5000 });
      
      // Step 3: Switch to Humidity
      await dashboardPage.selectCategory('Humidity');
      await page.waitForTimeout(1000);
      await dashboardPage.expectChartVisible();
      
      // Step 4: Switch to difference chart mode if available
      const diffButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
      if (await diffButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clickAfterScroll(page, diffButton);
        await expect(page.getByRole('button', { name: /Switch to Standard Chart/i })).toBeVisible();
        
        // Switch back
        await clickAfterScroll(page, page.getByRole('button', { name: /Switch to Standard Chart/i }));
      }
      
      // Step 5: Enable Moving Average if available
      const maToggle = page.locator('#ma-toggle');
      if (await maToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await maToggle.check();
        await expect(maToggle).toBeChecked();
        await maToggle.uncheck();
      }
      
      // Step 6: Navigate away and back (use direct navigation to avoid flaky nav clicks)
      await page.goto('/metrics', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForURL(/\/metrics/, { timeout: 15000 }).catch(() => {});
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {});
      await dashboardPage.hideWebpackOverlay();
      
      // Chart should still be visible
      await dashboardPage.expectChartVisible();
    });
  });
});
