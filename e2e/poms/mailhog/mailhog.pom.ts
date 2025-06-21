import { expect, type Locator, type Page } from "@playwright/test"

/* This POM is made for testing the transaction emails */
export class MailhogPOM {
  readonly page: Page
  readonly headerLink: Locator
  readonly eventMail: {
    subject: Locator
    heading: Locator
  }
  readonly reminderEmail: {
    subject: Locator
    heading: Locator
  }

  constructor(page: Page) {
    this.page = page
    this.headerLink = this.page.getByRole("link", { name: "MailHog" })
    this.eventMail = {
      subject: this.page.getByText("Você se inscreveu no evento").first(),
      heading: this.page
        .locator("#preview-html")
        .contentFrame()
        .getByRole("heading", { name: "Sua inscrição foi recebida" })
        .first(),
    }
    this.reminderEmail = {
      subject: this.page
        .getByText(
          "Inscrições abertas para o evento 🤗 Evento Com Inscrições Abertas 1",
        )
        .first(),
      heading: this.page
        .locator("#preview-html")
        .contentFrame()
        .getByRole("heading", { name: "Inscrições abertas!" })
        .first(),
    }
  }

  async goto() {
    await this.page.goto("http://0.0.0.0:8025/")
  }

  async testBasicElements() {
    await expect(this.headerLink).toBeVisible()
  }

  async testApplicationEmail() {
    const { subject, heading } = this.eventMail
    await expect(subject).toBeVisible({ timeout: 10_000 })
    await subject.click()
    await expect(heading).toBeVisible()
  }

  async testReminderEmail() {
    const { subject, heading } = this.reminderEmail
    await expect(subject).toBeVisible({ timeout: 10_000 })
    await subject.click()
    await expect(heading).toBeVisible()
  }
}
