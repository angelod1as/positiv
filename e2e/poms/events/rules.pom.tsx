import { expect, type Locator, type Page } from "@playwright/test"
import { EVENT_PAGE_REGEXP } from "~/lib/helpers/constants"
import paths from "~/lib/paths"
import { rulesFormQuestions } from "~/pages/events/rules/rules-form/rules-questions"

export class RulesPOM {
  readonly page: Page
  readonly eventPageUrlRegex: RegExp
  readonly title: Locator
  readonly textContent: Locator
  readonly testTitle: Locator
  readonly sampleQuestion: Locator
  readonly applyButton: Locator
  readonly requiredError: Locator
  readonly dialog: Locator
  readonly dialogCancel: Locator
  readonly dialogConfirm: Locator
  readonly radio: {
    question: Locator
    wrong: Locator
    correct: Locator
    error: Locator
  }
  readonly selection: {
    question: Locator
    incorrectFirst: Locator
    correctFirst: Locator
    correctSecond: Locator
    wrongSelectionError: Locator
    almostAllSelectionError: Locator
    oneIncorrectSelectionError: Locator
  }

  constructor(page: Page) {
    this.page = page
    this.eventPageUrlRegex = EVENT_PAGE_REGEXP
    this.title = this.page.getByRole("heading", {
      name: "Regras e filosofias",
      exact: true,
    })
    this.testTitle = this.page.getByRole("heading", {
      name: "✅ Hora do teste! ✅",
      exact: true,
    })
    this.sampleQuestion = this.page
      .getByText("Quais afirmações estão corretas?")
      .first()
    this.textContent = this.page.getByText("Vamos ao que interessa:")
    this.applyButton = this.page.getByRole("button", { name: "Inscrever-se" })

    // Dialog
    this.dialog = this.page.getByRole("alertdialog", {
      name: "Confirmar inscrição",
    })
    this.dialogCancel = this.page.getByRole("button", { name: "😢 Cancelar" })
    this.dialogConfirm = this.page.getByRole("button", {
      name: "🎉 Confirmar!",
    })

    // Errors
    this.requiredError = this.page
      .getByTestId("question")
      .first()
      .getByText("Obrigatório")

    const sampleRadio = this.page.locator('div[data-testid="question"]', {
      hasText:
        "Nossas regras dizem que, como a Positiv é uma festa de gente pelada, todo mundo precisa tirar a roupa durante o evento.",
    })
    this.radio = {
      question: sampleRadio,
      correct: sampleRadio.getByText(
        "Não. A regra é simples: ninguém é obrigade a nada. Se quiser ficar de roupa, pode, se quiser ficar pelade, pode também",
      ),
      wrong: sampleRadio.getByText(
        "Sim, claro! Por que alguém iria a uma suruba para ficar vestide?",
      ),
      error: sampleRadio.getByText("Você escolheu a resposta errada"),
    }

    const sampleSelection = this.page.locator('div[data-testid="question"]', {
      hasText: "O uso de camisinha é opcional durante a festa.",
    })
    this.selection = {
      question: sampleSelection,
      incorrectFirst: sampleSelection.getByText(
        "a afirmação está correta, porque todes são obrigades a enviar exames de ISTs para os organizadores",
      ),
      correctFirst: sampleSelection.getByText(
        "a afirmação está incorreta, o uso de camisinha interna ou externa, é obrigatório",
      ),
      correctSecond: sampleSelection.getByText(
        "a afirmação está incorreta e até mesmo casais que não usam camisinha fora da festa são obrigados a usar durante a festa",
      ),
      wrongSelectionError: sampleSelection.getByText(
        "Nenhuma das respostas selecionadas está correta",
      ),
      almostAllSelectionError: sampleSelection.getByText(
        "Você não selecionou todas as respostas corretas",
      ),
      oneIncorrectSelectionError: sampleSelection.getByText(
        "Você selecionou uma ou mais respostas incorretas",
      ),
    }
  }

  async goto(eventId: string) {
    await this.page.goto(paths.dash.participant.events.EVENT_VIEW(eventId))
  }

  async testBasicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.textContent).toBeVisible()
    await expect(this.testTitle).toBeVisible()
    await expect(this.sampleQuestion).toBeVisible()
    await expect(this.applyButton).toBeVisible()
  }

  async testRulesFormErrors() {
    await this.applyButton.click()
    await expect(this.requiredError).toBeVisible()

    await expect(this.radio.question).toBeVisible()
    await this.radio.wrong.click()
    await expect(this.requiredError).not.toBeVisible()
    await this.applyButton.click()
    await expect(this.radio.error).toBeVisible()

    await this.radio.correct.click()
    await this.applyButton.click()
    await expect(this.radio.error).not.toBeVisible()

    await expect(this.selection.question).toBeVisible()
    await this.selection.incorrectFirst.click()
    await this.applyButton.click()
    await expect(this.selection.wrongSelectionError).toBeVisible()

    await this.selection.incorrectFirst.click()
    await this.selection.correctFirst.click()
    await this.applyButton.click()
    await expect(this.selection.almostAllSelectionError).toBeVisible()

    await this.selection.incorrectFirst.click()
    await this.selection.correctSecond.click()
    await this.applyButton.click()
    await expect(this.selection.oneIncorrectSelectionError).toBeVisible()
  }

  async fillRulesForm() {
    for (const item of Object.values(rulesFormQuestions)) {
      const question = this.page.locator('div[data-testid="question"]', {
        hasText: item.question,
      })

      await expect(question).toBeVisible()

      // Determine if we're dealing with radio buttons or checkboxes
      const isRadio = item.answers.correct.length === 1

      for (const correct of item.answers.correct) {
        if (isRadio) {
          // Handle radio button
          const radioButton = question.getByRole("radio", { name: correct })
          await expect(radioButton).toBeVisible()
          await radioButton.click()
        } else {
          // Handle checkbox
          const checkboxDiv = question.getByText(correct)
          await expect(checkboxDiv).toBeVisible()
          await checkboxDiv.click()
        }
      }
    }
    await this.applyButton.click()
  }

  async confirmApplication() {
    await expect(this.dialog).toBeVisible()
    await this.dialogCancel.click()
    await expect(this.dialog).not.toBeVisible()

    await this.applyButton.click()
    await expect(this.dialog).toBeVisible()
    await this.dialogConfirm.click()
  }
}
