import { expect, type Locator, type Page, type Response } from "@playwright/test"
import { BasePage } from "../BasePage"

export class UserManagementPage extends BasePage {
  readonly participantsTable: Locator
  readonly tableRows: Locator
  readonly viewParticipantButtons: Locator
  readonly whatsappButtons: Locator
  readonly saveButton: Locator
  readonly googleContactsButton: Locator
  readonly veteranLabel: Locator
  readonly veteranCheckbox: Locator

  constructor(page: Page) {
    super(page)
    // AG Grid table container
    this.participantsTable = page.locator(
      '[data-testid="ag-data-table-participants-table"]',
    )
    // AG Grid rows in center viewport only (excludes pinned left/right duplicates)
    // AG Grid renders separate row elements for each pinned section, so we must
    // target only center viewport to get accurate row count
    this.tableRows = this.participantsTable.locator(
      ".ag-center-cols-container .ag-row",
    )
    this.viewParticipantButtons = page.locator('[title="Ver participante"]')
    this.whatsappButtons = page.locator('button:has(img[alt="WhatsApp"])')
    this.saveButton = page.getByRole("button", { name: "Salvar" })
    this.googleContactsButton = page.getByRole("button", {
      name: "Adicionar ao Google Contacts",
    })
    // The checkbox input is visually hidden; its label is what takes the click
    this.veteranLabel = page.locator("label").filter({ hasText: /^Veterano$/ })
    this.veteranCheckbox = this.veteranLabel.getByRole("checkbox")
  }

  async navigate(eventId: string): Promise<void> {
    await this.page.goto(`/admin/eventos/${eventId}`)
    await this.waitForHydration()
    await this.participantsTable.waitFor({ state: "visible" })
  }

  async waitForTableToLoad(): Promise<void> {
    await this.participantsTable.waitFor({ state: "visible" })
    await this.page.waitForLoadState("networkidle")
  }

  async findRowByParticipantName(name: string): Promise<Locator> {
    await this.waitForTableToLoad()
    // social_name is in pinned left section, so we need to search there first
    // then return the center row with matching row-index
    const pinnedLeftRow = this.participantsTable
      .locator(".ag-pinned-left-cols-container .ag-row")
      .filter({ hasText: name })
      .first()
    await pinnedLeftRow.waitFor({ state: "visible" })

    // Get the row-index to find the corresponding center row
    const rowIndex = await pinnedLeftRow.getAttribute("row-index")
    if (!rowIndex) {
      throw new Error("Could not get row-index from pinned left row")
    }

    // Return the center row with the same row-index
    const centerRow = this.participantsTable
      .locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`)
      .first()
    await centerRow.waitFor({ state: "visible" })
    return centerRow
  }

  async editSelectCell(
    row: Locator,
    fieldName: string,
    value: string,
  ): Promise<void> {
    // Get the row-index from the row element to find cells in the same logical row
    // across all AG Grid viewports (left pinned, center, right pinned)
    const rowIndex = await row.getAttribute("row-index")
    if (!rowIndex) {
      throw new Error("Could not get row-index attribute from row")
    }

    // Find the cell with the given field in the same row (using row-index)
    const cell = this.participantsTable
      .locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${fieldName}"]`)
      .first()

    // Scroll cell into view if needed
    await cell.scrollIntoViewIfNeeded()

    // Double-click to enter edit mode in AG Grid
    await cell.dblclick()

    // AG Grid agSelectCellEditor uses a custom component with role="combobox"
    // Click to open the dropdown, then select from the listbox
    const dropdown = cell.getByRole("combobox")
    await dropdown.waitFor({ state: "visible", timeout: 5000 })
    await dropdown.click()

