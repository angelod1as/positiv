import { type Locator, type Page, expect } from "@playwright/test"
import { BasePage } from "./BasePage"

export class PaymentPage extends BasePage {
  readonly heading: Locator
  readonly payButton: Locator
  readonly paymentSelect: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole("heading", { level: 1 })
    this.payButton = page.getByRole("button", { name: "Pagar" })
    this.paymentSelect = page.locator("select")
  }

  async navigate(eventParticipantId: string) {
    await this.navigateTo(`/pagamento/${eventParticipantId}`)
  }

  async expectReadyState(eventName: string) {
    await expect(this.heading).toHaveText("Pagamento")
    await expect(this.page.getByText(eventName)).toBeVisible()
    await expect(this.payButton).toBeVisible()
  }

  async expectAlreadyPaidState() {
    await expect(this.heading).toHaveText("Pagamento já realizado")
  }

  async expectExpiredState() {
    await expect(this.heading).toHaveText("Link expirado")
  }

  async getPaymentOptionTexts(): Promise<string[]> {
    const options = this.paymentSelect.locator("option")
    const texts = await options.allTextContents()
    return texts.filter((t) => t.trim() !== "")
  }

  async selectPaymentOption(value: string): Promise<void> {
    await this.paymentSelect.selectOption(value)
  }

  async submitPayment(): Promise<void> {
    await this.payButton.click()
  }

  async submitAndWaitForRedirect(value: string): Promise<string> {
    await this.selectPaymentOption(value)
    await Promise.all([
      this.page.waitForURL(/\/mock-invoice\//, { timeout: 15000 }),
      this.payButton.click(),
    ])
    return this.page.url()
  }
}
