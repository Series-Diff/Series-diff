/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Metrics Page', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('/metrics');
    // Hide webpack overlay
    await page.addStyleTag({ content: '#webpack-dev-server-client-overlay { display: none !important; }' });
  });

  test('should display predefined metrics', async ({ page }) => {
    const predefinedTab = page.getByRole('tab', { name: 'Predefined Metrics' });
    await expect(predefinedTab).toBeVisible();
    await expect(predefinedTab).toHaveAttribute('aria-selected', 'true');
    
    // Check if search input exists (use first as there might be one for each tab)
    await expect(page.getByPlaceholder(/Search metrics/i).first()).toBeVisible();
  });

  test('should allow adding and deleting a user metric', async ({ page }) => {
    // Wait for nav-tabs
    await page.waitForSelector('.nav-tabs');
    
    // Switch to User-Defined tab
    const userTab = page.getByRole('tab', { name: 'User Metrics' });
    await expect(userTab).toBeVisible();
    await userTab.click();
    
    // Click "Add Metric" button
    await page.getByRole('button', { name: 'Add Your Custom Metric' }).click();
    
    // Fill modal
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Add Your Custom Metric');
    
    // Upload file (required)
    await page.setInputFiles('input[type="file"]', {
      name: 'metric.py',
      mimeType: 'text/x-python',
      buffer: Buffer.from('def calculate(): return 1')
    });

    // Fill Title (using locator since label association might be missing)
    await modal.locator('input[type="text"]').fill('My Custom Metric');
    
    // Fill Description
    await modal.locator('textarea').fill('Test Description');
    
    // Save
    await modal.getByRole('button', { name: 'Save' }).click();
    
    // Wait for modal to close
    await expect(modal).toBeHidden();
    
    // Verify it appears in the list
    const metricRow = page.locator('.metric-row').filter({ hasText: 'My Custom Metric' });
    await expect(metricRow).toBeVisible();
    await expect(metricRow).toContainText('Test Description');
    
    // Now delete it
    const deleteButton = metricRow.getByRole('button', { name: 'Delete metric' });
    await deleteButton.click();
    
    // Confirm delete in modal
    const confirmModal = page.getByRole('dialog');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toContainText('Confirm Delete');
    
    await confirmModal.getByRole('button', { name: 'Delete' }).click();
    
    // Verify it is gone
    await expect(page.getByText('My Custom Metric')).toBeHidden();
  });
});