    // Wait for the listbox (dropdown options) to appear and select the option
    // Use exact: true to avoid matching partial names (e.g., "Compareceu" vs "Não compareceu")
    const option = this.page.getByRole("option", { name: value, exact: true })
    await option.waitFor({ state: "visible", timeout: 5000 })
    // Picking the value the cell already holds saves nothing and times out
    const [saved] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/admin/event-participant" &&
          response.request().method() === "POST",
      ),
      option.click(),
    ])
    expect(saved.ok()).toBe(true)
  }

  async verifyCellContent(
    row: Locator,
    fieldName: string,
    expectedValue: string,
  ): Promise<boolean> {
    // Get the row-index from the row element
    const rowIndex = await row.getAttribute("row-index")
    if (!rowIndex) {
      throw new Error("Could not get row-index attribute from row")
    }

    // Find the cell with the given field - search across all viewports (left, center, right)
    // because AG Grid renders rows in separate containers for pinned columns
    const cell = this.participantsTable
      .locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${fieldName}"]`)
      .first()

    // Wait for cell to be visible (it might be in a different viewport)
    await cell.waitFor({ state: "visible", timeout: 5000 }).catch(() => {})
    const content = (await cell.textContent())?.trim() ?? ""
    return content.includes(expectedValue.trim())
  }

  async clickViewParticipantButton(row: Locator): Promise<void> {
    // First try to maximize the table if the button exists
    const maximizeButton = this.page.getByRole("button", {
      name: "Maximizar tabela",
    })
    if (await maximizeButton.isVisible()) {
      await maximizeButton.click()
      await this.page.waitForTimeout(500)
    }

    // Get the row-index from the row element
    const rowIndex = await row.getAttribute("row-index")
    if (!rowIndex) {
      throw new Error("Could not get row-index attribute from row")
    }

    // Find and click the view participant link in the actions cell (using row-index)
    // AG Grid actions column has col-id="actions"
    const actionsCell = this.participantsTable
      .locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="actions"]`)
      .first()
    const viewButton = actionsCell.locator("a").first()
    await viewButton.scrollIntoViewIfNeeded()
    await viewButton.click()
    await this.page.waitForLoadState("networkidle")
  }

  // Detail view methods
  async waitForDetailView(): Promise<void> {
    await this.page.waitForSelector("h2", { state: "visible" })
    await this.page.waitForLoadState("networkidle")
  }

  async editDetailField(fieldName: string, value: string): Promise<void> {
    // First try to find by id (new pattern with Radix UI components)
    const fieldById = this.page.locator(`[id="${fieldName}"]`).first()
    const fieldByName = this.page.locator(`[name="${fieldName}"]`).first()

    // Check which selector finds the element
    const fieldByIdVisible = await fieldById.isVisible().catch(() => false)
    const field = fieldByIdVisible ? fieldById : fieldByName
    await field.waitFor({ state: "visible" })

    const tagName = await field.evaluate((el) => el.tagName)
    const fieldType = await field.getAttribute("type")

    if (fieldType === "checkbox") {
      const isChecked = await field.isChecked()
      const shouldBeChecked = value === "true"
      if (isChecked !== shouldBeChecked) {
        await field.click()
      }
    } else if (tagName === "SELECT") {
      await field.selectOption(value)
    } else if (tagName === "BUTTON" && (await field.getAttribute("role")) === "combobox") {
      // Radix UI Select - click trigger then select option
      await field.click()
      // Escape special regex characters in value
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const option = this.page.getByRole("option", { name: new RegExp(escapedValue, "i") })
      await option.waitFor({ state: "visible" })
      await option.click()
    } else if (tagName === "TEXTAREA") {
      await field.clear()
      await field.fill(value)
    } else {
      await field.clear()
      await field.fill(value)
    }
  }

  // A detail-view save is done once the action answers and the loader data
  // that follows it is back: the success toast fires on the first alone, so
  // waiting on it leaves the page's props stale for the next edit. An edit
  // that changes nothing sends no request, so it times out here on purpose
  async saveDetailField(action: () => Promise<void>): Promise<void> {
    const detailData = `${new URL(this.page.url()).pathname}.data`
    const isDetailData = (response: Response, method: string) =>
      new URL(response.url()).pathname === detailData &&
      response.request().method() === method
    const [saved, revalidated] = await Promise.all([
      this.page.waitForResponse((r) => isDetailData(r, "POST")),
      this.page.waitForResponse((r) => isDetailData(r, "GET")),
      action(),
    ])
    expect(saved.ok()).toBe(true)
    expect(revalidated.ok()).toBe(true)
  }

  async expectToastAfter(
    type: "success" | "warning",
    action: () => Promise<void>,
  ): Promise<void> {
    // Toasts from earlier saves are still on screen with the same text, so
    // mark them first and wait for one that was not there before the action
    await this.page
      .locator("[data-sonner-toast]")
      .evaluateAll((toasts) =>
        toasts.forEach((toast) => toast.setAttribute("data-e2e-seen", "")),
      )
    await action()
    await expect(
      this.page.locator(
        `[data-sonner-toast][data-type="${type}"]:not([data-e2e-seen])`,
      ),
    ).toBeVisible()
  }

  async getDetailFieldValue(fieldName: string): Promise<string> {
    // First try to find by id (new pattern with Radix UI components)
    const fieldById = this.page.locator(`[id="${fieldName}"]`).first()
    const fieldByName = this.page.locator(`[name="${fieldName}"]`).first()

    const fieldByIdVisible = await fieldById.isVisible().catch(() => false)
    const field = fieldByIdVisible ? fieldById : fieldByName

    const tagName = await field.evaluate((el) => el.tagName)
    const fieldType = await field.getAttribute("type")

    if (fieldType === "checkbox") {
      const isChecked = await field.isChecked()
      return isChecked.toString()
    } else if (tagName === "SELECT") {
      return await field.inputValue()
    } else if (tagName === "BUTTON" && (await field.getAttribute("role")) === "combobox") {
      // Radix UI Select - get the displayed text
      return await field.textContent() ?? ""
    } else {
      return await field.inputValue()
    }
  }

  // WhatsApp integration methods
  async clickWhatsAppButton(row: Locator): Promise<void> {
    // Get the row-index from the row element
    const rowIndex = await row.getAttribute("row-index")
    if (!rowIndex) {
      throw new Error("Could not get row-index attribute from row")
    }

    // Find the WhatsApp button in the same row (using row-index)
    const whatsappButton = this.participantsTable
      .locator(`.ag-row[row-index="${rowIndex}"] button:has(img[alt="WhatsApp"])`)
      .first()
    await whatsappButton.waitFor({ state: "visible" })

    // Intercept the window.open call to prevent actual navigation
    await this.page.evaluate(() => {
      const win = window as unknown as Window & {
        lastOpenedUrl: string | null
        originalOpen: typeof window.open
      }
      win.lastOpenedUrl = null
      win.originalOpen = window.open
      window.open = (
        url?: string | URL,
        _target?: string,
        _features?: string,
      ) => {
        win.lastOpenedUrl = url?.toString() || null
        return null
      }
    })

    await whatsappButton.click()
  }

  async getLastOpenedUrl(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const win = window as Window & { lastOpenedUrl?: string | null }
      return win.lastOpenedUrl || null
    })
  }

  async verifyWhatsAppUrl(expectedPhone: string): Promise<boolean> {
    const url = await this.getLastOpenedUrl()
    if (!url) return false

    const cleanedPhone = expectedPhone
      .toString()
      .replace(" ", "")
      .replace("-", "")
    let expectedUrl: string

    if (cleanedPhone.length === 11) {
      expectedUrl = `https://wa.me/55${expectedPhone}`
    } else {
      expectedUrl = `https://wa.me/${expectedPhone}`
    }

    return url === expectedUrl
  }

  // Google Contacts integration methods
  async clickGoogleContactsButton(): Promise<void> {
    await this.googleContactsButton.waitFor({ state: "visible" })

    // Setup clipboard and window.open interception
    await this.page.evaluate(() => {
      const win = window as unknown as Window & {
        lastCopiedText: string | null
        lastOpenedUrl: string | null
        originalOpen?: typeof window.open
      }

      win.lastCopiedText = null
      win.lastOpenedUrl = null

      // Override clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text: string) => {
            win.lastCopiedText = text
            return Promise.resolve()
          },
        },
        configurable: true,
      })

      // Override window.open if not already done
      if (!win.originalOpen) {
        win.originalOpen = window.open
        window.open = (
          url?: string | URL,
          _target?: string,
          _features?: string,
        ) => {
          win.lastOpenedUrl = url?.toString() || null
          return null
        }
      }
    })

    await this.googleContactsButton.click()

    // Wait a bit for the async clipboard operation
    await this.page.waitForTimeout(500)
  }

  async getLastCopiedText(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const win = window as Window & { lastCopiedText?: string | null }
      return win.lastCopiedText || null
    })
  }

  async verifyGoogleContactsIntegration(): Promise<{
    copiedText: string | null
    openedUrl: string | null
  }> {
    const copiedText = await this.getLastCopiedText()
    const openedUrl = await this.getLastOpenedUrl()

    return { copiedText, openedUrl }
  }

  // Cleanup method to restore window.open
  async cleanup(): Promise<void> {
    await this.page.evaluate(() => {
      const win = window as Window & { originalOpen?: typeof window.open }
      if (win.originalOpen) {
        window.open = win.originalOpen
      }
    })
  }
}
