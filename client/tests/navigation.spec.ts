import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages';

test('goToDashboard falls back to direct navigation when nav link unavailable', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);

  // Load the app normally
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Simulate missing nav by hiding it (ensures click path will fail)
  await page.addStyleTag({ content: 'nav, [role="navigation"] { display: none !important; }' });

  // Should not throw - fallback should navigate directly
  await dashboardPage.goToDashboard();

  await expect(page).toHaveURL(/\/dashboard/);
});