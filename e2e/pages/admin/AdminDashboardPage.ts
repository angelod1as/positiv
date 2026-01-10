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
    this.eventsTable = page.locator('[data-testid="ag-data-table-admin-events-ag"]')
    this.createEventButton = page.getByRole("link", { name: "Criar evento" })
    this.participantsTitle = page.getByRole("heading", {
      name: "Participantes (em breve)",
    })
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

    // AG Grid rows are clickable - find the row containing the event title
    const eventRow = this.eventsTable
      .locator(".ag-row")
      .filter({ hasText: eventTitle })
      .first()
    await eventRow.click()
  }

  async isEventInList(eventTitle: string): Promise<boolean> {
    // First check if event is visible on current page using AG Grid selectors
    // Look for a cell in the title column containing the event title
    const eventCell = this.eventsTable
      .locator('.ag-cell[col-id="title"]')
      .filter({ hasText: eventTitle })
      .first()

    if (await eventCell.isVisible()) {
      return true
    }

    // If not visible, check if there's pagination (AG Grid uses .ag-paging-panel)
    const nextPageButton = this.eventsTable
      .locator(".ag-paging-panel")
      .getByRole("button", { name: "Next Page" })

    // Check if pagination exists and next button is enabled
    if (!(await nextPageButton.isVisible())) {
      return false
    }

    // Keep clicking next until we find the event or reach the last page
    while (
      (await nextPageButton.isVisible()) &&
      (await nextPageButton.isEnabled())
    ) {
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