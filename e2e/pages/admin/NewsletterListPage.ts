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
    // Wait for the button to be visible first
    await this.page.waitForSelector(this.createButton, { state: 'visible', timeout: 10000 })
    await this.page.click(this.createButton)
  }

  async getNewsletterRow(subject: string) {
    const row = this.page.locator(`${this.newsletterTable} tr:has-text("${subject}")`)
    await row.waitFor({ state: 'visible' })
    return row
  }

  async clickViewNewsletter(subject: string) {
    const row = await this.getNewsletterRow(subject)
    await row.locator('text="View"').click()
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