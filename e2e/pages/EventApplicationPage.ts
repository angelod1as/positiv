import { type Locator, type Page, expect } from "@playwright/test"
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
    this.requiredError = page.getByText("Há erros nas suas respostas", {
      exact: true,
    })
    this.questions = page.locator('div[data-testid="question"]')

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

    // Full set of correct answers, mirrored from
    // app/components/forms/custom/rules/rules-questions.tsx. The quiz shuffles
    // question and answer order, but the answer text itself is fixed, so
    // clicking every correct answer text (regardless of order) always yields
    // a fully and correctly answered quiz. Both event-type variants of the
    // "not-a-club" question are included since only one is ever rendered.
    const correctAnswers = [
      "Cada pessoa é responsável por cuidar de seus pertences e por limpar o ambiente, para manter tudo em ordem e no lugar, independente de ter uma equipe de limpeza que irá limpar depois.",
      "Não. A regra é simples: ninguém é obrigade a nada. Se quiser ficar de roupa, pode, se quiser ficar pelade, pode também",
      "Não está de acordo. O ideal é curtir a festa na própria festa e, principalmente, não tirar ninguém dela antes do fim.",
      "Essa frase está incorreta. A Positiv tem apenas espaços compartilhados e celebra a coletividade.",
      "Tudo lindo! Falar sobre a Positiv é essencial pro crescimento da própria Positiv, desde que você não cite nomes nem características de quem esteve na festa com você.",
      "A regra é clara: não se fala sobre quem vai à Positiv — mesmo para pessoas que vão à Positiv durante uma Positiv.",
      "Desde que ela não diga quem vai ou foi à festa com ela, tudo bem — ela pode divulgar sua participação.",
      "A frase está incorreta. A Positiv se parece mais com um picnic e não tem música alta ou luzes piscando.",
      "A frase está incorreta. Na Positiv BDSM não há álcool ou outras substâncias.",
      "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial.",
      "Incorreta, o uso dos celulares é permitido apenas na garagem da suíte.",
      "A afirmação está incorreta, o uso de camisinha interna ou externa, é obrigatório",
      "A afirmação está incorreta e até mesmo casais que não usam camisinha fora da festa são obrigados a usar durante a festa",
      "A Positiv não pede que seus participantes enviem resultados de exames de IST para a organização, mas prega que todes façam regularmente seus acompanhamentos, porque assumimos riscos em frequentar festas como a Positiv",
      "Para interações com mãos e bocas, a Positiv recomenda fortemente que sejam usadas luvas, dental dams e/ou camisinhas.",
      "Sim, fiz uma autoanálise e tô legal. Entendo meus gatilhos e tô preparade para enfrentar meus medos e inseguranças.",
      'Senti que um clima rolou na festa. Perguntei: posso te dar um beijo? A pessoa consentiu com um "sim". Nos beijamos. Ela perguntou: "posso fazer um cafuné?" e eu disse que sim.',
      "A Positiv tem esse nome, também, por conta do movimento body-positive, uma alusão à quebra dos padrões que a sociedade impõe, à aceitação ao próprio corpo e à conscientização de que corpos dissidentes são desejáveis e desejantes.",
      "Estar numa Positiv exige um autoquestionamento se nos sentimos abertes e prontes para estar em um ambiente E interagir (sexualmente ou não) com uma pluralidade de corpos, raças, cores, etnias.",
      "Quase todos nós moldamos nosso interesse desde pequenes com uma enxurrada de regras sociais que limitam o que é belo e desejável. É importante que cada participante tenha consciência disso e busque expandir seus conceitos.",
    ]

    // Click each correct answer's label text if present on this event's quiz
    for (const answer of correctAnswers) {
      const element = this.page.getByText(answer, { exact: true })
      if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
        await element.click()
      }
    }

    // Wait for form to update
    await this.page.waitForTimeout(500)
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
    // Handle rules page
    if (await this.isOnRulesPage()) {
      await this.fillRulesForm()
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
