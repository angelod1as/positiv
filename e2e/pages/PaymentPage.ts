import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class PaymentPage extends BasePage {
  async navigate(paymentId: string): Promise<void> {
    await this.page.goto(`/pagamento/${paymentId}`)
    await this.waitForPageLoad()
  }

  async fillCpfIfAsked(cpf: string): Promise<void> {
    const cpfField = this.page.getByLabel('CPF')
    if (!(await cpfField.isVisible())) return

    await cpfField.fill(cpf)
    await this.page.getByRole('button', { name: 'Salvar e continuar' }).click()
    await expect(this.page.getByRole('heading', { name: 'Como você quer pagar?' })).toBeVisible()
  }

  async chooseOption(name: RegExp): Promise<void> {
    await this.page.getByRole('radio', { name }).check()
  }

  async pay(): Promise<void> {
    await this.page.getByRole('button', { name: 'Pagar' }).click()
  }

  async expectPaid(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  }

  async expectClosed(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Este link não está mais disponível' }),
    ).toBeVisible()
  }
}
