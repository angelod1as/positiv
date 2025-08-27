import { BasePage } from '../BasePage'

export class NewsletterCreatePage extends BasePage {
  protected subjectInput = 'input[name="subject"]'
  protected templateSelect = 'select[name="template_name"]'
  protected mdxEditor = 'textarea[name="content_mdx"]'
  protected segmentTypeSelect = 'select[name="segment_type"]'
  protected statusSelect = 'select[name="status"]'
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

  async selectStatus(status: 'draft' | 'scheduled') {
    const statusSelect = await this.page.locator(this.statusSelect)
    if (await statusSelect.count() > 0) {
      await this.page.selectOption(this.statusSelect, status)
    }
  }

  async previewNewsletter() {
    await this.page.click(this.previewButton)
    await this.page.waitForSelector(this.previewModal, { state: 'visible' })
  }

  async saveAsDraft() {
    // Select draft status if the field exists
    await this.selectStatus('draft')
    // Click the Create Newsletter button (form submit)
    await this.page.click(this.createButton)
  }

  async sendImmediately() {
    // Click the Send Now button to send immediately
    await this.page.click(this.sendButton)
    await this.waitForPageLoad()
    await this.page.waitForLoadState('networkidle')
  }

  async scheduleNewsletter(date: Date) {
    await this.page.click(this.scheduleButton)
    await this.page.waitForSelector(this.scheduleDateInput, { state: 'visible', timeout: 5000 })
    const dateString = date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm for datetime-local
    await this.page.fill(this.scheduleDateInput, dateString)
    await this.page.click('button:has-text("Confirm Schedule")')
    await this.page.waitForSelector(this.scheduleDateInput, { state: 'detached', timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
  }


  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator(this.errorMessage).allTextContents()
    return errors
  }
}