/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the default page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/SeriesDiff/);
    const logo = page.getByText('SeriesDiff', { exact: true });
    await expect(logo).toBeVisible();

    // Elementy nawigacji
    const navLinks = [
      'Dashboard', 'Data', 'Metrics', 'Anomaly', 'Settings', 'Help'
    ];

    for (const linkText of navLinks) {
      const link = page.getByRole('link', { name: linkText });
      await expect(link).toBeVisible();
    }

    // Klasa css aktywnej strony (Dashboard)
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/active/);

    // Brak klasy active dla innych linków
    const otherLinks = navLinks.slice(1);
    for (const linkText of otherLinks) {
      const link = page.getByRole('link', { name: linkText });
      await expect(link).not.toHaveClass(/active/);
    }
  });
});