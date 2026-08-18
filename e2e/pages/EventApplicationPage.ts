import { type Locator, type Page, expect } from "@playwright/test"
import { getRulesFormQuestions } from "../../app/components/forms/custom/rules/rules-questions"
import { BasePage } from "./BasePage"

export class EventApplicationPage extends BasePage {
  // Rules page elements
  readonly rulesTitle: Locator
  readonly rulesTestTitle: Locator
  readonly continueButton: Locator
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

  /** The question on screen now, however the quiz got there. */
  async currentQuestionId(): Promise<string> {
    await this.questions.waitFor({ state: "visible", timeout: 10000 })

    const id = (await this.questions.getAttribute("id"))?.replace(
      /-prompt$/,
      "",
    )

    if (!id) throw new Error("no question is showing")

    return id
  }

  private choice(text: string): Locator {
    return this.page
      .locator("label")
      .filter({ has: this.page.getByText(text, { exact: true }) })
  }

  private async markCorrectAnswers(answers: {
    correct: string[]
    incorrect: string[]
  }): Promise<void> {
    // A single right answer is a radio, where clicking the right one replaces
    // whatever was picked before. Several are checkboxes, and a screen the quiz
    // reopens still carries the marks it was left with — so clicking a right
    // answer that is already marked would clear it.
    if (answers.correct.length === 1) {
      const option = this.choice(answers.correct[0])

      if (!(await option.locator("input").isChecked())) await option.click()

      return
    }

    for (const text of [...answers.correct, ...answers.incorrect]) {
      const option = this.choice(text)
      const wanted = answers.correct.includes(text)

      if ((await option.locator("input").isChecked()) !== wanted) {
        await option.click()
      }
    }
  }

  /**
   * Waits out the answer, and says whether the quiz moved. A save the server
   * refuses sends it back to the question it names, and the url mirrors the
   * question a beat later — one that lands after the quiz has already moved on
   * puts it back where it was. So an answer does not always advance, and the
   * caller answers again rather than treating a screen that stayed as a fault.
   */
  private async quizMovedOn(question: string): Promise<boolean> {
    const stopAt = Date.now() + 5000

    while (Date.now() < stopAt) {
      if (!this.page.url().includes("/regras")) return true

      // Bounded: between two screens the heading is detached, and an unbounded
      // read would sit there waiting for the next one to arrive.
      const heading = await this.questions
        .getAttribute("id", { timeout: 1000 })
        .catch(() => null)

      if (heading !== `${question}-prompt`) return true
    }

    return false
  }

  async answerCurrentQuestionCorrectly(): Promise<string> {
    const quiz = getRulesFormQuestions()
    const id = await this.currentQuestionId()
    const question = quiz[id as keyof typeof quiz]

    if (!question) {
      throw new Error(`the quiz is showing a question nobody knows: ${id}`)
    }

    await this.markCorrectAnswers(question.answers)
    await this.continueButton.click()
    await this.quizMovedOn(id)

    return id
  }

  /**
   * Walks to a question with a single right answer, answering the others along
   * the way. Only there does one wrong click leave the question unanswerable —
   * picking another radio replaces it, where a stray checkbox would linger.
   */
  async advanceToSingleAnswerQuestion(): Promise<string> {
    const quiz = getRulesFormQuestions()

    // Three times the questions, because an answer that does not advance is
    // answered again rather than counted as a screen gone by.
    for (let asked = 0; asked < Object.keys(quiz).length * 3; asked++) {
      const id = await this.currentQuestionId()
      const question = quiz[id as keyof typeof quiz]

      if (question?.answers.correct.length === 1) return id

      await this.answerCurrentQuestionCorrectly()
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

    // The last "Continuar" is the one that saves, and finishing the quiz leaves
    // the rules route — which is what says the walk is over, since the screen
    // is still mounted while the save is in flight. A refused save reopens
    // answered screens, and an answer does not always advance, so the walk is
    // longer than one screen per question; the cap is only there to stop a
    // runaway loop.
    for (let screens = 0; screens < Object.keys(quiz).length * 3; screens++) {
      if (!this.page.url().includes("/regras")) return

      await this.answerCurrentQuestionCorrectly()
    }

    throw new Error("the quiz never left the rules page")
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
