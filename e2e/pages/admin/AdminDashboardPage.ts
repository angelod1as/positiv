import { type Locator, type Page } from '@playwright/test'
import { BasePage } from '../BasePage'

/**
 * Page Object Model for the Admin Dashboard page.
 *
 * NOTE: This page now uses AG Grid instead of PrimeReact DataTable.
 * The eventsTable locator uses AG Grid's [role="grid"] selector.
 * If the page structure changes in the future, update these selectors accordingly.
 *
 * @see POS-346 - AG Grid migration for E2E tests
 */
export class AdminDashboardPage extends BasePage {
  readonly pageTitle: Locator
  readonly eventsTitle: Locator
  readonly eventsTable: Locator
  readonly createEventButton: Locator
  readonly participantsTitle: Locator

  constructor(page: Page) {
    super(page)
    this.pageTitle = page.getByRole('heading', { name: 'Visão geral' })
    this.eventsTitle = page.getByRole('heading', { name: 'Eventos', exact: true })
    // AG Grid uses role="grid" instead of table element
    this.eventsTable = page.locator('[role="grid"]').first()
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

  /**
   * Click on an event row in the AG Grid table.
   * AG Grid rows use the .ag-row class.
   */
  async clickViewEvent(eventTitle: string): Promise<void> {
    // Make sure event is visible on current page
    if (!(await this.isEventInList(eventTitle))) {
      throw new Error(`Event "${eventTitle}" not found in list`)
    }

    // AG Grid: find the row containing the event title and click it
    const eventRow = this.page.locator('.ag-row').filter({ hasText: eventTitle })
    await eventRow.click()
  }

  /**
   * Check if an event exists in the AG Grid table.
   * Uses AG Grid's cell structure for finding events.
   */
  async isEventInList(eventTitle: string): Promise<boolean> {
    // AG Grid: look for the event title in any cell
    const eventCell = this.page.locator('.ag-cell').filter({ hasText: eventTitle }).first()
    if (await eventCell.isVisible()) {
      return true
    }

    // Check pagination if event not visible on current page
    // AG Grid uses different pagination buttons than PrimeReact
    const nextPageButton = this.page.locator('.ag-paging-button[ref="btNext"]')

    // Keep clicking next until we find the event or reach the last page
    while (await nextPageButton.isEnabled().catch(() => false)) {
      await nextPageButton.click()
      // Wait for grid to update
      await this.page.waitForTimeout(500)

      if (await eventCell.isVisible()) {
        return true
      }
    }

    // Event not found in any page
    return false
  }

  /**
   * Wait for an event to appear in the AG Grid table.
   * Refreshes the page periodically to check for new events.
   */
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

  /**
   * Get the number of rows visible in the AG Grid table.
   * Useful for verifying table content.
   */
  async getVisibleRowCount(): Promise<number> {
    const rows = this.page.locator('.ag-row:not(.ag-row-loading)')
    return await rows.count()
  }

  /**
   * Check if the AG Grid table is visible and loaded.
   */
  async isTableLoaded(): Promise<boolean> {
    // Wait for the grid to be present
    const grid = this.page.locator('[role="grid"]').first()
    if (!(await grid.isVisible())) {
      return false
    }

    // Check that rows are loaded (either data rows or empty message)
    const rows = this.page.locator('.ag-row')
    const emptyMessage = this.page.getByText('Nenhum evento encontrado')

    return (await rows.count()) > 0 || (await emptyMessage.isVisible())
  }
}
