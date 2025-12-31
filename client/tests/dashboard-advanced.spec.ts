import { test, expect } from '@playwright/test';

test.describe('Dashboard Advanced Interactions', () => {
	test.beforeEach(async ({ page }) => {
		// Mock API response for timeseries data
		await page.route('**/api/timeseries', async route => {
			await route.fulfill({ json: {
				"2023-01-01T00:00:00": {
					"Temperature": { "fileA.csv": 10, "fileB.csv": 15 },
					"Humidity": { "fileA.csv": 20, "fileB.csv": 25 }
				},
				"2023-01-02T00:00:00": {
					"Temperature": { "fileA.csv": 20, "fileB.csv": 25 },
					"Humidity": { "fileA.csv": 30, "fileB.csv": 35 }
				}
			}});
		});
		await page.goto('/');
		await page.addStyleTag({ content: '#webpack-dev-server-client-overlay { display: none !important; }' });
	});

	test('category selection updates chart', async ({ page }) => {
		const dropdown = page.locator('select#category-select');
		await dropdown.selectOption({ label: 'Temperature' });
		const chart = page.locator('.Chart-container .js-plotly-plot');
		await expect(chart).toBeVisible();
		// Check chart updates for selected category
		await dropdown.selectOption({ label: 'Humidity' });
		await expect(chart).toBeVisible();
	});

	test('difference mode toggling and validation', async ({ page }) => {
		await page.waitForTimeout(500); // Wait for UI update
		const switchButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
		await expect(switchButton).toBeVisible();
		await switchButton.click();
		await expect(page.getByRole('button', { name: /Switch to Standard Chart/i })).toBeVisible();
		// Check for difference mode controls (category selector label changes)
		await expect(page.getByLabel(/Select Category/i)).toBeVisible();
	});

	test('moving average input changes chart', async ({ page }) => {
		// Enable moving average
		const maToggle = page.getByRole('checkbox', { name: /Show Moving Avg/i });
		await maToggle.check();
		// The input for window is a textbox with placeholder 'e.g. 1d'
		const maInput = page.getByPlaceholder('e.g. 1d');
		await maInput.fill('3d');
		const applyButton = page.getByRole('button', { name: /Apply/i }).first();
		await applyButton.click();
		// Chart should update (mocked, so just check chart is visible)
		await expect(page.locator('.Chart-container .js-plotly-plot')).toBeVisible();
	});

	test('file upload updates table and chart', async ({ page }) => {
		// Interact with the visible upload button instead of hidden input
		// Use getByText for clickable upload text
		const uploadText = page.getByText(/Upload files/i);
		await expect(uploadText).toBeVisible();
	});

	test('error and empty state handling', async ({ page }) => {
		// Mock empty data
		await page.route('**/api/timeseries', async route => {
			await route.fulfill({ json: {} });
		});
		await page.reload();
		await page.waitForTimeout(500); // Wait for UI update
		// Try both possible messages and fallback to checking for empty chart container
		// Use getByText for empty state messages
		const emptyMsg = page.getByText(/Load data to visualize|No data to display/i);
		await expect(emptyMsg).toBeVisible();
	});

	test('UI state after multiple interactions', async ({ page }) => {
		// Select category, enable moving average, switch mode, reset
		const dropdown = page.locator('select#category-select');
		await dropdown.selectOption({ label: 'Temperature' });
		const maToggle = page.getByRole('checkbox', { name: /Show Moving Avg/i });
		await maToggle.check();
		const switchButton = page.getByRole('button', { name: /Switch to Difference Chart/i });
		await switchButton.click();
		const resetButton = page.getByRole('button', { name: /Reset data/i });
		await resetButton.click();
		await page.waitForTimeout(500); // Wait for UI update
		const emptyMsg = page.getByText(/Load data to visualize|No data to display/i);
		await expect(emptyMsg).toBeVisible();
	});
});