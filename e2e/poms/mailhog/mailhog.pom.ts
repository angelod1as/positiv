import { expect, type Page } from "@playwright/test"

/* This POM is made for testing the transaction emails */
export class MailhogPOM {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("http://0.0.0.0:8025/")
  }

  async testBasicElements() {
    await expect(this.page.getByRole("link", { name: "MailHog" })).toBeVisible()
  }

  async testApplicationEmail() {
    const subject = this.page.getByText("Você se inscreveu no evento")
    await expect(subject).toBeVisible()

    await subject.click()
    await expect(
      this.page.getByRole("heading", { name: "Nos vemos em breve!" }),
    ).toBeVisible()
  }
}
