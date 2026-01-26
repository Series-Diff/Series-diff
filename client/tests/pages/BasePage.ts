/**
 * Base page class containing common page functionality.
 * All page objects should extend this class.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  
  // Common locators
  readonly logo: Locator;
  readonly navDashboard: Locator;
  readonly navData: Locator;
  readonly navMetrics: Locator;
  readonly navHelp: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Common navigation elements
    this.logo = page.getByText('SeriesDiff', { exact: true });
    this.navDashboard = page.getByRole('link', { name: 'Dashboard' });
    this.navData = page.getByRole('link', { name: 'Data' });
    this.navMetrics = page.getByRole('link', { name: 'Metrics' });
    this.navHelp = page.getByRole('link', { name: 'Help' });
  }

  /**
   * Navigate to this page.
   */
  abstract goto(): Promise<void>;

  /**
   * Hide the webpack dev server overlay to prevent blocking clicks.
   */
  async hideWebpackOverlay(): Promise<void> {
    await this.page.addStyleTag({ 
      content: '#webpack-dev-server-client-overlay { display: none !important; }' 
    });
  }

  /**
   * Navigate to Dashboard page.
   */
  async goToDashboard(): Promise<void> {
    // Attempt robust click first, fall back to direct navigation if needed
    try {
      await this.clickAfterScroll(this.navDashboard);
      await this.page.waitForURL(/\/dashboard/, { timeout: 15000 });
    } catch (e) {
      console.warn('goToDashboard: click failed, falling back to direct navigation', e);
      await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.page.waitForURL(/\/dashboard/, { timeout: 15000 });
    }
  }

  /**
   * Navigate to Data page.
   */
  async goToData(): Promise<void> {
    try {
      await this.clickAfterScroll(this.navData);
      await this.page.waitForURL(/\/data/, { timeout: 15000 });
    } catch (e) {
      console.warn('goToData: click failed, falling back to direct navigation', e);
      await this.page.goto('/data', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.page.waitForURL(/\/data/, { timeout: 15000 });
    }
  }

  /**
   * Navigate to Metrics page.
   */
  async goToMetrics(): Promise<void> {
    try {
      await this.clickAfterScroll(this.navMetrics);
      await this.page.waitForURL(/\/metrics/, { timeout: 15000 });
    } catch (e) {
      console.warn('goToMetrics: click failed, falling back to direct navigation', e);
      await this.page.goto('/metrics', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.page.waitForURL(/\/metrics/, { timeout: 15000 });
    }
  }

  /**
   * Navigate to Help page.
   */
  async goToHelp(): Promise<void> {
    try {
      await this.clickAfterScroll(this.navHelp);
      await this.page.waitForURL(/\/help/, { timeout: 15000 });
    } catch (e) {
      console.warn('goToHelp: click failed, falling back to direct navigation', e);
      await this.page.goto('/help', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.page.waitForURL(/\/help/, { timeout: 15000 });
    }
  }

  /**
   * Check that the page title contains expected text.
   */
  async expectTitle(titlePart: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(titlePart));
  }

  /**
   * Set up mock routes for API calls.
   * Override in subclasses for page-specific mocks.
   */
  async setupMocks(): Promise<void> {
    // Default: no mocks. Override in subclasses.
  }

  /**
   * Wait for page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll an element into view before interacting with it.
   * Useful for ensuring elements are visible in videos/traces.
   */
  async scrollIntoView(locator: Locator): Promise<void> {
    // Wait for element to exist before scrolling. Use longer timeout to reduce flakes.
    try {
      await locator.waitFor({ state: 'attached', timeout: 20000 });
      await locator.evaluate(element => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      // Wait a bit for scroll animation to complete
      await this.page.waitForTimeout(300);
    } catch (e) {
      // If element doesn't attach in time, log and continue — callers may handle navigation fallback.
      console.warn('scrollIntoView: element not attached or timed out', e);
    }
  }

  /**
   * Click an element after scrolling it into view.
   */
  async clickAfterScroll(locator: Locator): Promise<void> {
    try {
      await this.scrollIntoView(locator);
      // Ensure element is visible before clicking
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.click();
    } catch (e) {
      // Re-throw with context so callers can fallback to alternative navigation
      const err = new Error(`clickAfterScroll failed: ${String(e)}`);
      // @ts-ignore add original for debugging
      err.cause = e;
      throw err;
    }
  }

  /**
   * Check visibility of an element after scrolling it into view.
   */
  async expectVisibleAfterScroll(locator: Locator): Promise<void> {
    await this.scrollIntoView(locator);
    await expect(locator).toBeVisible();
  }
}
