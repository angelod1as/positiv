import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class UserDataPOM {
  readonly page: Page
  readonly title: Locator
  readonly textContent: Locator
  readonly notesTextbox: Locator
  readonly bondRadio: Locator
  readonly continueButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = this.page.getByRole("heading", {
      name: "Quase lá!",
      exact: true,
    })
    this.textContent = this.page.getByText("Parabéns, você acertou tudo")
    this.notesTextbox = this.page.getByRole("textbox", {
      name: "Você tem alguma nota ou",
    })
    this.bondRadio = this.page.getByRole("radio", {
      name: "Só Vou Acompanhade",
    })
    this.continueButton = this.page.getByRole("button", {
      name: "🎉 Confirmar Inscrição!",
    })
  }

  async goto(eventId: string) {
    await this.page.goto(paths.dash.events.EVENT_DATA(eventId))
  }

  async testBasicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.textContent).toBeVisible()
    await expect(this.notesTextbox).toBeVisible()
    await expect(this.bondRadio).toBeVisible()
    await expect(this.continueButton).toBeVisible()
  }

  async fillUserDataForm() {
    await this.bondRadio.click()
    await expect(this.bondRadio).toBeChecked()
    await this.notesTextbox.fill("Sample notes!")
    await expect(this.notesTextbox).toHaveValue("Sample notes!")
  }

  async applyToEvent() {
    await this.continueButton.click()
    await expect(this.page).toHaveURL("dashboard")
  }
}
