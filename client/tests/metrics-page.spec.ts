/**
 * Metrics Page Tests
 * Tests the metrics page functionality for viewing and managing metrics.
 */
import { test, expect } from '@playwright/test';
import { MetricsPage } from './pages';

test.describe('Metrics Page', () => {
  let metricsPage: MetricsPage;

  test.beforeEach(async ({ page }) => {
    metricsPage = new MetricsPage(page);
    await metricsPage.goto();
  });

  test('should display predefined metrics', async ({ page }) => {
    // Verify predefined tab is visible and active
    await expect(metricsPage.predefinedMetricsTab).toBeVisible();
    await metricsPage.expectPredefinedTabActive();
    
    // Check if search input exists
    await expect(metricsPage.searchInput).toBeVisible();
  });

  test('should allow opening add metric modal on user tab', async ({ page }) => {
    // Wait for nav-tabs to be ready
    await page.waitForSelector('.nav-tabs');
    
    // Switch to User-Defined tab
    await metricsPage.goToUserMetricsTab();
    
    // Click add metric button
    await metricsPage.openAddMetricModal();
    
    // Verify modal is displayed with correct title
    await expect(metricsPage.modal).toBeVisible();
    await expect(metricsPage.modal.getByText('Add Your Custom Metric')).toBeVisible();
    
    // Verify form elements are present
    await expect(metricsPage.modalTitleInput).toBeVisible();
    await expect(metricsPage.modalDescriptionInput).toBeVisible();
    await expect(metricsPage.modalInsertTemplateButton).toBeVisible();
    await expect(metricsPage.modalSaveButton).toBeVisible();
    
    // Close modal
    await metricsPage.clickAfterScroll(metricsPage.modalCancelButton);
    await expect(metricsPage.modal).toBeHidden();
  });

  test('should search predefined metrics', async ({ page }) => {
    // Verify search input is visible
    await expect(metricsPage.searchInput).toBeVisible();
    
    // Search for a metric
    await metricsPage.searchMetric('mean');
    
    // Results should be filtered (this assumes Mean metric exists in predefined)
    // The exact assertion depends on UI behavior
  });

  test('should switch between tabs', async ({ page }) => {
    // Initially on predefined tab
    await metricsPage.expectPredefinedTabActive();
    
    // Switch to user metrics tab
    await metricsPage.goToUserMetricsTab();
    await metricsPage.expectUserMetricsTabActive();
    
    // Switch back to predefined tab
    await metricsPage.goToPredefinedTab();
    await metricsPage.expectPredefinedTabActive();
  });
});
