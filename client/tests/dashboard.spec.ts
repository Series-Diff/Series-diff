/**
 * Dashboard Page Tests
 * Tests basic dashboard functionality and navigation.
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages';

test.describe('Dashboard Page Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('should load the default page correctly', async ({ page }) => {
    // Verify page title
    await dashboardPage.expectTitle('SeriesDiff');
    
    // Verify logo is visible
    await expect(dashboardPage.logo).toBeVisible();

    // Verify navigation links are visible
    await expect(dashboardPage.navDashboard).toBeVisible();
    await expect(dashboardPage.navData).toBeVisible();
    await expect(dashboardPage.navMetrics).toBeVisible();
    await expect(dashboardPage.navHelp).toBeVisible();

    // Wait for URL to stabilize (React Router may take a moment)
    await page.waitForTimeout(500);
    
    // Verify we're on the dashboard page (URL check is more reliable than class check)
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should navigate to other pages', async ({ page }) => {
    // Navigate to Data page
    await dashboardPage.goToData();
    await expect(page).toHaveURL(/\/data/);

    // Navigate back to Dashboard
    await dashboardPage.goToDashboard();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});