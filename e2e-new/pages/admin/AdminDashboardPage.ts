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
    const eventRow = this.page.getByRole('row').filter({ hasText: eventTitle })
    await eventRow.getByRole('link', { name: 'Ver evento' }).click()
  }

  async clickEditEvent(eventTitle: string): Promise<void> {
    const eventRow = this.page.getByRole('row').filter({ hasText: eventTitle })
    await eventRow.getByRole('link', { name: 'Editar evento' }).click()
  }

  async isEventInList(eventTitle: string): Promise<boolean> {
    const eventCell = this.page.getByRole('cell', { name: eventTitle }).first()
    return await eventCell.isVisible()
  }
}