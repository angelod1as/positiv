import { type Locator, type Page } from "@playwright/test"
import { BasePage } from "../BasePage"

export class AdminDashboardPage extends BasePage {
  readonly pageTitle: Locator
  readonly eventsTitle: Locator
  readonly eventsTable: Locator
  readonly createEventButton: Locator
  readonly participantsTitle: Locator

  constructor(page: Page) {
    super(page)
    this.pageTitle = page.getByRole("heading", { name: "Visão geral" })
    // AG Grid events table has header "Todos os eventos"
    this.eventsTitle = page.getByRole("heading", { name: "Todos os eventos" })
    // AG Grid table container
    this.eventsTable = page.locator('[data-testid="ag-data-table-admin-events"]')
    this.createEventButton = page.getByRole("link", { name: "Criar evento" })
    this.participantsTitle = page.getByRole("heading", {
      name: "Participantes (em breve)",
    })
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin')
    // Wait for loading state to disappear
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

    // AG Grid rows are clickable - find the row containing the event title
    const eventRow = this.eventsTable
      .locator(".ag-row")
      .filter({ hasText: eventTitle })
      .first()
    await eventRow.click()
  }

  async isEventInList(eventTitle: string): Promise<boolean> {
    // The table paginates at 25 rows and AG Grid keeps only the rows in view in
    // the DOM, so an event can be on the current page and still not be visible.
    // The quick filter brings it into view whatever the row count.
    const searchInput = this.eventsTable.getByLabel("Buscar eventos")
    await searchInput.waitFor({ state: "visible" })
    await searchInput.fill(eventTitle)

    const eventCell = this.eventsTable
      .locator('.ag-cell[col-id="title"]')
      .filter({ hasText: eventTitle })
      .first()

    return eventCell
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => true)
      .catch(() => false)
  }

  async waitForEventInList(
    eventTitle: string,
    timeout: number = 30000,
  ): Promise<void> {
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