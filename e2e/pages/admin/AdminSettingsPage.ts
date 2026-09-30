import { expect } from "@playwright/test"
import { BasePage } from "../BasePage"

export class AdminSettingsPage extends BasePage {
  async navigate(): Promise<void> {
    await this.page.goto("/admin/configuracoes")
    await this.waitForPageLoad()
  }

  private onlinePaymentsSwitch() {
    return this.page.getByRole("switch", { name: "Pagamentos online" })
  }

  async turnOnlinePaymentsOff(): Promise<void> {
    await this.onlinePaymentsSwitch().click()
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Desligar" }).click()
    await expect(this.onlinePaymentsSwitch()).not.toBeChecked()
  }

  async turnOnlinePaymentsOn(): Promise<void> {
    await this.onlinePaymentsSwitch().click()
    await expect(this.onlinePaymentsSwitch()).toBeChecked()
  }
}
