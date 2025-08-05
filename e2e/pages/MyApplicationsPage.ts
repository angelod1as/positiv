import type { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class MyApplicationsPage extends BasePage {
  readonly appliedEventCards: Locator
  readonly cancelApplicationButton: Locator
  readonly applyButton: Locator
  readonly confirmCancelButton: Locator
  readonly cancelDialogCancelButton: Locator

  constructor(page: Page) {
    super(page)
    
    // Locators for event cards and buttons
    this.appliedEventCards = page.locator('[data-testid*="event-card"]').filter({
      has: page.getByRole('button', { name: 'Cancelar inscrição' })
    })
    
    this.cancelApplicationButton = page.getByRole('button', { name: 'Cancelar inscrição' })
    this.applyButton = page.getByRole('link', { name: 'Fazer inscrição' })
    this.confirmCancelButton = page.getByRole('button', { name: '😢 Cancelar' })
    this.cancelDialogCancelButton = page.getByRole('button', { name: '🎉 Voltar' })
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async getAppliedEvents(): Promise<Locator[]> {
    const count = await this.appliedEventCards.count()
    const events: Locator[] = []
    
    for (let i = 0; i < count; i++) {
      events.push(this.appliedEventCards.nth(i))
    }
    
    return events
  }

  async findEventByTitle(title: string): Promise<Locator | null> {
    const eventCard = this.page.locator('[data-testid*="event-card"]').filter({
      hasText: title
    })
    
    const count = await eventCard.count()
    return count > 0 ? eventCard.first() : null
  }

  async isAppliedToEvent(eventTitle: string): Promise<boolean> {
    const eventCard = await this.findEventByTitle(eventTitle)
    if (!eventCard) return false
    
    const cancelButton = eventCard.getByRole('button', { name: 'Cancelar inscrição' })
    return await cancelButton.isVisible()
  }

  async cancelApplication(eventTitle: string): Promise<void> {
    const eventCard = await this.findEventByTitle(eventTitle)
    if (!eventCard) {
      throw new Error(`Event "${eventTitle}" not found`)
    }
    
    // Click cancel button on the event card
    const cancelButton = eventCard.getByRole('button', { name: 'Cancelar inscrição' })
    await cancelButton.click()
    
    // Wait for confirmation dialog
    await this.confirmCancelButton.waitFor({ state: 'visible' })
    
    // Confirm cancellation
    await this.confirmCancelButton.click()
    
    // Wait for the action to complete
    await this.page.waitForLoadState('networkidle')
    
    // Wait for button state to change
    await eventCard.getByRole('link', { name: 'Fazer inscrição' }).waitFor({ state: 'visible' })
  }

  async reapplyToEvent(eventTitle: string): Promise<void> {
    const eventCard = await this.findEventByTitle(eventTitle)
    if (!eventCard) {
      throw new Error(`Event "${eventTitle}" not found`)
    }
    
    // Click apply button on the event card
    const applyButton = eventCard.getByRole('link', { name: 'Fazer inscrição' })
    await applyButton.click()
    
    // This will navigate to the application form page
    await this.page.waitForURL(/\/events\/[^/]+\/application/)
    await this.page.waitForLoadState('networkidle')
  }

  async getApplicationStatus(eventTitle: string): Promise<'applied' | 'not-applied' | 'not-found'> {
    const eventCard = await this.findEventByTitle(eventTitle)
    if (!eventCard) return 'not-found'
    
    const cancelButton = eventCard.getByRole('button', { name: 'Cancelar inscrição' })
    const applyButton = eventCard.getByRole('link', { name: 'Fazer inscrição' })
    
    if (await cancelButton.isVisible()) {
      return 'applied'
    } else if (await applyButton.isVisible()) {
      return 'not-applied'
    }
    
    return 'not-found'
  }

  async waitForApplicationStatusChange(eventTitle: string, expectedStatus: 'applied' | 'not-applied'): Promise<void> {
    const eventCard = await this.findEventByTitle(eventTitle)
    if (!eventCard) {
      throw new Error(`Event "${eventTitle}" not found`)
    }
    
    if (expectedStatus === 'applied') {
      await eventCard.getByRole('button', { name: 'Cancelar inscrição' }).waitFor({ state: 'visible' })
    } else {
      await eventCard.getByRole('link', { name: 'Fazer inscrição' }).waitFor({ state: 'visible' })
    }
  }
}