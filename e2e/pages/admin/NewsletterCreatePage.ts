import { BasePage } from '../BasePage'

export class NewsletterCreatePage extends BasePage {
  protected subjectInput = 'input[name="subject"]'
  protected templateSelect = 'select[name="template_name"]'
  protected mdxEditor = 'textarea[name="content_mdx"]'
  protected segmentTypeSelect = 'select[name="segment_type"]'
  protected excludeRejectedCheckbox = 'input[name="exclude_rejected"]'
  protected previewButton = 'button:has-text("Preview")'
  protected saveDraftButton = 'button:has-text("Save as Draft")'
  protected createButton = 'button:has-text("Create Newsletter")'
  protected sendButton = 'button:has-text("Send Now")'
  protected scheduleButton = 'button:has-text("Schedule")'
  protected errorMessage = '[role="alert"]'
  protected previewModal = '[data-testid="preview-modal"]'
  protected scheduleDateInput = 'input[name="scheduled_at"]'

  async navigate() {
    await this.page.goto('/admin/newsletters/new')
    await this.waitForPageLoad()
  }

  async fillSubject(subject: string) {
    // The element should already be visible after navigation
    await this.page.waitForSelector(this.subjectInput, { state: 'visible', timeout: 5000 })
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

  async selectSegmentation(type: 'all' | 'veterans' | 'newbies' | 'never_attended' | 'has_attended' | 'never_applied' | 'applied_never_attended') {
    await this.page.waitForSelector(this.segmentTypeSelect, { state: 'visible', timeout: 10000 })
    await this.page.selectOption(this.segmentTypeSelect, type)
  }

  async toggleExcludeRejected() {
    await this.page.click(this.excludeRejectedCheckbox)
  }

  async previewNewsletter() {
    await this.page.click(this.previewButton)
    await this.page.waitForSelector(this.previewModal, { state: 'visible' })
  }

  async saveAsDraft() {
    await this.page.click(this.saveDraftButton)
  }

  async sendImmediately() {
    // Just click the Create Newsletter button (it's a form submit button)
    await this.page.click(this.createButton)
  }

  async scheduleNewsletter(date: Date) {
    await this.page.click(this.scheduleButton)
    const dateString = date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
    await this.page.fill(this.scheduleDateInput, dateString)
    await this.page.click('button:has-text("Confirm Schedule")')
  }


  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator(this.errorMessage).allTextContents()
    return errors
  }
}