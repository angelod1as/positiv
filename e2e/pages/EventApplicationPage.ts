import { type Locator, type Page, expect } from "@playwright/test"
import { BasePage } from "./BasePage"

export class EventApplicationPage extends BasePage {
  // Rules page elements
  readonly rulesTitle: Locator
  readonly rulesTestTitle: Locator
  readonly continueButton: Locator
  readonly requiredError: Locator
  readonly questions: Locator

  // BDSM consent page elements
  readonly bdsmTitle: Locator
  readonly bdsmContinueButton: Locator
  readonly bdsmCheckbox: Locator

  // User data page elements
  readonly userDataTitle: Locator
  readonly notesTextbox: Locator
  readonly referredTextbox: Locator
  readonly bondRadioButtons: Locator
  readonly confirmButton: Locator

  constructor(page: Page) {
    super(page)

    // Rules page
    this.rulesTitle = page.getByRole("heading", {
      name: "Regras e filosofias",
      exact: true,
    })
    this.rulesTestTitle = page.getByRole("heading", {
      name: "✅ Hora do teste! ✅",
      exact: true,
    })
    this.continueButton = page.getByRole("button", { name: "Continuar" })
    this.requiredError = page.getByText("Há erros nas suas respostas", {
      exact: true,
    })
    this.questions = page.locator('div[data-testid="question"]')

    // BDSM consent page
    this.bdsmTitle = page.getByRole("heading", {
      name: "Consentimento BDSM",
      exact: true,
    })
    this.bdsmContinueButton = page.getByRole("button", { name: "Continuar" })
    this.bdsmCheckbox = page.getByRole("checkbox")

    // User data page
    this.userDataTitle = page.getByRole("heading", {
      name: "Quase lá!",
      exact: true,
    })
    this.notesTextbox = page.getByRole("textbox", { name: /nota ou/ })
    this.referredTextbox = page.getByRole("textbox", {
      name: /Você foi indicade por alguém/,
    })
    this.bondRadioButtons = page.locator('input[type="radio"]')
    this.confirmButton = page.getByRole("button", {
      name: "🎉 Confirmar Inscrição!",
    })
  }

  async isOnRulesPage(): Promise<boolean> {
    try {
      await this.rulesTitle.waitFor({ state: "visible", timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  async isOnBDSMConsentPage(): Promise<boolean> {
    try {
      await this.bdsmTitle.waitFor({ state: "visible", timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  async isOnUserDataPage(): Promise<boolean> {
    try {
      await this.userDataTitle.waitFor({ state: "visible", timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  async fillRulesForm(): Promise<void> {
    await expect(this.rulesTitle).toBeVisible({ timeout: 10000 })

    // Wait for form to be ready
    await this.page.waitForTimeout(1000)

    // Answer specific known questions by clicking the correct text
    // These are the typical correct answers in the rules form
    const correctAnswers = [
      "Não. A regra é simples: ninguém é obrigade a nada",
      "a afirmação está incorreta, o uso de camisinha",
      "a afirmação está incorreta e até mesmo casais",
      "Chamarei ou procurarei um membro da equipe organizadora",
      "Ninguém!",
      'conversarem juntes e só continuarem quando TODAS as pessoas disserem "sim"',
      "Tira ele do evento né?!",
      "os organizadores sabem com quem o participante veio junto",
      "é perguntar",
      "Não vai não, bem poupade",
      "NÃO",
    ]

    // Click each correct answer if visible
    for (const answer of correctAnswers) {
      const element = this.page.locator(`text="${answer}"`)
      if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
        await element.click()
      }
    }

    // Also handle any remaining radio questions by clicking the last option
    const uncheckedRadios = await this.page
      .locator('div[data-testid="question"] input[type="radio"]:not(:checked)')
      .all()
    const processedGroups = new Set<string>()

    for (const radio of uncheckedRadios) {
      const name = await radio.getAttribute("name")
      if (name && !processedGroups.has(name)) {
        processedGroups.add(name)
        const lastInGroup = this.page
          .locator(`input[type="radio"][name="${name}"]`)
          .last()
        await lastInGroup.click()
      }
    }

    // Wait for form to update
    await this.page.waitForTimeout(500)
  }

  async fillBDSMConsentForm(): Promise<void> {
    await expect(this.bdsmTitle).toBeVisible({ timeout: 10000 })

    // Find all checkboxes (consent items)
    const checkboxes = await this.bdsmCheckbox.all()

    // Check all consent checkboxes
    for (const checkbox of checkboxes) {
      if (!(await checkbox.isChecked())) {
        await checkbox.click()
      }
    }
  }

  async clickContinue(): Promise<void> {
    const isBDSM = await this.isOnBDSMConsentPage()
    const button = isBDSM ? this.bdsmContinueButton : this.continueButton

    await button.click()

    // Don't wait for navigation if we expect validation errors
    await this.page.waitForTimeout(1000)
  }

  async fillUserDataForm(
    notes?: string,
    referred?: string,
    bondType?: string,
  ): Promise<void> {
    await expect(this.userDataTitle).toBeVisible({ timeout: 10000 })

    // Fill notes if provided
    if (notes) {
      await this.fillAndVerify(this.notesTextbox, notes)
    }

    // Fill referred field (required field, default to 'ninguém')
    await this.fillAndVerify(this.referredTextbox, referred || "ninguém")

    // Select bond type radio button
    if (bondType) {
      const bondRadio = this.page.getByRole("radio", { name: bondType })
      await bondRadio.click()
      await expect(bondRadio).toBeChecked()
    } else {
      // Default to first option
      const firstRadio = this.bondRadioButtons.first()
      await firstRadio.click()
      await expect(firstRadio).toBeChecked()
    }
  }

  async submitApplication(): Promise<void> {
    await expect(this.confirmButton).toBeVisible()
    await this.clickAndWait(this.confirmButton, { waitForNavigation: true })

    // Should redirect to dashboard after successful submission
    await expect(this.page).toHaveURL(/dashboard/)
  }

  async completeFullApplication(options?: {
    notes?: string
    referred?: string
    bondType?: string
  }): Promise<void> {
    // Handle rules or BDSM consent page
    if (await this.isOnRulesPage()) {
      await this.fillRulesForm()
      await this.clickContinue()
    } else if (await this.isOnBDSMConsentPage()) {
      await this.fillBDSMConsentForm()
      await this.clickContinue()
    }

    // Wait for user data page
    await expect(this.userDataTitle).toBeVisible({ timeout: 10000 })

    // Fill user data form
    await this.fillUserDataForm(
      options?.notes || "Test application notes",
      options?.referred || "ninguém",
      options?.bondType,
    )

    // Submit application
    await this.submitApplication()
  }

  async verifyValidationError(errorText: string): Promise<void> {
    const error = this.page.getByText(errorText)
    await expect(error).toBeVisible()
  }
}
