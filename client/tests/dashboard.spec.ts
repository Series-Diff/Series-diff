import { test, expect } from '@playwright/test';

test.describe('Dashboard Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the default page correctly', async ({ page }) => {
    // Sprawdź tytuł strony
    await expect(page).toHaveTitle(/SeriesDiff/);

    // Sprawdź logo (element przy nawigacji z nazwą "SeriesDiff")
    const logo = page.getByText('SeriesDiff', { exact: true });
    await expect(logo).toBeVisible();

    // Sprawdź elementy nawigacji (widoczność)
    const navLinks = [
      'Dashboard', 'Data', 'Metrics', 'Anomaly', 'Settings', 'Help'
    ];

    for (const linkText of navLinks) {
      const link = page.getByRole('link', { name: linkText });
      await expect(link).toBeVisible();
    }

    // Sprawdź klasę aktywnego linku (Dashboard)
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/active/);

    // Sprawdź brak klasy active dla innych
    const otherLinks = navLinks.slice(1);
    for (const linkText of otherLinks) {
      const link = page.getByRole('link', { name: linkText });
      await expect(link).not.toHaveClass(/active/);
    }

    // Dodatkowe sprawdzenie zawartości dashboardu
  });
});