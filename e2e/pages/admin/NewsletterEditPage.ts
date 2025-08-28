import { NewsletterCreatePage } from './NewsletterCreatePage'

export class NewsletterEditPage extends NewsletterCreatePage {
  protected updateButton = 'button:has-text("Atualizar Newsletter"), button:has-text("Atualizar")'
  protected cancelButton = 'a:has-text("Cancelar"), button:has-text("Cancelar")'

  async navigateToEdit(newsletterId: string) {
    await this.page.goto(`/admin/newsletters/edit?id=${newsletterId}`)
    await this.waitForPageLoad()
  }

  async updateNewsletter() {
    // Select draft status if the field exists
    await this.selectStatus('draft')
    await this.page.click(this.updateButton)
  }

  async cancelEdit() {
    await this.page.click(this.cancelButton)
  }

  async isFieldDisabled(fieldName: string): Promise<boolean> {
    const field = this.page.locator(`[name="${fieldName}"]`)
    const isDisabled = await field.isDisabled()
    return isDisabled
  }

  async canEditStatus(): Promise<boolean> {
    // Draft newsletters can be edited fully
    // Scheduled newsletters can have their schedule changed
    // Sent newsletters cannot be edited
    const statusText = await this.page.textContent('[data-testid="current-status"]')
    return statusText?.toLowerCase() !== 'sent'
  }
}