import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

const CHOICES = ['Discordo totalmente', 'Discordo', 'Depende', 'Concordo', 'Concordo totalmente']

/**
 * The scale answered one statement at a time. The order is drawn at random per
 * run, so tests read which statement is showing instead of expecting one.
 */
export class LikertAnswerPage extends BasePage {
  async navigate(): Promise<void> {
    await this.page.goto('/conta/escala/responder')
    await this.waitForPageLoad()
    await this.waitForHydration()
    await expect(this.statement()).toBeVisible()
  }

  statement(): Locator {
    return this.page.getByRole('heading', { level: 2 })
  }

  async statementText(): Promise<string> {
    return (await this.statement().textContent()) ?? ''
  }

  async expectPosition(index: number, total: number): Promise<void> {
    await expect(this.page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index))
    await expect(this.page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(total))
  }

  /** The choice picked on screen, by the number that picks it (1 to 5). */
  async expectPicked(key: number | null): Promise<void> {
    const checked = this.page.locator('input[type="radio"]:checked')
    if (key === null) {
      await expect(checked).toHaveCount(0)
      return
    }
    await expect(this.page.getByRole('radio', { name: CHOICES[key - 1], exact: true })).toBeChecked()
  }

  comment(): Locator {
    return this.page.getByLabel('Comentário (opcional)')
  }

  keyboardHelpLink(): Locator {
    return this.page.getByRole('button', { name: 'Use o teclado para preencher' })
  }

  keyboardHelp(): Locator {
    return this.page.getByRole('dialog', { name: 'Preencher pelo teclado' })
  }

  /** Waits for a statement other than `previous` to show. */
  async expectMovedFrom(previous: string): Promise<string> {
    await expect(this.statement()).not.toHaveText(previous)
    return this.statementText()
  }
}
