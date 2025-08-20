import { BasePage } from '../BasePage'

export class NewsletterListPage extends BasePage {
  protected createButton = 'text="Create Newsletter"'
  protected newsletterTable = 'table'
  protected searchInput = 'input[placeholder*="Search"]'
  protected statusFilter = 'select[name="status"]'
  protected loadingIndicator = '[data-loading="true"]'

  async navigate() {
    await this.page.goto('/admin/newsletters')
    await this.waitForPageLoad()
  }

  async clickCreateNewsletter() {
    // Navigate directly to the new newsletter page
    // This avoids issues with React Router Link handling in tests
    await this.page.goto('/admin/newsletters/new')
    await this.waitForPageLoad()
  }

  async waitForTableToAppear() {
    // First wait for any loading to complete
    await this.waitForPageLoad()
    // Then wait for the table to be visible (it only appears when newsletters exist)
    await this.page.waitForSelector(this.newsletterTable, { state: 'visible', timeout: 10000 })
  }

  async getNewsletterRow(subject: string) {
    // Ensure table exists first
    await this.waitForTableToAppear()
    const row = this.page.locator(`${this.newsletterTable} tr:has-text("${subject}")`)
    await row.waitFor({ state: 'visible' })
    return row
  }

  async clickViewNewsletter(subject: string) {
    const row = await this.getNewsletterRow(subject)
    // The View button is inside a Link component, be more specific
    await row.locator('a:has-text("View")').click()
  }

  async clickEditNewsletter(subject: string) {
    const row = await this.getNewsletterRow(subject)
    await row.locator('text="Edit"').click()
  }

  async getNewsletterCount() {
    await this.waitForPageLoad()
    const rows = await this.page.locator(`${this.newsletterTable} tbody tr`).count()
    return rows
  }

  async waitForNewslettersToLoad() {
    await this.page.waitForSelector(this.loadingIndicator, { state: 'hidden' })
    await this.page.waitForSelector(this.newsletterTable, { state: 'visible' })
  }

  async searchNewsletters(query: string) {
    await this.page.fill(this.searchInput, query)
    await this.waitForNewslettersToLoad()
  }

  async filterByStatus(status: 'all' | 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed') {
    await this.page.selectOption(this.statusFilter, status)
    await this.waitForNewslettersToLoad()
  }
}