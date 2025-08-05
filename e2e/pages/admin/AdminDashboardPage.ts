import { type Locator, type Page } from '@playwright/test'
import { BasePage } from '../BasePage'

export class AdminDashboardPage extends BasePage {
  readonly pageTitle: Locator
  readonly eventsTitle: Locator
  readonly eventsTable: Locator
  readonly createEventButton: Locator
  readonly participantsTitle: Locator

  constructor(page: Page) {
    super(page)
    this.pageTitle = page.getByRole('heading', { name: 'Visão geral' })
    this.eventsTitle = page.getByRole('heading', { name: 'Eventos' })
    this.eventsTable = page.locator('table').first() // PrimeReact DataTable
    this.createEventButton = page.getByRole('link', { name: 'Criar evento' })
    this.participantsTitle = page.getByRole('heading', { name: 'Participantes (em breve)' })
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin')
    // Wait for loading state to disappear - the admin dashboard uses delayed-component
    // which shows "Carregando..." text while data is loading
    await this.page.waitForFunction(() => !document.body.textContent?.includes('Carregando...'), { timeout: 30000 })
  }

  async verifyAdminAccess(): Promise<void> {
    await this.pageTitle.waitFor()
    await this.eventsTitle.waitFor()
  }

  async clickCreateEvent(): Promise<void> {
    await this.createEventButton.waitFor({ state: 'visible' })
    await this.createEventButton.click()
  }

  async clickViewEvent(eventTitle: string): Promise<void> {
    // Make sure event is visible on current page
    if (!(await this.isEventInList(eventTitle))) {
      throw new Error(`Event "${eventTitle}" not found in list`)
    }
    
    const eventRow = this.page.getByRole('row').filter({ hasText: eventTitle })
    await eventRow.getByRole('link', { name: 'Ver evento' }).click()
  }

  async clickEditEvent(eventTitle: string): Promise<void> {
    // Make sure event is visible on current page
    if (!(await this.isEventInList(eventTitle))) {
      throw new Error(`Event "${eventTitle}" not found in list`)
    }
    
    const eventRow = this.page.getByRole('row').filter({ hasText: eventTitle })
    await eventRow.getByRole('link', { name: 'Editar evento' }).click()
  }

  async isEventInList(eventTitle: string): Promise<boolean> {
    // First check if event is visible on current page
    const eventCell = this.page.getByRole('cell', { name: eventTitle }).first()
    if (await eventCell.isVisible()) {
      return true
    }
    
    // If not visible, check if there's pagination
    const nextPageButton = this.page.getByRole('button', { name: 'Next Page' })
    
    // Keep clicking next until we find the event or reach the last page
    while (await nextPageButton.isEnabled()) {
      await nextPageButton.click()
      // Wait for table to update
      await this.page.waitForTimeout(500)
      
      if (await eventCell.isVisible()) {
        return true
      }
    }
    
    // Event not found in any page
    return false
  }
  
  async waitForEventInList(eventTitle: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await this.isEventInList(eventTitle)) {
        return
      }
      
      // Refresh the page to check for new events
      await this.navigate()
      await this.page.waitForTimeout(1000)
    }
    
    throw new Error(`Event "${eventTitle}" not found in list after ${timeout}ms`)
  }
}