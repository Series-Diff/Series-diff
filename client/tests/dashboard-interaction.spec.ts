/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Dashboard Interaction', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Mock the API response for timeseries data
    await page.route('**/api/timeseries', async route => {
      console.log('Intercepted /api/timeseries');
      const apiResponse = {
        "2023-01-01T00:00:00": {
            "Category A": { "file1.csv": 10 },
            "Category B": { "file2.csv": 15 }
        },
        "2023-01-02T00:00:00": {
            "Category A": { "file1.csv": 20 }
        }
      };
      
      await route.fulfill({ json: apiResponse });
    });

    // Mock metrics to avoid backend errors/crashes
    await page.route('**/api/timeseries/mean*', async route => route.fulfill({ json: { mean: 0 } }));
    await page.route('**/api/timeseries/variance*', async route => route.fulfill({ json: { variance: 0 } }));
    await page.route('**/api/timeseries/median*', async route => route.fulfill({ json: { median: 0 } }));
    await page.route('**/api/timeseries/standard_deviation*', async route => route.fulfill({ json: { standard_deviation: 0 } }));
    await page.route('**/api/timeseries/autocorrelation*', async route => route.fulfill({ json: { autocorrelation: 0 } }));
    
    // Fix: Correct endpoint for Pearson Correlation
    await page.route('**/api/timeseries/pearson_correlation*', async route => {
        console.log('Intercepted pearson_correlation');
        route.fulfill({ json: { pearson_correlation: 0 } });
    });
    
    await page.route('**/api/timeseries/cosine_similarity*', async route => {
        console.log('Intercepted cosine_similarity');
        route.fulfill({ json: { cosine_similarity: 0 } });
    });
    
    await page.route('**/api/timeseries/dtw*', async route => {
        console.log('Intercepted dtw');
        route.fulfill({ json: { dtw_distance: 0 } });
    });

    await page.goto('/');
    
    // Hide webpack overlay that might block clicks
    await page.addStyleTag({ content: '#webpack-dev-server-client-overlay { display: none !important; }' });
  });

  test('should display category selector when data is loaded', async ({ page }) => {
    // Wait for the data to be "fetched" and processed
    // The dropdown should appear. We look for the select element.
    // Since there might be multiple selects (category, secondary category), we pick the first one or by label if possible.
    // Based on ControlsPanel, it likely renders a select.
    const dropdown = page.locator('select').first();
    await expect(dropdown).toBeVisible();
    
    // Check if options are populated
    await expect(dropdown).toContainText('Category A');
    await expect(dropdown).toContainText('Category B');
  });

  test('should display chart when category is selected', async ({ page }) => {
    const dropdown = page.locator('select').first();
    // Select 'Category A'
    await dropdown.selectOption({ label: 'Category A' });

    // Check for chart container
    const chartContainer = page.locator('.Chart-container');
    await expect(chartContainer).toBeVisible();
    
    // Check if canvas exists (Plotly uses canvas or svg)
    // We look for the plotly class
    const plot = page.locator('.js-plotly-plot');
    await expect(plot).toBeVisible();
  });
  
  test('should allow switching to difference mode', async ({ page }) => {
      // The button only appears if hasData is true.
      // Our mock ensures hasData is true.
      
      const switchButton = page.getByRole('button', { name: 'Switch to Difference Chart' });
      await expect(switchButton).toBeVisible();
      
      // Wait for any layout shifts
      await page.waitForTimeout(500);
      
      await switchButton.click();
      
      // Verify button text changes
      await expect(page.getByRole('button', { name: 'Switch to Standard Chart' })).toBeVisible();
      
      // Verify we are in difference mode (maybe check for difference specific controls)
      // For example, "Difference Chart requires at least 2 files..." message might appear if we don't have enough files.
      // In our mock, Category A has 1 file, Category B has 1 file.
      // So "Difference chart requires at least 2 files in the same category." should appear.
      await expect(page.getByText('Difference chart requires at least 2 files')).toBeVisible();
  });

  test('should not display switch button when no data is loaded', async ({ page }) => {
    // Override the default mock to return empty data for this specific test
    await page.route('**/api/timeseries', async route => {
      await route.fulfill({ json: {} });
    });
    
    // Reload the page to trigger the fetch with the new mock
    await page.reload();
    
    // Verify the button is hidden
    const switchButton = page.getByRole('button', { name: 'Switch to Difference Chart' });
    await expect(switchButton).toBeHidden();
    
    // Verify "Load data to visualize" message is shown
    await expect(page.getByText('Load data to visualize')).toBeVisible();
  });

  test('should clear localStorage on reset except preserved keys', async ({ page }) => {
    // Setup initial localStorage with various keys
    await page.evaluate(() => {
      localStorage.setItem('chartData', JSON.stringify({ test: 'data' }));
      localStorage.setItem('filenamesPerCategory', JSON.stringify({ cat: ['file1'] }));
      localStorage.setItem('selectedCategory', 'TestCategory');
      localStorage.setItem('secondaryCategory', 'SecondaryCategory');
      localStorage.setItem('lastHelpTab', 'FAQ');
      localStorage.setItem('session_token', 'test-token-123');
      localStorage.setItem('userMetrics', JSON.stringify([{ id: 1, name: 'Custom' }]));
      localStorage.setItem('someOtherKey', 'should-be-preserved');
    });

    // Mock the clear-timeseries endpoint
    await page.route('**/api/clear-timeseries', async route => {
      await route.fulfill({ status: 200, body: 'OK' });
    });

    // Click reset button
    await page.getByRole('button', { name: /Reset Data/i }).click();

    // Wait for reset to complete
    await page.waitForTimeout(500);

    // Verify removed keys
    const removedKeys = await page.evaluate(() => ({
      chartData: localStorage.getItem('chartData'),
      filenamesPerCategory: localStorage.getItem('filenamesPerCategory'),
      selectedCategory: localStorage.getItem('selectedCategory'),
      secondaryCategory: localStorage.getItem('secondaryCategory'),
    }));

    expect(removedKeys.chartData).toBeNull();
    expect(removedKeys.filenamesPerCategory).toBeNull();
    expect(removedKeys.selectedCategory).toBeNull();
    expect(removedKeys.secondaryCategory).toBeNull();

    // Verify preserved keys
    const preservedKeys = await page.evaluate(() => ({
      lastHelpTab: localStorage.getItem('lastHelpTab'),
      session_token: localStorage.getItem('session_token'),
      userMetrics: localStorage.getItem('userMetrics'),
      someOtherKey: localStorage.getItem('someOtherKey'),
    }));

    expect(preservedKeys.lastHelpTab).toBe('FAQ');
    expect(preservedKeys.session_token).toBe('test-token-123');
    expect(preservedKeys.userMetrics).toBeTruthy();
    expect(preservedKeys.someOtherKey).toBe('should-be-preserved');

    // Verify dashboard shows no data message
    await expect(page.getByText('Load data to visualize')).toBeVisible();
  });

  test('should display rate limit error on 429 response', async ({ page }) => {
    // Mock 429 response from backend
    await page.route('**/api/clear-timeseries', async route => {
      await route.fulfill({
        status: 429,
        headers: { 'Content-Type': 'text/html' },
        body: '<!doctype html><html lang=en><title>429 Too Many Requests</title><h1>Too Many Requests</h1><p>1 per 1 hour</p>'
      });
    });

    // Click reset button
    await page.getByRole('button', { name: /Reset Data/i }).click();

    // Wait for error to appear
    await page.waitForTimeout(500);

    // Verify user-friendly error message is shown
    await expect(page.getByText(/rate limit/i)).toBeVisible();
  });
});