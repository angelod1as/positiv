import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

const testParticipant = {
  full_name: "Mock Participant",
  social_name: "Mockie",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  cpf: "12345678900",
  date_of_birth: "1990-02-05",
  phone: "11987654321",
  confirm_phone: "11987654321",
  how_came_to_us: "E2E TESTS",
  where_lives: "Internet",
}

export class BasicDataPOM {
  readonly page: Page
  readonly full_name: Locator
  readonly social_name: Locator
  readonly rg: Locator
  readonly rg_issuer: Locator
  readonly cpf: Locator
  readonly date_of_birth: Locator
  readonly phone: Locator
  readonly confirm_phone: Locator
  readonly how_came_to_us: Locator
  readonly where_lives: Locator
  readonly confirmButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    // TODO: correct locators

    this.full_name = page.getByRole("textbox", { name: "Nome completo" })
    this.social_name = page.getByRole("textbox", {
      name: "Nome social ou apelido",
    })
    this.rg = page.getByRole("textbox", { name: "RG", exact: true })
    this.rg_issuer = page.getByRole("textbox", { name: "Emissor do RG" })
    this.cpf = page.getByRole("textbox", { name: "CPF" })
    this.date_of_birth = page.getByRole("textbox", {
      name: "Data de nascimento",
    })
    this.phone = page.getByRole("spinbutton", { name: "Whatsapp", exact: true })
    this.confirm_phone = page.getByRole("spinbutton", {
      name: "Confirme seu whatsapp",
    })
    this.how_came_to_us = page.getByRole("textbox", {
      name: "Como chegou até nós?",
    })
    this.where_lives = page.getByRole("textbox", {
      name: "Em que cidade você mora?",
    })
    this.confirmButton = page.getByRole("button", { name: "Continuar" })
    this.errorMessage = page.getByText("No mínimo 2 caracteres").first()
  }

  async goto() {
    await this.page.goto(paths.dash.account.BASIC_DATA)
  }

  async testError() {
    await this.goto()
    await this.full_name.fill(testParticipant.full_name)
    await this.social_name.fill("a")
    await this.confirmButton.click()

    await expect(this.errorMessage).toBeVisible()
  }

  async testFillBasicData() {
    await this.goto()
    await this.full_name.fill(testParticipant.full_name)
    await this.social_name.fill(testParticipant.social_name)
    await this.rg.fill(testParticipant.rg)
    await this.rg_issuer.fill(testParticipant.rg_issuer)
    await this.cpf.fill(testParticipant.cpf)
    await this.date_of_birth.fill(testParticipant.date_of_birth)
    await this.phone.fill(testParticipant.phone)
    await this.confirm_phone.fill(testParticipant.confirm_phone)
    await this.how_came_to_us.fill(testParticipant.how_came_to_us)
    await this.where_lives.fill(testParticipant.where_lives)

    await this.confirmButton.click()
    await expect(this.page).toHaveURL(/conta$/)
  }

  async checkPrefilledBasicData() {}
}
