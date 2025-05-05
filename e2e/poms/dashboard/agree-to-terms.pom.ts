import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

// TODO: THIS IS A MOCK PAGE
export class AgreeToTermsPOM {
  readonly page: Page
  readonly editBasicDataButton: Locator
  readonly fillBasicDataButton: Locator
  readonly changePasswordButton: Locator
  readonly logoutButton: Locator
  readonly deleteAccountButton: Locator

  constructor(page: Page) {
    this.page = page
    // TODO: correct locators
    this.editBasicDataButton = page.getByRole("link", { name: "" })
    this.fillBasicDataButton = page.getByRole("link", { name: "" })
    this.changePasswordButton = page.getByRole("link", { name: "" })
    this.logoutButton = page.getByRole("link", { name: "" })
    this.deleteAccountButton = page.getByRole("link", { name: "" })
  }

  async goto() {
    await this.page.goto(paths.dash.account.ACCOUNT)
  }

  async testBasicElements(options?: { filledData: boolean }) {
    const { filledData = true } = options || {}

    if (filledData) {
      await expect(this.editBasicDataButton).toBeVisible()
    } else {
      await expect(this.fillBasicDataButton).toBeVisible()
    }

    await expect(this.changePasswordButton).toBeVisible()
    await expect(this.logoutButton).toBeVisible()
    await expect(this.deleteAccountButton).toBeVisible()
  }
}
