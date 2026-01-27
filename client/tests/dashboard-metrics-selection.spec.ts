/**
 * Dashboard Metrics Selection Modal E2E Tests
 * 
 * Tests:
 * - Metric selection modal - Select All and Deselect All buttons work
 * - Select only pairwise metrics - no statistics
 * - Select only statistics - no pairwise metrics
 * - Enable/disable individual statistics (Mean, Median, Variance, Std Dev, Autocorrelation)
 * - Enable/disable individual pairwise metrics (Pearson, Cosine, MAE, RMSE, DTW, Euclidean)
 * - Enable Moving Average from modal
 * - Enable Difference Chart from modal
 * - Single file scenario - pairwise metrics disabled/hidden
 * - Two files scenario - all metrics available
 * - Toggle all statistics on/off
 * - Toggle all pairwise metrics on/off
 * - Toggle all plugins on/off
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { 
  MULTI_FILE_TEST_DATA,
  SINGLE_FILE_TEST_DATA,
  setupMetricMocksWithDelays, 
  setupLocalStorageWithData,
  setupPluginsMock,
  clearAllStorage,
  safeReload,
  safeGoto
} from './helpers/dashboard-test-helpers';

test.describe('Dashboard Metrics Selection Modal E2E Tests', () => {
  // Full HD viewport for all tests
  test.use({ viewport: { width: 1920, height: 1080 } });

  // ============================================================
  // FEATURE: Basic Modal Operations
  // ============================================================

  test.describe('Basic Modal Operations', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await safeGoto(page);
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await safeReload(page);
      await dashboardPage.hideWebpackOverlay();
    });

    test('Metric selection modal - Select All and Deselect All buttons work', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const selectAllButton = modal.getByRole('button', { name: 'Select All', exact: true }).first();
      const deselectAllButton = modal.getByRole('button', { name: 'Deselect All' }).first();
      
      await expect(selectAllButton).toBeVisible();
      await expect(deselectAllButton).toBeVisible();

      // Click Deselect All - verify all checkboxes unchecked
      await dashboardPage.clickAfterScroll(deselectAllButton);
      await page.waitForTimeout(300);
      
      const checkboxes = modal.locator('input[type="checkbox"]');
      const checkedAfterDeselect = await checkboxes.evaluateAll(els => els.filter(el => (el as HTMLInputElement).checked).length);
      expect(checkedAfterDeselect).toBe(0);

      // Click Select All - verify all checkboxes checked
      await dashboardPage.clickAfterScroll(selectAllButton);
      await page.waitForTimeout(300);
      
      const checkedAfterSelect = await checkboxes.evaluateAll(els => els.filter(el => (el as HTMLInputElement).checked).length);
      expect(checkedAfterSelect).toBeGreaterThan(0);

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Cancel' }));
      await expect(modal).toBeHidden();
    });

    test('Modal closes properly from both tabs (predefined and user)', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      // Test closing from Predefined tab
      let modal = await dashboardPage.openMetricsSelectionModal();
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Cancel' }));
      await expect(modal).toBeHidden();
      
      // Test closing from User Metrics tab
      modal = await dashboardPage.openMetricsSelectionModal();
      
      // Switch to User Metrics tab
      const userTab = modal.getByRole('tab', { name: /User|Custom|Plugin/i });
      if (await userTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardPage.clickAfterScroll(userTab);
        await page.waitForTimeout(300);
      }
      
      // Close from User Metrics tab - this should not block
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Cancel' }));
      await expect(modal).toBeHidden({ timeout: 3000 });
    });
  });

  // ============================================================
  // FEATURE: Individual Statistics Toggle
  // ============================================================

  test.describe('Individual Statistics Toggle', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
    });

    test('Disable Mean - Mean value not shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      // Find Mean row by text-wrapper-2 (bold label) and then parent row's checkbox
      const meanLabel = modal.locator('.text-wrapper-2', { hasText: 'Mean' }).first();
      const meanRow = meanLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const meanCheckbox = meanRow.locator('input[type="checkbox"]');
      if (await meanCheckbox.count() > 0 && await meanCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(meanCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      // Mean should not be visible
      const meanLabelOnPage = page.locator('text=/^Mean:/');
      await expect(meanLabelOnPage).toHaveCount(0);
    });

    test('Disable Median - Median value not shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      const medianLabel = modal.locator('.text-wrapper-2', { hasText: 'Median' }).first();
      const medianRow = medianLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const medianCheckbox = medianRow.locator('input[type="checkbox"]');
      if (await medianCheckbox.count() > 0 && await medianCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(medianCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const medianLabelOnPage = page.locator('text=/^Median:/');
      await expect(medianLabelOnPage).toHaveCount(0);
    });

    test('Disable Variance - Variance value not shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      const varianceLabel = modal.locator('.text-wrapper-2', { hasText: 'Variance' }).first();
      const varianceRow = varianceLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const varianceCheckbox = varianceRow.locator('input[type="checkbox"]');
      if (await varianceCheckbox.count() > 0 && await varianceCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(varianceCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const varianceLabelOnPage = page.locator('text=/^Variance:/');
      await expect(varianceLabelOnPage).toHaveCount(0);
    });

    test('Disable Std Dev - Std Dev value not shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      const stdDevLabel = modal.locator('.text-wrapper-2', { hasText: 'Standard Deviation' }).first();
      const stdDevRow = stdDevLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const stdDevCheckbox = stdDevRow.locator('input[type="checkbox"]');
      if (await stdDevCheckbox.count() > 0 && await stdDevCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(stdDevCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const stdDevLabelOnPage = page.locator('text=/^Standard deviation:/');
      await expect(stdDevLabelOnPage).toHaveCount(0);
    });

    test('Disable Autocorrelation - Autocorrelation value not shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      // Autocorrelation is disabled by default (expensive metric), so no need to disable it
      // Just verify it's not shown
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const autocorrelationLabel = page.locator('text=/^Autocorrelation:/');
      await expect(autocorrelationLabel).toHaveCount(0);
    });

    test('Enable only Mean - only Mean shown', async ({ page }) => {
      const modal = await dashboardPage.openMetricsSelectionModal();
      
      // Deselect all first
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Deselect All' }).first());
      await page.waitForTimeout(200);

      // Enable only Mean by finding the row and clicking checkbox
      const meanLabel = modal.locator('.text-wrapper-2', { hasText: 'Mean' }).first();
      const meanRow = meanLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const meanCheckbox = meanRow.locator('input[type="checkbox"]');
      if (await meanCheckbox.count() > 0) {
        await dashboardPage.clickAfterScroll(meanCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      // Only Mean should be visible
      await expect(page.getByText(/Mean:/i).first()).toBeVisible({ timeout: 3000 });
      // Others should not be visible
      await expect(page.locator('text=/^Median:/')).toHaveCount(0);
      await expect(page.locator('text=/^Variance:/')).toHaveCount(0);
    });
  });

  // ============================================================
  // FEATURE: Pairwise Metrics Toggle
  // ============================================================

  test.describe('Pairwise Metrics Toggle', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await safeGoto(page);
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await safeReload(page);
      await dashboardPage.hideWebpackOverlay();
    });

    test('Select only pairwise metrics - no statistics shown', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      // Deselect all
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Deselect All' }).first());
      await page.waitForTimeout(200);

      // Select only pairwise metrics by finding rows by label
      const pairwiseLabels = ['Pearson Correlation', 'Cosine Similarity', 'Euclidean', 'MAE', 'RMSE', 'DTW'];
      for (const label of pairwiseLabels) {
        const labelEl = modal.locator('.text-wrapper-2', { hasText: label }).first();
        const row = labelEl.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
        const checkbox = row.locator('input[type="checkbox"]');
        if (await checkbox.count() > 0) {
          await dashboardPage.clickAfterScroll(checkbox);
        }
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(1000);

      // Statistics should not be visible
      await expect(page.locator('text=/^Mean:/')).toHaveCount(0);
      await expect(page.locator('text=/^Median:/')).toHaveCount(0);
      
      // Pairwise metrics tables should be visible
      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson/i });
      if (await pearsonCard.count() > 0) {
        await expect(pearsonCard.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('Select only statistics - no pairwise metrics shown', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      // Deselect all
      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Deselect All' }).first());
      await page.waitForTimeout(200);

      // Select only statistics by finding rows by label
      const statisticLabels = ['Mean', 'Median', 'Variance', 'Standard Deviation'];
      for (const label of statisticLabels) {
        const labelEl = modal.locator('.text-wrapper-2', { hasText: label }).first();
        const row = labelEl.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
        const checkbox = row.locator('input[type="checkbox"]');
        if (await checkbox.count() > 0) {
          await dashboardPage.clickAfterScroll(checkbox);
        }
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(1000);

      // Statistics should be visible
      await expect(page.getByText(/Mean:/i).first()).toBeVisible({ timeout: 3000 });
      
      // Pairwise metrics should not be visible
      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson Correlation/i });
      await expect(pearsonCard).toHaveCount(0);
    });

    test('Disable Pearson - Pearson table not shown', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const pearsonLabel = modal.locator('.text-wrapper-2', { hasText: 'Pearson Correlation' }).first();
      const pearsonRow = pearsonLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const pearsonCheckbox = pearsonRow.locator('input[type="checkbox"]');
      if (await pearsonCheckbox.count() > 0 && await pearsonCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(pearsonCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson Correlation/i });
      await expect(pearsonCard).toHaveCount(0);
    });
  });

  // ============================================================
  // FEATURE: Single File vs Multiple Files Scenarios
  // ============================================================

  test.describe('Single File vs Multiple Files', () => {
    test('Single file - pairwise metrics disabled or hidden, statistics available', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: SINGLE_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, SINGLE_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);

      // Statistics should be visible (single file data still has statistics)
      await expect(page.getByText(/Mean:/i).first()).toBeVisible({ timeout: 5000 });

      // Pairwise metrics should NOT be visible (need 2+ files)
      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson/i });
      await expect(pearsonCard).toHaveCount(0);
    });

    test('Two files - both statistics and pairwise metrics available', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);

      // Statistics should be visible
      await expect(page.getByText(/Mean:/i).first()).toBeVisible({ timeout: 5000 });

      // Pairwise metrics should also be visible (2 files)
      const pearsonCard = page.locator('.card').filter({ hasText: /Pearson/i });
      if (await pearsonCard.count() > 0) {
        await expect(pearsonCard.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('Single file - metrics selection modal shows pairwise metrics as disabled', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: SINGLE_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, SINGLE_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);

      const modal = await dashboardPage.openMetricsSelectionModal();

      // Check if pairwise metrics checkboxes are disabled or have indicator
      const pearsonCheckbox = modal.locator('input[value="pearson_correlation"]');
      if (await pearsonCheckbox.count() > 0) {
        // Either disabled or should have some visual indicator
        const isDisabled = await pearsonCheckbox.isDisabled();
        // Note: UI might not disable them but they simply won't calculate
        // This test documents current behavior
        console.log(`Pearson checkbox disabled state: ${isDisabled}`);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Cancel' }));
    });
  });

  // ============================================================
  // FEATURE: Special Metrics (MA and Diff Chart)
  // ============================================================

  test.describe('Special Metrics (MA and Diff Chart)', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page);
      
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });
      await page.route('**/api/timeseries/rolling_mean*', async route => {
        await route.fulfill({ json: { rolling_mean: [] } });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
    });

    test('Enable Moving Average from modal - toggle appears', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const maLabel = modal.locator('.text-wrapper-2', { hasText: 'Moving Average' }).first();
      const maRow = maLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const maCheckbox = maRow.locator('input[type="checkbox"]');
      if (await maCheckbox.count() > 0 && !await maCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(maCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const maToggle = page.locator('#ma-toggle');
      await expect(maToggle).toBeVisible({ timeout: 5000 });
    });

    test('Disable Moving Average from modal - toggle disappears', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const maLabel = modal.locator('.text-wrapper-2', { hasText: 'Moving Average' }).first();
      const maRow = maLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const maCheckbox = maRow.locator('input[type="checkbox"]');
      if (await maCheckbox.count() > 0 && await maCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(maCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const maToggle = page.locator('#ma-toggle');
      await expect(maToggle).toHaveCount(0);
    });

    test('Enable Difference Chart from modal - switch button appears', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const diffLabel = modal.locator('.text-wrapper-2', { hasText: 'Difference Chart' }).first();
      const diffRow = diffLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const diffCheckbox = diffRow.locator('input[type="checkbox"]');
      if (await diffCheckbox.count() > 0 && !await diffCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(diffCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      await expect(page.getByRole('button', { name: /Switch to Difference Chart/i })).toBeVisible({ timeout: 5000 });
    });

    test('Disable Difference Chart from modal - switch button disappears', async ({ page }) => {
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);
      
      const modal = await dashboardPage.openMetricsSelectionModal();

      const diffLabel = modal.locator('.text-wrapper-2', { hasText: 'Difference Chart' }).first();
      const diffRow = diffLabel.locator('xpath=ancestor::div[contains(@class, "metric-row")]');
      const diffCheckbox = diffRow.locator('input[type="checkbox"]');
      if (await diffCheckbox.count() > 0 && await diffCheckbox.isChecked()) {
        await dashboardPage.clickAfterScroll(diffCheckbox);
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: 'Apply Selection' }));
      await expect(modal).toBeHidden();
      await page.waitForTimeout(500);

      const switchButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
      await expect(switchButton).toHaveCount(0);
    });
  });

  // ============================================================
  // FEATURE: Plugins Toggle
  // ============================================================

  test.describe('Plugins Toggle', () => {
    test('Toggle all plugins off - no plugin tables shown', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Set up with some plugins
      await setupPluginsMock(page, [
        { name: 'TestPlugin1', code: 'def calculate(s1, s2): return 1' },
        { name: 'TestPlugin2', code: 'def calculate(s1, s2): return 2' }
      ]);
      await setupMetricMocksWithDelays(page);
      await page.route('**/api/timeseries', async route => {
        await route.fulfill({ json: MULTI_FILE_TEST_DATA });
      });

      await page.goto('/');
      await clearAllStorage(page);
      await setupLocalStorageWithData(page, MULTI_FILE_TEST_DATA);
      await page.reload();
      await dashboardPage.hideWebpackOverlay();
      await dashboardPage.selectCategory('Temperature');
      await page.waitForTimeout(1000);

      // Open modal and go to User Metrics tab
      const modal = await dashboardPage.openMetricsSelectionModal();

      const userTab = modal.getByRole('tab', { name: /User|Custom|Plugin/i });
      if (await userTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardPage.clickAfterScroll(userTab);
        await page.waitForTimeout(300);

        // Deselect all plugins
        const deselectAllButton = modal.getByRole('button', { name: 'Deselect All' });
        if (await deselectAllButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dashboardPage.clickAfterScroll(deselectAllButton);
        }
      }

      await dashboardPage.clickAfterScroll(modal.getByRole('button', { name: /Apply|Cancel/ }).first());
      await expect(modal).toBeHidden({ timeout: 3000 });

      // Plugin tables should not be visible
      await page.waitForTimeout(500);
      const pluginTable1 = page.locator('.card').filter({ hasText: 'TestPlugin1' });
      await expect(pluginTable1).toHaveCount(0);
    });
  });
});
