import { expect } from "@playwright/test"
import { BasePage } from "../BasePage"

export class AdminSettingsPage extends BasePage {
  async navigate(): Promise<void> {
    await this.page.goto("/admin/configuracoes")
    await this.waitForPageLoad()
    await this.waitForHydration()
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

  likertAccessSwitch() {
    return this.page.getByRole("switch", { name: "Acessível por link" })
  }

  likertRequiredSwitch() {
    return this.page.getByRole("switch", { name: "Obrigatória" })
  }

  async setLikertSwitch(name: "access" | "required", on: boolean): Promise<void> {
    const toggle = name === "access" ? this.likertAccessSwitch() : this.likertRequiredSwitch()
    await toggle.click()
    await expect(toggle).toBeChecked({ checked: on })
    // The switch is disabled while its save is in flight.
    await expect(toggle).toBeEnabled()
  }
}
