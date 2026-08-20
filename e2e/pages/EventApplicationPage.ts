import { type Locator, type Page, expect } from "@playwright/test"
import { getRulesFormQuestions } from "../../app/components/forms/custom/rules/rules-questions"
import { formRuntimeCopy } from "../../app/copy/forms"
import { BasePage } from "./BasePage"

// Long enough that waiting on the quiz costs a handful of reads rather than a
// tight loop of them, short enough to be invisible against a screen change.
const POLL_INTERVAL = 50

// How long either wait gives the quiz before carrying on with what is there:
// past this, whatever is on screen is what the walk answers.
const SETTLE_BUDGET = 5000

export class EventApplicationPage extends BasePage {
  // Rules page elements
  readonly rulesTitle: Locator
  readonly rulesTestTitle: Locator
  readonly continueButton: Locator
  readonly questions: Locator

  // What went oddly along the way, kept for the error message of a walk that
  // runs out of screens. A walk clears them as it starts, so a note never ends
  // up explaining a failure it had nothing to do with.
  private walkNotes: string[] = []

  // User data page elements
  readonly userDataTitle: Locator
  readonly notesTextbox: Locator
  readonly referredTextbox: Locator
  readonly bondRadioButtons: Locator
  readonly confirmButton: Locator

  // Confirmation page elements
  readonly confirmationTitle: Locator
  readonly backToDashboardButton: Locator

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

