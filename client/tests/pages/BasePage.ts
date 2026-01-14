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
    await this.navDashboard.click();
    await this.page.waitForURL(/\/dashboard/);
  }

  /**
   * Navigate to Data page.
   */
  async goToData(): Promise<void> {
    await this.navData.click();
    await this.page.waitForURL(/\/data/);
  }

  /**
   * Navigate to Metrics page.
   */
  async goToMetrics(): Promise<void> {
    await this.navMetrics.click();
    await this.page.waitForURL(/\/metrics/);
  }

  /**
   * Navigate to Help page.
   */
  async goToHelp(): Promise<void> {
    await this.navHelp.click();
    await this.page.waitForURL(/\/help/);
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
    // Wait for element to exist before scrolling
    await locator.waitFor({ state: 'attached', timeout: 10000 });
    await locator.evaluate(element => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // Wait a bit for scroll animation to complete
    await this.page.waitForTimeout(300);
  }

  /**
   * Click an element after scrolling it into view.
   */
  async clickAfterScroll(locator: Locator): Promise<void> {
    await this.scrollIntoView(locator);
    await locator.click();
  }

  /**
   * Check visibility of an element after scrolling it into view.
   */
  async expectVisibleAfterScroll(locator: Locator): Promise<void> {
    await this.scrollIntoView(locator);
    await expect(locator).toBeVisible();
  }
}
