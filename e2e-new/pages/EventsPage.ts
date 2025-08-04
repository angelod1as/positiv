import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class EventsPage extends BasePage {
  readonly openRegistrationHeading: Locator
  readonly closedRegistrationHeading: Locator
  readonly scheduledEventsHeading: Locator
  readonly eventCards: Locator
  readonly loadingSpinner: Locator
  readonly dashboardTitle: Locator
  readonly openEventsHeading: Locator

  constructor(page: Page) {
    super(page)
    
    this.openRegistrationHeading = page.getByRole('heading', { name: 'Inscrições abertas' })
    this.closedRegistrationHeading = page.getByRole('heading', { name: 'Inscrições encerradas' })
    this.scheduledEventsHeading = page.getByRole('heading', { name: 'Próximos eventos' })
    this.eventCards = page.locator('[data-testid^="event-card"]')
    this.loadingSpinner = page.locator('.loading-spinner')
    this.dashboardTitle = page.getByRole('heading', { name: 'Dashboard' })
    this.openEventsHeading = page.getByRole('heading', { name: 'Inscrições abertas', exact: true }).first()
  }

  async goto() {
    // Check if we're already on dashboard
    if (!this.page.url().includes('/dashboard')) {
      await this.page.goto('/dashboard', { waitUntil: 'networkidle' })
    }
    
    // Ensure page is fully loaded
    await this.page.waitForLoadState('networkidle')
    
    // Wait for events container to appear
    await this.page.waitForSelector('[data-testid^="event-card"], .loading-spinner', { timeout: 15000 })
  }

  async waitForEventsToLoad(): Promise<void> {
    // Wait for at least one event card to be visible
    await this.eventCards.first().waitFor({ state: 'visible', timeout: 30000 })
    
    // Wait a bit for all cards to render
    await this.page.waitForTimeout(500)
  }

  async getEventCardByTitle(title: string): Promise<Locator> {
    return this.page.locator(`[data-testid^="event-card"]:has-text("${title}")`)
  }

  async getEventCardByIndex(index: number): Promise<Locator> {
    return this.eventCards.nth(index)
  }

  async clickEventByTitle(title: string): Promise<void> {
    const eventCard = await this.getEventCardByTitle(title)
    await expect(eventCard).toBeVisible({ timeout: 10000 })
    
    // Find the "Fazer inscrição" button within the card
    const applyButton = eventCard.getByRole('link', { name: 'Fazer inscrição' })
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      applyButton.click()
    ])
  }

  async clickFirstOpenEvent(): Promise<void> {
    // Find the first event card with an "Fazer inscrição" button
    const openEventCard = this.page.locator('[data-testid^="event-card"]:has(a:has-text("Fazer inscrição"))').first()
    await expect(openEventCard).toBeVisible({ timeout: 10000 })
    
    const applyButton = openEventCard.getByRole('link', { name: 'Fazer inscrição' })
    await applyButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async verifyEventDetails(eventTitle: string, expectedDetails: {
    description?: string
    location?: string
    price?: string
  }): Promise<void> {
    const eventCard = await this.getEventCardByTitle(eventTitle)
    await expect(eventCard).toBeVisible()

    if (expectedDetails.description) {
      await expect(eventCard).toContainText(expectedDetails.description)
    }

    if (expectedDetails.location) {
      await expect(eventCard).toContainText(expectedDetails.location)
    }

    if (expectedDetails.price) {
      await expect(eventCard).toContainText(expectedDetails.price)
    }
  }

  async getOpenEventsCount(): Promise<number> {
    const openEvents = this.page.locator('[data-testid^="event-card"]:has(a:has-text("Fazer inscrição"))')
    return await openEvents.count()
  }

  async verifyNoOpenEvents(): Promise<void> {
    const openEventsCount = await this.getOpenEventsCount()
    expect(openEventsCount).toBe(0)
  }

  async verifyUserAlreadyApplied(eventTitle: string): Promise<void> {
    const eventCard = await this.getEventCardByTitle(eventTitle)
    await expect(eventCard).toBeVisible()
    
    // Check for "Cancelar inscrição" button which indicates user already applied
    const cancelButton = eventCard.getByRole('button', { name: 'Cancelar inscrição' })
    await expect(cancelButton).toBeVisible()
  }

  async isEventOpen(eventTitle: string): Promise<boolean> {
    const eventCard = await this.getEventCardByTitle(eventTitle)
    const applyButton = eventCard.getByRole('link', { name: 'Fazer inscrição' })
    return await applyButton.isVisible()
  }

  async verifyEventsDisplayed(): Promise<void> {
    // Wait for page to load
    await this.page.waitForLoadState('networkidle')
    
    // Check if we're on the dashboard
    if (!this.page.url().includes('/dashboard')) {
      await this.goto()
    }
    
    // Wait for events to be visible
    await expect(this.eventCards.first()).toBeVisible({ timeout: 15000 })
    await expect(this.openEventsHeading).toBeVisible({ timeout: 5000 })
  }

  async getOpenEventCount(): Promise<number> {
    return await this.getOpenEventsCount()
  }
}