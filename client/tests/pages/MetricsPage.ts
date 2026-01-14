/**
 * Metrics Page Object Model.
 * Contains locators and methods for interacting with the Metrics page.
 */
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MetricsPage extends BasePage {
  // Tab navigation
  readonly predefinedMetricsTab: Locator;
  readonly userMetricsTab: Locator;

  // Search
  readonly searchInput: Locator;

  // Add metric controls
  readonly addMetricButton: Locator;

  // Modal elements
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalTitleInput: Locator;
  readonly modalDescriptionInput: Locator;
  readonly modalCodeEditor: Locator;
  readonly modalInsertTemplateButton: Locator;
  readonly modalSaveButton: Locator;
  readonly modalDeleteButton: Locator;
  readonly modalCancelButton: Locator;

  // Metric rows
  readonly metricRows: Locator;

  constructor(page: Page) {
    super(page);

    // Tab navigation
    this.predefinedMetricsTab = page.getByRole('tab', { name: 'Predefined Metrics' });
    this.userMetricsTab = page.getByRole('tab', { name: 'User Metrics' });

    // Search
    this.searchInput = page.getByPlaceholder(/Search metrics/i).first();

    // Add metric controls
    this.addMetricButton = page.getByRole('button', { name: 'Add Your Custom Metric' });

    // Modal elements
    this.modal = page.getByRole('dialog');
    this.modalTitle = this.modal.getByText(/Add Your Custom Metric|Edit Metric|Confirm Delete/i);
    this.modalTitleInput = this.modal.locator('input[type="text"]').first();
    this.modalDescriptionInput = this.modal.locator('textarea.form-control').first(); // The description textarea, not the code editor
    this.modalCodeEditor = this.modal.locator('.npm__react-simple-code-editor__textarea'); // Code editor uses a specific class
    this.modalInsertTemplateButton = this.modal.getByRole('button', { name: 'Insert Template' });
    this.modalSaveButton = this.modal.getByRole('button', { name: 'Save' });
    this.modalDeleteButton = this.modal.getByRole('button', { name: 'Delete' });
    this.modalCancelButton = this.modal.getByRole('button', { name: 'Cancel' }); // Specifically the Cancel button, not Close

    // Metric rows
    this.metricRows = page.locator('.metric-row');
  }

  async goto(): Promise<void> {
    await this.page.goto('/metrics');
    await this.hideWebpackOverlay();
  }

  /**
   * Switch to predefined metrics tab.
   */
  async goToPredefinedTab(): Promise<void> {
    await this.clickAfterScroll(this.predefinedMetricsTab);
  }

  /**
   * Switch to user metrics tab.
   */
  async goToUserMetricsTab(): Promise<void> {
    await this.clickAfterScroll(this.userMetricsTab);
  }

  /**
   * Search for a metric by name.
   */
  async searchMetric(searchTerm: string): Promise<void> {
    await this.scrollIntoView(this.searchInput);
    await this.searchInput.fill(searchTerm);
  }

  /**
   * Open the add metric modal.
   */
  async openAddMetricModal(): Promise<void> {
    await this.clickAfterScroll(this.addMetricButton);
    await expect(this.modal).toBeVisible();
  }

  /**
   * Add a new user metric using the code editor.
   */
  async addUserMetric(options: {
    title: string;
    description: string;
    code: string;
  }): Promise<void> {
    const { title, description, code } = options;

    await this.openAddMetricModal();

    // Fill form
    await this.scrollIntoView(this.modalTitleInput);
    await this.modalTitleInput.fill(title);
    await this.scrollIntoView(this.modalDescriptionInput);
    await this.modalDescriptionInput.fill(description);
    
    // Click "Insert Template" first, then replace with our code
    await this.clickAfterScroll(this.modalInsertTemplateButton);
    // The editor uses a textarea-like element in prism-react-renderer
    // We need to find the actual textarea/input that accepts text
    const codeArea = this.modal.locator('pre textarea, .prism-code textarea, [contenteditable="true"]').first();
    if (await codeArea.count() > 0) {
      await this.scrollIntoView(codeArea);
      await codeArea.fill(code);
    } else {
      // Fallback: use keyboard to clear and type
      const preElement = this.modal.locator('pre').first();
      await this.scrollIntoView(preElement);
      await preElement.click();
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(code);
    }

    // Save
    await this.clickAfterScroll(this.modalSaveButton);

    // Wait for modal to close
    await expect(this.modal).toBeHidden();
  }

  /**
   * Delete a metric by name.
   */
  async deleteMetric(metricName: string): Promise<void> {
    const metricRow = this.metricRows.filter({ hasText: metricName });
    const deleteButton = metricRow.getByRole('button', { name: 'Delete metric' });
    
    await this.clickAfterScroll(deleteButton);
    
    // Wait for confirm modal
    await expect(this.modal).toBeVisible();
    await expect(this.modal).toContainText('Confirm Delete');
    
    // Confirm delete
    await this.clickAfterScroll(this.modalDeleteButton);
  }

  /**
   * Get a metric row locator by name.
   */
  getMetricRow(metricName: string): Locator {
    return this.metricRows.filter({ hasText: metricName });
  }

  /**
   * Verify predefined tab is active.
   */
  async expectPredefinedTabActive(): Promise<void> {
    await expect(this.predefinedMetricsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Verify user metrics tab is active.
   */
  async expectUserMetricsTabActive(): Promise<void> {
    await expect(this.userMetricsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Verify a metric exists in the list.
   */
  async expectMetricVisible(metricName: string): Promise<void> {
    const metricRow = this.getMetricRow(metricName);
    await this.scrollIntoView(metricRow);
    await expect(metricRow).toBeVisible();
  }

  /**
   * Verify a metric does not exist in the list.
   */
  async expectMetricNotVisible(metricName: string): Promise<void> {
    await expect(this.page.getByText(metricName)).toBeHidden();
  }

  /**
   * Verify metric row contains description.
   */
  async expectMetricHasDescription(metricName: string, description: string): Promise<void> {
    const metricRow = this.getMetricRow(metricName);
    await this.scrollIntoView(metricRow);
    await expect(metricRow).toContainText(description);
  }
}
