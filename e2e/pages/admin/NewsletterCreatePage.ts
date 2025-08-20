import { BasePage } from '../BasePage'

export class NewsletterCreatePage extends BasePage {
  protected subjectInput = 'input[name="subject"]'
  protected templateSelect = 'select[name="template_name"]'
  protected mdxEditor = 'textarea[name="content_mdx"]'
  protected veteransCheckbox = 'input[name="veteransOnly"]'
  protected newbiesCheckbox = 'input[name="newbiesOnly"]'
  protected activityTypeSelect = 'select[name="activityType"]'
  protected activityStatusSelect = 'select[name="activityStatus"]'
  protected eventAttendanceMinInput = 'input[name="eventAttendanceMin"]'
  protected eventAttendanceMaxInput = 'input[name="eventAttendanceMax"]'
  protected previewButton = 'button:has-text("Preview")'
  protected saveDraftButton = 'button:has-text("Save as Draft")'
  protected createButton = 'button:has-text("Create Newsletter")'
  protected sendButton = 'button:has-text("Send Now")'
  protected scheduleButton = 'button:has-text("Schedule")'
  protected recipientCount = '[data-testid="recipient-count"]'
  protected errorMessage = '[role="alert"]'
  protected previewModal = '[data-testid="preview-modal"]'
  protected scheduleDateInput = 'input[name="scheduled_at"]'

  async navigate() {
    await this.page.goto('/admin/newsletters/new')
    await this.waitForPageLoad()
  }

  async fillSubject(subject: string) {
    await this.page.waitForSelector(this.subjectInput, { state: 'visible', timeout: 10000 })
    await this.page.fill(this.subjectInput, subject)
  }

  async selectTemplate(template: 'event-announcement' | 'general-news') {
    await this.page.waitForSelector(this.templateSelect, { state: 'visible', timeout: 10000 })
    await this.page.selectOption(this.templateSelect, template)
  }

  async fillMDXContent(content: string) {
    await this.page.waitForSelector(this.mdxEditor, { state: 'visible', timeout: 10000 })
    await this.page.fill(this.mdxEditor, content)
  }

  async selectSegmentation(type: 'all' | 'basic' | 'advanced') {
    const radioButton = `input[name="segmentation"][value="${type}"]`
    await this.page.click(radioButton)
  }

  async toggleVeteransOnly() {
    await this.page.click(this.veteransCheckbox)
  }

  async toggleNewbiesOnly() {
    await this.page.click(this.newbiesCheckbox)
  }

  async selectActivityType(type: 'never_attended' | 'has_attended' | 'never_applied' | 'applied_never_attended') {
    await this.page.selectOption(this.activityTypeSelect, type)
  }

  async selectActivityStatus(status: 'inactive' | 'recent' | 'lapsed') {
    await this.page.selectOption(this.activityStatusSelect, status)
  }

  async setEventAttendanceCount(min?: number, max?: number) {
    if (min !== undefined) {
      await this.page.fill(this.eventAttendanceMinInput, min.toString())
    }
    if (max !== undefined) {
      await this.page.fill(this.eventAttendanceMaxInput, max.toString())
    }
  }

  async previewNewsletter() {
    await this.page.click(this.previewButton)
    await this.page.waitForSelector(this.previewModal, { state: 'visible' })
  }

  async saveAsDraft() {
    await this.page.click(this.saveDraftButton)
  }

  async sendImmediately() {
    // Wait for the page to be ready
    await this.page.waitForLoadState('networkidle')
    
    // Check which button is available
    const createButtonExists = await this.page.locator(this.createButton).isVisible().catch(() => false)
    const sendButtonExists = await this.page.locator(this.sendButton).isVisible().catch(() => false)
    
    if (createButtonExists) {
      await this.page.click(this.createButton)
    } else if (sendButtonExists) {
      await this.page.click(this.sendButton)
    } else {
      // If neither button is visible, wait a bit and try again
      await this.page.waitForTimeout(2000)
      
      // Try to find any button with "Send" or "Create" text
      const sendCreateButton = this.page.locator('button:has-text("Send"), button:has-text("Create Newsletter")')
      await sendCreateButton.first().click({ timeout: 10000 })
    }
    
    // Wait for navigation after clicking
    await this.page.waitForLoadState('networkidle')
  }

  async scheduleNewsletter(date: Date) {
    await this.page.click(this.scheduleButton)
    const dateString = date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
    await this.page.fill(this.scheduleDateInput, dateString)
    await this.page.click('button:has-text("Confirm Schedule")')
  }

  async getRecipientCount(): Promise<number> {
    const countText = await this.page.textContent(this.recipientCount)
    return parseInt(countText?.replace(/\D/g, '') || '0', 10)
  }

  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator(this.errorMessage).allTextContents()
    return errors
  }
}