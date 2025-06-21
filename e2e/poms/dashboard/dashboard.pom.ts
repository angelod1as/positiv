import { expect, type Locator, type Page } from "@playwright/test"
import { EVENT_PAGE_REGEXP } from "~/lib/helpers/constants"
import paths from "~/lib/paths"

export class DashboardPOM {
  readonly page: Page
  readonly registrationOpenEventsSection: Locator
  readonly scheduledEventsSection: Locator
  readonly remindMeButton: Locator
  readonly applyButton: Locator
  readonly closedButton: Locator
  // Cancel
  readonly cancelButton: Locator
  readonly dialogCancel: Locator
  readonly dialogCancelApplicationButton: Locator
  readonly dialogCancelApplicationGoBackButton: Locator
  readonly eventPageUrlRegex: RegExp
  // Calendar
  readonly addToCalendarButton: Locator
  readonly dialogCalendar: Locator
  readonly dialogCalendarGoogleButton: Locator
  readonly dialogCalendarDownloadButton: Locator
  // RemindMe
  readonly dialogRemindMe: Locator
  readonly dialogRemindMeConfirmButton: Locator
  readonly cancelRemindMeButton: Locator
  readonly dialogCancelRemindMe: Locator
  readonly dialogCancelRemindMeConfirmButton: Locator

  constructor(page: Page) {
    this.page = page
    this.registrationOpenEventsSection = this.page.getByRole("heading", {
      name: "Inscrições abertas",
      exact: true,
    })
    this.scheduledEventsSection = this.page.getByRole("heading", {
      name: "Eventos agendados",
    })
    this.applyButton = this.page
      .getByRole("link", { name: "Fazer inscrição" })
      .first()
    this.closedButton = this.page
      .getByRole("link", { name: "Inscrições encerradas" })
      .first()

    // Applied user
    this.cancelButton = this.page
      .getByRole("button", { name: "Cancelar inscrição" })
      .first()

    // Dialog
    this.dialogCancel = this.page.getByRole("alertdialog", {
      name: "Cancelar inscrição",
    })
    this.dialogCancelApplicationGoBackButton = this.page.getByRole("button", {
      name: "🎉 Voltar",
    })
    this.dialogCancelApplicationButton = this.page.getByRole("button", {
      name: "😢 Cancelar",
    })
    this.eventPageUrlRegex = EVENT_PAGE_REGEXP

    // Calendar Dialog
    this.addToCalendarButton = this.page
      .getByRole("button", { name: "Adicionar ao Calendário" })
      .first()
    this.dialogCalendar = this.page.getByRole("dialog")
    this.dialogCalendarGoogleButton = this.page.getByRole("link", {
      name: "Google Calendar",
    })
    this.dialogCalendarDownloadButton = this.page.getByRole("link", {
      name: "Baixar arquivo iCal",
    })

    // RemindMe Dialog
    this.remindMeButton = this.page
      .getByRole("button", { name: "Me avise quando as inscrições abrirem" })
      .first()
    this.dialogRemindMe = this.page.getByRole("alertdialog", {
      name: "Receber um lembrete",
    })
    this.dialogRemindMeConfirmButton = this.page.getByRole("button", {
      name: "📅 Lembre-me!",
    })
    this.cancelRemindMeButton = this.page
      .getByRole("button", { name: "Cancelar aviso" })
      .first()
    this.dialogCancelRemindMe = this.page.getByRole("alertdialog", {
      name: "Cancelar lembrete",
    })
    this.dialogCancelRemindMeConfirmButton = this.page.getByRole("button", {
      name: "😢 Cancelar",
    })
  }

  async goto() {
    await this.page.goto(paths.dash.DASHBOARD)
  }

  async testBasicElements() {
    await expect(this.registrationOpenEventsSection).toBeVisible()
    await expect(this.scheduledEventsSection).toBeVisible()
    await expect(this.applyButton).toBeVisible()
    await expect(this.remindMeButton).toBeVisible()
    await expect(this.closedButton).toBeVisible()
  }

  async testNotAppliedButtons() {
    await expect(this.remindMeButton).toBeVisible()
    await expect(this.applyButton).toHaveAttribute(
      "href",
      this.eventPageUrlRegex,
    )
  }

  async testAppliedButtons() {
    await expect(this.remindMeButton).toBeVisible()
    await expect(this.closedButton).toBeDisabled()
    await expect(this.cancelButton).toBeVisible()
    await this.cancelButton.click()
    await expect(this.dialogCancel).toBeVisible()
    await expect(this.dialogCancelApplicationButton).toBeVisible()
    await expect(this.dialogCancelApplicationGoBackButton).toBeVisible()
  }

  async goToEventApplication() {
    await this.applyButton.click()
    await this.page.waitForURL(this.eventPageUrlRegex)
    await expect(this.page).toHaveURL(this.eventPageUrlRegex)
  }

  async testDownloadCalendar() {
    const downloadPromise = this.page.waitForEvent("download")

    await this.addToCalendarButton.click()
    await expect(this.dialogCalendar).toBeVisible()
    await expect(this.dialogCalendarGoogleButton).toHaveAttribute(
      "href",
      /calendar.google.com/,
    )
    await this.dialogCalendarDownloadButton.click()
    const download = await downloadPromise
    await expect(download.suggestedFilename()).toBe("calendar.ics")
    await expect(this.dialogCalendar).not.toBeVisible()
  }

  async cancelApplication() {
    await this.cancelButton.click()
    await expect(this.dialogCancel).toBeVisible()
    await expect(this.dialogCancelApplicationButton).toBeVisible()
    await this.dialogCancelApplicationButton.click()
    await expect(this.dialogCancel).not.toBeVisible()
    await expect(this.applyButton).toHaveAttribute(
      "href",
      this.eventPageUrlRegex,
    )
  }

  async testRemindMeFunction() {
    await this.remindMeButton.click()
    await expect(this.dialogRemindMe).toBeVisible()
    await expect(this.dialogRemindMeConfirmButton).toBeVisible()
    await this.dialogRemindMeConfirmButton.click()
    await expect(this.cancelRemindMeButton).toBeVisible()
  }

  async testCancelRemindMeFunction() {
    await this.cancelRemindMeButton.click()
    await expect(this.dialogCancelRemindMe).toBeVisible()
    await expect(this.dialogCancelRemindMeConfirmButton).toBeVisible()
    await this.dialogCancelRemindMeConfirmButton.click()
    await expect(this.remindMeButton).toBeVisible()
  }
}
