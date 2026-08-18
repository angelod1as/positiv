import { type Locator, type Page, expect } from "@playwright/test"
import { getRulesFormQuestions } from "../../app/components/forms/custom/rules/rules-questions"
import { BasePage } from "./BasePage"

export class EventApplicationPage extends BasePage {
  // Rules page elements
  readonly rulesTitle: Locator
  readonly rulesTestTitle: Locator
  readonly continueButton: Locator
  readonly requiredError: Locator
  readonly questions: Locator

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
    this.requiredError = page.getByText("Campo obrigatório", { exact: true })
    // One question shows at a time, and the presentation labels its control
    // with the prompt heading.
    this.questions = page.locator('h2[id$="-prompt"]')

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
      name: "🎉 Enviar candidatura!",
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

  async isOnUserDataPage(): Promise<boolean> {
    try {
      await this.userDataTitle.waitFor({ state: "visible", timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  async currentQuestionId(after?: string): Promise<string> {
    await this.questions.waitFor({ state: "visible", timeout: 10000 })

    // The heading is the same element from one screen to the next, so a stale
    // read here would have the caller looking for answers that are no longer on
    // the page.
    if (after) {
      await expect(this.questions).not.toHaveAttribute(
        "id",
        `${after}-prompt`,
        { timeout: 10000 },
      )
    }

    const id = (await this.questions.getAttribute("id"))?.replace(
      /-prompt$/,
      "",
    )

    if (!id) throw new Error("no question is showing")

    return id
  }

  async answerCurrentQuestionCorrectly(previous?: string): Promise<string> {
    const quiz = getRulesFormQuestions()
    const id = await this.currentQuestionId(previous)
    const question = quiz[id as keyof typeof quiz]

    if (!question) {
      throw new Error(`the quiz is showing a question nobody knows: ${id}`)
    }

    for (const right of question.answers.correct) {
      await this.page.getByText(right, { exact: true }).click()
    }

    await this.continueButton.click()

    return id
  }

  /**
   * Walks to a question with a single right answer, answering the others along
   * the way. Only there does one wrong click leave the question unanswerable —
   * picking another radio replaces it, where a stray checkbox would linger.
   */
  async advanceToSingleAnswerQuestion(): Promise<string> {
    const quiz = getRulesFormQuestions()
    let previous: string | undefined

    for (let asked = 0; asked < Object.keys(quiz).length; asked++) {
      const id = await this.currentQuestionId(previous)
      const question = quiz[id as keyof typeof quiz]

      if (question?.answers.correct.length === 1) return id

      previous = await this.answerCurrentQuestionCorrectly(previous)
    }

    throw new Error("the quiz asked nothing with a single right answer")
  }

  async answerCurrentQuestionWrongly(): Promise<string> {
    const quiz = getRulesFormQuestions()
    const id = await this.currentQuestionId()
    const question = quiz[id as keyof typeof quiz]

    await this.page
      .getByText(question.answers.incorrect[0], { exact: true })
      .click()
    await this.continueButton.click()

    return id
  }

  async fillRulesForm(): Promise<void> {
    await expect(this.rulesTitle).toBeVisible({ timeout: 10000 })

    const quiz = getRulesFormQuestions()
    let previous: string | undefined

    // One screen per question, and the last "Continuar" is the one that saves,
    // so the caller has nothing left to click afterwards. The quiz may already
    // be part-answered, so this stops when the questions run out rather than
    // after a fixed count.
    for (let asked = 0; asked < Object.keys(quiz).length; asked++) {
      const showing = await this.questions
        .isVisible({ timeout: 2000 })
        .catch(() => false)

      if (!showing) return

      previous = await this.answerCurrentQuestionCorrectly(previous)
    }
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click()

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
    if (await this.isOnRulesPage()) {
      // The quiz's own last "Continuar" saves, so there is nothing left to
      // click after it.
      await this.fillRulesForm()
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
