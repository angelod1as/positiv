import { expect } from "@playwright/test"
import { BasePage } from "../BasePage"

export class AdminSettingsPage extends BasePage {
  async navigate(): Promise<void> {
    await this.page.goto("/admin/configuracoes")
    await this.waitForPageLoad()
  }

  async turnOnlinePaymentsOff(): Promise<void> {
    await this.page.getByRole("button", { name: "Desligar pagamentos online" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Desligar" }).click()
    await expect(this.page.getByText("Desligados", { exact: true })).toBeVisible()
  }

  async turnOnlinePaymentsOn(): Promise<void> {
    await this.page.getByRole("button", { name: "Ligar pagamentos online" }).click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Ligar" }).click()
    await expect(this.page.getByText("Ligados", { exact: true })).toBeVisible()
  }
}
