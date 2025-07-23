import { expect, Page } from "@playwright/test"
import { log } from "e2e/helpers/log"

export class BdsmConsentPOM {
  constructor(private page: Page) {}

  async testPageElements() {
    log("Testing BDSM consent page elements")
    
    // Test page title
    await expect(this.page.getByRole("heading", { level: 1 })).toHaveText(
      "Essa é uma edição BDSM da Positiv"
    )
    
    // Test important alert
    const alert = this.page.getByRole("alert")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("Importante:")
    await expect(alert).toContainText("terminante proibido o uso de qualquer substância")
    
    // Test sections
    await expect(this.page.getByRole("heading", { name: "BDSM essentials" })).toBeVisible()
    await expect(this.page.getByRole("heading", { name: "Limitações" })).toBeVisible()
    
    // Test BDSM test link
    const bdsmTestLink = this.page.getByRole("link", { name: /bdsmtest\.org/ })
    await expect(bdsmTestLink).toBeVisible()
    await expect(bdsmTestLink).toHaveAttribute("href", "https://bdsmtest.org/select-lang")
    await expect(bdsmTestLink).toHaveAttribute("target", "_blank")
    
    // Test consent checkbox
    const consentCheckbox = this.page.getByRole("checkbox", { 
      name: "Estou ciente e quero continuar" 
    })
    await expect(consentCheckbox).toBeVisible()
    await expect(consentCheckbox).not.toBeChecked()
    
    // Test continue button
    const continueButton = this.page.getByRole("button", { name: "Continuar" })
    await expect(continueButton).toBeVisible()
  }

  async testConsentValidation() {
    log("Testing consent validation")
    
    // Try to continue without accepting consent
    const continueButton = this.page.getByRole("button", { name: "Continuar" })
    await continueButton.click()
    
    // Check for validation error
    await expect(this.page.getByText("Você deve aceitar para continuar")).toBeVisible()
  }

  async acceptConsent() {
    log("Accepting BDSM consent")
    
    const consentCheckbox = this.page.getByRole("checkbox", { 
      name: "Estou ciente e quero continuar" 
    })
    await consentCheckbox.check()
    await expect(consentCheckbox).toBeChecked()
  }

  async continue() {
    log("Continuing to next page")
    
    const continueButton = this.page.getByRole("button", { name: "Continuar" })
    await continueButton.click()
    
    // Wait for navigation
    await this.page.waitForURL(/\/regras$/)
  }

  async verifyProhibitedPractices() {
    log("Verifying prohibited practices list")
    
    const practices = [
      "Scat:",
      "Golden Shower e Pissing:",
      "Waxplay:",
      "Içamento:",
      "Eletroestimulação:",
      "Escarificação:",
      "Medical Play:",
      "Rape play:",
      "Fire play:"
    ]
    
    for (const practice of practices) {
      await expect(this.page.getByText(practice)).toBeVisible()
    }
  }

  async verifyPositions() {
    log("Verifying BDSM positions")
    
    const positions = ["top:", "bottom:", "switcher:"]
    
    for (const position of positions) {
      await expect(this.page.getByText(position)).toBeVisible()
    }
  }
}