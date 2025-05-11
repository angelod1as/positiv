import { expect, type Locator, type Page } from "@playwright/test"
import { EVENT_PAGE_REGEXP } from "~/lib/helpers/constants"
import paths from "~/lib/paths"

export class DashboardPOM {
  readonly page: Page
  readonly registrationOpenEventsSection: Locator
  readonly scheduledEventsSection: Locator
  readonly applySoonButton: Locator
  readonly applyButton: Locator
  readonly cancelButton: Locator
  readonly dialog: Locator
  readonly dialogCancelApplication: Locator
  readonly dialogGoBack: Locator
  readonly eventPageUrlRegex: RegExp

  constructor(page: Page) {
    this.page = page
    this.registrationOpenEventsSection = this.page.getByRole("heading", {
      name: "Inscrições abertas",
      exact: true,
    })
    this.scheduledEventsSection = this.page.getByRole("heading", {
      name: "Eventos agendados",
    })
    this.applySoonButton = this.page
      .getByRole("button", { name: "Inscreva-se em breve" })
      .first()
    this.applyButton = this.page
      .getByRole("link", { name: "Fazer inscrição" })
      .first()

    // Applied user
    this.cancelButton = this.page
      .getByRole("button", { name: "Cancelar inscrição" })
      .first()

    // Dialog
    this.dialog = this.page.getByRole("alertdialog", {
      name: "Cancelar inscrição",
    })
    this.dialogGoBack = this.page.getByRole("button", { name: "🎉 Voltar" })
    this.dialogCancelApplication = this.page.getByRole("button", {
      name: "😢 Cancelar",
    })
    this.eventPageUrlRegex = EVENT_PAGE_REGEXP
  }

  async goto() {
    await this.page.goto(paths.dash.DASHBOARD)
  }

  async testBasicElements() {
    await expect(this.registrationOpenEventsSection).toBeVisible()
    await expect(this.scheduledEventsSection).toBeVisible()
    await expect(this.applyButton).toBeVisible()
    await expect(this.applySoonButton).toBeVisible()
  }

  async testNotAppliedButtons() {
    await expect(this.applySoonButton).toBeDisabled()
    await expect(this.applyButton).toHaveAttribute(
      "href",
      this.eventPageUrlRegex,
    )
  }

  async testAppliedButtons() {
    await expect(this.applySoonButton).toBeDisabled()
    await expect(this.cancelButton).toBeVisible()
    this.cancelButton.click()
    await expect(this.dialog).toBeVisible()
    await expect(this.dialogCancelApplication).toBeVisible()
    await expect(this.dialogGoBack).toBeVisible()
  }

  async goToEventApplication() {
    await this.applyButton.click()
    this.page.waitForURL(this.eventPageUrlRegex)
    expect(this.page).toHaveURL(this.eventPageUrlRegex)
  }

  async cancelApplication() {
    this.cancelButton.click()
    await expect(this.dialog).toBeVisible()
    await expect(this.dialogCancelApplication).toBeVisible()
    await this.dialogCancelApplication.click()
    await expect(this.dialog).not.toBeVisible()
    await expect(this.applyButton).toHaveAttribute(
      "href",
      this.eventPageUrlRegex,
    )
  }
}
