import { BasePage } from '../BasePage'

export class NewsletterViewPage extends BasePage {
  protected subjectHeading = 'h1'
  protected statusBadge = '[data-testid="status-badge"]'
  protected templateInfo = '[data-testid="template-info"]'
  protected contentPreview = '[data-testid="content-preview"]'
  protected recipientsList = '[data-testid="recipients-list"]'
  protected sentDate = '[data-testid="sent-date"]'
  protected scheduledDate = '[data-testid="scheduled-date"]'
  protected editButton = 'a:has-text("Edit")'
  protected deleteButton = 'button:has-text("Delete")'
  protected backButton = 'a:has-text("Back to List")'
  protected analyticsSection = '[data-testid="analytics-section"]'

  async navigate(newsletterId: string) {
    await this.page.goto(`/admin/newsletters/view?id=${newsletterId}`)
    await this.waitForPageLoad()
  }

  async getSubject(): Promise<string> {
    const subject = await this.page.textContent(this.subjectHeading)
    return subject || ''
  }

  async getStatus(): Promise<string> {
    const status = await this.page.textContent(this.statusBadge)
    return status || ''
  }

  async getTemplate(): Promise<string> {
    const template = await this.page.textContent(this.templateInfo)
    return template || ''
  }

  async getContentPreview(): Promise<string> {
    const content = await this.page.textContent(this.contentPreview)
    return content || ''
  }

  async getRecipientCount(): Promise<number> {
    const recipientsText = await this.page.textContent(this.recipientsList)
    const match = recipientsText?.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  async getSentDate(): Promise<string | null> {
    const sentDate = await this.page.textContent(this.sentDate)
    return sentDate || null
  }

  async getScheduledDate(): Promise<string | null> {
    const scheduledDate = await this.page.textContent(this.scheduledDate)
    return scheduledDate || null
  }

  async clickEdit() {
    await this.page.click(this.editButton)
  }

  async clickDelete() {
    await this.page.click(this.deleteButton)
    // Wait for confirmation dialog and confirm
    await this.page.click('button:has-text("Confirm")')
  }

  async clickBackToList() {
    await this.page.click(this.backButton)
  }

  async getAnalytics() {
    const analyticsText = await this.page.textContent(this.analyticsSection)
    const sentMatch = analyticsText?.match(/Sent: (\d+)/)
    const failedMatch = analyticsText?.match(/Failed: (\d+)/)
    const bouncedMatch = analyticsText?.match(/Bounced: (\d+)/)
    
    return {
      sent: sentMatch ? parseInt(sentMatch[1], 10) : 0,
      failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
      bounced: bouncedMatch ? parseInt(bouncedMatch[1], 10) : 0
    }
  }
}