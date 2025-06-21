import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class AdminDashboardPOM {
  readonly page: Page
  readonly title: Locator
  readonly draftEvent: {
    row: Locator
    viewEventButton: Locator
    title: Locator
  }
  readonly scheduledEvent: {
    row: Locator
    viewEventButton: Locator
    title: Locator
    reminderWarning: Locator
  }
  readonly registrationOpenEvent: {
    row: Locator
    viewEventButton: Locator
    title: Locator
    sendReminderButton: Locator
  }
  readonly dialogSendEmails: Locator
  readonly dialogSendEmailsButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = this.page.getByText("Visão geral")
    this.draftEvent = {
      viewEventButton: this.page
        .getByRole("row", { name: /Evento Rascunho/ })
        .getByLabel("Ver evento"),
      row: this.page.getByText("Evento Rascunho"),
      title: this.page.getByText("📓 Evento Rascunho").first(),
    }
    this.scheduledEvent = {
      viewEventButton: this.page
        .getByRole("row", { name: /Evento Agendado 1/ })
        .getByLabel("Ver evento"),
      row: this.page.getByText("Evento Agendado 1"),
      title: this.page.getByText("📅 Evento Agendado 1").first(),
      reminderWarning: this.page.getByText("Lembretes: 1"),
    }
    this.registrationOpenEvent = {
      viewEventButton: this.page
        .getByRole("row", { name: /Evento Com Inscrições Abertas 1/ })
        .getByLabel("Ver evento"),
      row: this.page.getByText("Evento Com Inscrições Abertas 1"),
      title: this.page.getByText("🤗 Evento Com Inscrições Abertas 1").first(),
      sendReminderButton: this.page.getByRole("button", {
        name: "Enviar 1 email de lembrete",
      }),
    }
    this.dialogSendEmails = this.page.getByRole("alertdialog", {
      name: "Enviar emails de lembrete?",
    })
    this.dialogSendEmailsButton = this.page.getByRole("button", {
      name: "📨 Enviar",
    })
  }

  async goto() {
    await this.page.goto(paths.admin.ADMIN_DASHBOARD)
  }

  async testBasicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.scheduledEvent.row).toBeVisible()
    await expect(this.draftEvent.row).toBeVisible()
    await expect(this.registrationOpenEvent.row).toBeVisible()
  }

  async testRemindMeEmails() {
    // Draft
    await this.draftEvent.viewEventButton.click()
    await expect(this.draftEvent.title).toBeVisible()
    await expect(this.scheduledEvent.reminderWarning).not.toBeVisible()
    await expect(
      this.registrationOpenEvent.sendReminderButton,
    ).not.toBeVisible()
    await this.page.goBack()

    // Scheduled
    await this.scheduledEvent.viewEventButton.click()
    await expect(this.scheduledEvent.reminderWarning).toBeVisible()
    await expect(
      this.registrationOpenEvent.sendReminderButton,
    ).not.toBeVisible()
    await this.page.goBack()

    // Open Registration
    await this.registrationOpenEvent.viewEventButton.click()
    await expect(this.registrationOpenEvent.sendReminderButton).toBeVisible()
    await this.registrationOpenEvent.sendReminderButton.click()
    await expect(this.dialogSendEmails).toBeVisible()
    await this.dialogSendEmailsButton.click()
  }
}