    // Confirmation page
    this.confirmationTitle = page.getByRole("heading", {
      name: "Candidatura enviada! 🎉",
      exact: true,
    })
    this.backToDashboardButton = page.getByRole("link", {
      name: "Voltar para o painel",
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

  private async questionOnScreen(): Promise<string | null> {
    // Bounded: between two screens the heading is detached, and an unbounded
    // read would sit there waiting for the next one to arrive.
    const id = await this.questions
      .getAttribute("id", { timeout: 1000 })
      .catch(() => null)

    return id?.replace(/-prompt$/, "") ?? null
  }

  /**
   * The question on screen now, however the quiz got there — but only once the
   * url agrees. The quiz mirrors its question in `?q=` a beat later, and a
   * mirror that lands after the quiz has moved on puts it back on the question
   * it names. Answering into that leaves the click chasing a screen that keeps
   * being replaced, so this waits for the two to say the same thing.
   */
  async currentQuestionId(): Promise<string> {
    await this.questions.waitFor({ state: "visible", timeout: 10000 })

    const stopAt = Date.now() + SETTLE_BUDGET
    let showing = await this.questionOnScreen()

    while (Date.now() < stopAt) {
      const mirrored = new URL(this.page.url()).searchParams.get("q")

      if (showing && showing === mirrored) return showing

      await this.page.waitForTimeout(POLL_INTERVAL)
      showing = await this.questionOnScreen()
    }

    if (!showing) throw new Error("no question is showing")

    // They can disagree for a moment, because the page writes `?q=` a beat
    // after the quiz moves. Lining them up keeps a click from landing while the
    // screen is being replaced — but a disagreement that outlasts the wait is
    // no longer dangerous, since the page ignores a mirror it wrote itself, so
    // the walk answers what is on screen. It is written down all the same, for
    // the error a stuck walk raises.
    this.note(`the question on screen (${showing}) and ?q= never lined up`)

    return showing
  }

  private note(what: string): void {
    if (!this.walkNotes.includes(what)) this.walkNotes.push(what)
  }

  private whatWentOddly(): string {
    return this.walkNotes.length > 0
      ? `. Along the way: ${this.walkNotes.join("; ")}`
      : ""
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
      await this.mark(answers.correct[0], true)

      return
    }

    for (const text of [...answers.correct, ...answers.incorrect]) {
      await this.mark(text, answers.correct.includes(text))
    }
  }

  private async mark(text: string, wanted: boolean): Promise<void> {
    const option = this.choice(text)
    const input = option.locator("input")

    const marked = await input
      .isChecked({ timeout: 2000 })
      .catch(() => null)

    if (marked === wanted) return

    // Unread, not unmarked. Clicking on a guess would clear an answer that is
    // already right, which is the very thing this method exists to avoid, and
    // the walk comes round again anyway.
    if (marked === null) {
      this.note(`could not read whether an answer was marked: "${text.slice(0, 40)}…"`)
      return
    }

    await this.clickAndTolerate(option, `answer "${text.slice(0, 40)}…"`)
  }

  /**
   * A screen replaced under the click loses the element, and the walk answers
   * whatever is on screen when it comes round again — so a click that does not
   * land is not a fault in itself. It is remembered all the same: a walk that
   * runs out of screens can then say which click kept missing, instead of
   * leaving whoever reads the failure to find it in the trace.
   */
  private async clickAndTolerate(target: Locator, what: string): Promise<void> {
    try {
      await target.click({ timeout: 5000 })
    } catch (error) {
      const [reason] = String(error).split("\n")
      this.note(`a click kept missing — ${what}: ${reason}`)
    }
  }

  /**
   * Waits out the answer. A save the server refuses sends the quiz back to the
   * question it names, so an answer does not always advance — a screen that
   * stayed is answered again by the walk rather than treated as a fault, which
   * is why nothing here reports a verdict.
   */
  private async waitOutAnswer(question: string): Promise<void> {
    const stopAt = Date.now() + SETTLE_BUDGET

    while (Date.now() < stopAt) {
      if (!this.page.url().includes("/regras")) return

      if ((await this.questionOnScreen()) !== question) return

      await this.page.waitForTimeout(POLL_INTERVAL)
    }

    // A refused save reopens the question it names, and that can be the one
    // just answered — the screen never changes and the whole budget goes by.
    // The walk answers it again, which is right, but a run that spends seconds
    // here should be able to say so.
    this.note(`"${question}" was still on screen a full wait after answering it`)
  }

  async answerCurrentQuestionCorrectly(): Promise<string> {
    const quiz = getRulesFormQuestions()
    const id = await this.currentQuestionId()
    const question = quiz[id as keyof typeof quiz]

    if (!question) {
      throw new Error(`the quiz is showing a question nobody knows: ${id}`)
    }

    await this.markCorrectAnswers(question.answers)
    await this.clickAndTolerate(this.continueButton, "Continuar")
    await this.waitOutAnswer(id)

    return id
  }

  /**
   * Walks to a question with a single right answer, answering the others along
   * the way. Only there does one wrong click leave the question unanswerable —
   * picking another radio replaces it, where a stray checkbox would linger.
   */
  async advanceToSingleAnswerQuestion(): Promise<string> {
    this.walkNotes = []

    const quiz = getRulesFormQuestions()

    // Three times the questions, because an answer that does not advance is
    // answered again rather than counted as a screen gone by.
    for (let asked = 0; asked < Object.keys(quiz).length * 3; asked++) {
      const id = await this.currentQuestionId()
      const question = quiz[id as keyof typeof quiz]

      if (question?.answers.correct.length === 1) return id

      await this.answerCurrentQuestionCorrectly()
    }

    throw new Error(
      `the quiz asked nothing with a single right answer${this.whatWentOddly()}`,
    )
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

  /**
   * How many screens the quiz says are left. It revises as the run goes: a
   * veteran is promised three, and the moment a second first-attempt mistake is
   * recorded the whole quiz appears in its place, which is the branch happening
   * with nothing else to announce it.
   */
  async currentProgress(): Promise<{ index: number; total: number }> {
    // Named, because the app draws a progress bar of its own while a page
    // loads and an unnamed role matches both.
    const text = await this.page
      .getByRole("progressbar", { name: formRuntimeCopy.progressLabel })
      .getAttribute("aria-valuetext")

    const [, index, total] = /Etapa (\d+) de (\d+)/.exec(text ?? "") ?? []

    if (!index || !total) {
      throw new Error(`the quiz shows no progress to read: "${text}"`)
    }

    return { index: Number(index), total: Number(total) }
  }

  async fillRulesForm(): Promise<void> {
    this.walkNotes = []

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

    throw new Error(`the quiz never left the rules page${this.whatWentOddly()}`)
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

    // The form saves over fetch and moves the router itself, so there is no
    // document navigation to wait for — the url is what says it went through.
    await this.confirmButton.click()

    // A successful application lands on its own confirmation page
    await expect(this.page).toHaveURL(/candidatura-enviada/, { timeout: 15000 })
    await expect(this.confirmationTitle).toBeVisible({ timeout: 10000 })
  }

  async returnToDashboard(): Promise<void> {
    await expect(this.backToDashboardButton).toBeVisible()
    await this.clickAndWait(this.backToDashboardButton, {
      waitForNavigation: true,
    })

    await expect(this.page).toHaveURL(/\/dashboard$/)
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

    // Walk back to the dashboard so callers continue from a known page
    await this.returnToDashboard()
  }

  async verifyValidationError(errorText: string): Promise<void> {
    const error = this.page.getByText(errorText)
    await expect(error).toBeVisible()
  }
}
