import { type Page, type Locator, expect } from "@playwright/test"

/**
 * AG Grid E2E Helper Utilities
 *
 * Provides reusable functions for interacting with AG Grid tables in E2E tests.
 * These helpers abstract common AG Grid operations and handle the asynchronous
 * nature of grid rendering.
 */

/**
 * Wait for AG Grid to be fully rendered and ready for interaction
 * @param page - Playwright page object
 * @param gridTestId - The data-testid of the AG Grid container (without the prefix)
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForAGGridReady(
  page: Page,
  gridTestId: string,
  timeout: number = 10000,
): Promise<Locator> {
  const gridSelector = `[data-testid="ag-data-table-${gridTestId}"]`
  const grid = page.locator(gridSelector)

  // Wait for the grid container to be visible
  await grid.waitFor({ state: "visible", timeout })

  // Wait for at least one row to be rendered (or empty state)
  const rowsOrEmpty = grid.locator(".ag-row, .ag-overlay-no-rows-center")
  await rowsOrEmpty.first().waitFor({ state: "visible", timeout })

  // Wait for any loading overlays to disappear
  const loadingOverlay = grid.locator(".ag-overlay-loading-center")
  await loadingOverlay.waitFor({ state: "hidden", timeout }).catch(() => {
    // Loading overlay may not appear, ignore
  })

  return grid
}

/**
 * Get the value of a cell in the AG Grid
 * @param grid - The AG Grid locator
 * @param rowIndex - Zero-based row index
 * @param colId - The column ID (field name)
 * @returns The text content of the cell
 */
export async function getGridCellValue(
  grid: Locator,
  rowIndex: number,
  colId: string,
): Promise<string> {
  const row = grid.locator(".ag-row").nth(rowIndex)
  const cell = row.locator(`.ag-cell[col-id="${colId}"]`)
  return (await cell.textContent()) || ""
}

/**
 * Set a cell value in AG Grid (for editable cells)
 * @param page - Playwright page object
 * @param grid - The AG Grid locator
 * @param rowIndex - Zero-based row index
 * @param colId - The column ID (field name)
 * @param value - The value to set
 * @param editorType - The type of cell editor (select, checkbox, number, text)
 */
export async function setCellValue(
  page: Page,
  grid: Locator,
  rowIndex: number,
  colId: string,
  value: string | boolean,
  editorType: "select" | "checkbox" | "number" | "text" = "text",
): Promise<void> {
  const row = grid.locator(".ag-row").nth(rowIndex)
  const cell = row.locator(`.ag-cell[col-id="${colId}"]`)

  if (editorType === "checkbox") {
    const checkbox = cell.locator(".ag-checkbox-input")
    const isChecked = await checkbox.isChecked()
    if (isChecked !== value) {
      await checkbox.click()
    }
  } else {
    // Enter edit mode with double-click
    await cell.dblclick()

    if (editorType === "select") {
      // agSelectCellEditor uses a custom component with role="combobox"
      // Click to open dropdown, then select from listbox
      const dropdown = cell.getByRole("combobox")
      await dropdown.waitFor({ state: "visible" })
      await dropdown.click()
      // Use exact: true to avoid matching partial names
      const option = page.getByRole("option", { name: String(value), exact: true })
      await option.waitFor({ state: "visible" })
      await option.click()
    } else {
      // Text/number editors render an input inside the cell
      const input = cell.getByRole("textbox").or(cell.locator("input").first())
      await input.waitFor({ state: "visible" })
      await input.clear()
      await input.fill(String(value))
      // Exit edit mode for text/number
      await page.keyboard.press("Tab")
    }
  }

  // Wait for potential auto-save
  await page.waitForLoadState("networkidle").catch(() => {
    // Timeout is acceptable, might not have network activity
  })
}

/**
 * Sort AG Grid by a column
 * @param grid - The AG Grid locator
 * @param colId - The column ID (field name)
 * @param direction - The sort direction ("asc", "desc", or "none" to clear)
 */
export async function sortByColumn(
  grid: Locator,
  colId: string,
  direction: "asc" | "desc" | "none",
): Promise<void> {
  const header = grid.locator(`.ag-header-cell[col-id="${colId}"]`)

  // Get current sort state
  const currentSort = await header.getAttribute("aria-sort")

  // Determine how many clicks needed
  let clicks = 0
  if (direction === "asc") {
    clicks = currentSort === "ascending" ? 0 : currentSort === "descending" ? 2 : 1
  } else if (direction === "desc") {
    clicks = currentSort === "descending" ? 0 : currentSort === "ascending" ? 1 : 2
  } else {
    // Clear sort - click until no sort
    clicks =
      currentSort === "ascending" ? 2 : currentSort === "descending" ? 1 : 0
  }

  for (let i = 0; i < clicks; i++) {
    await header.click()
    // Small delay between clicks for sort animation
    await grid.page().waitForTimeout(200)
  }
}

/**
 * Apply filter to a column using AG Grid's built-in filter
 * @param page - Playwright page object
 * @param grid - The AG Grid locator
 * @param colId - The column ID (field name)
 * @param values - The values to select in the filter
 */
export async function filterByColumn(
  page: Page,
  grid: Locator,
  colId: string,
  values: string[],
): Promise<void> {
  const header = grid.locator(`.ag-header-cell[col-id="${colId}"]`)

  // Open filter menu
  const filterButton = header.locator(".ag-header-cell-menu-button")
  await filterButton.click()

  // Wait for filter popup
  const filterPopup = page.locator(".ag-filter-wrapper, .ag-filter")
  await filterPopup.waitFor({ state: "visible" })

  // For multi-select filters, click each checkbox
  for (const value of values) {
    const checkbox = filterPopup.locator(`input[type="checkbox"]`).filter({
      has: page.locator(`xpath=../following-sibling::*[contains(text(), "${value}")]`),
    })
    if (await checkbox.isVisible()) {
      await checkbox.click()
    }
  }

  // Close filter by clicking outside
  await page.keyboard.press("Escape")
}

/**
 * Get all visible row data from AG Grid
 * @param grid - The AG Grid locator
 * @param columns - Array of column IDs to extract
 * @returns Array of objects with column values
 */
export async function getVisibleRowData(
  grid: Locator,
  columns: string[],
): Promise<Record<string, string>[]> {
  const rows = await grid.locator(".ag-row").all()
  const data: Record<string, string>[] = []

  for (const row of rows) {
    const rowData: Record<string, string> = {}
    for (const col of columns) {
      const cell = row.locator(`.ag-cell[col-id="${col}"]`)
      rowData[col] = (await cell.textContent()) || ""
    }
    data.push(rowData)
  }

  return data
}

/**
 * Get the total row count from AG Grid pagination info
 * @param grid - The AG Grid locator
 * @returns The total number of rows, or -1 if not available
 */
export async function getTotalRowCount(grid: Locator): Promise<number> {
  const paginationPanel = grid.locator(".ag-paging-panel")

  if (!(await paginationPanel.isVisible())) {
    // No pagination, count visible rows
    return await grid.locator(".ag-row").count()
  }

  // Try to extract from pagination text (e.g., "1 to 10 of 50")
  const pageText = await paginationPanel
    .locator(".ag-paging-row-summary-panel")
    .textContent()
  const match = pageText?.match(/of\s+(\d+)/)

  return match ? parseInt(match[1], 10) : -1
}

/**
 * Navigate to a specific page in AG Grid pagination
 * @param grid - The AG Grid locator
 * @param pageNumber - The page number to navigate to (1-based)
 */
export async function goToPage(
  grid: Locator,
  pageNumber: number,
): Promise<void> {
  const paginationPanel = grid.locator(".ag-paging-panel")

  if (!(await paginationPanel.isVisible())) {
    throw new Error("Pagination is not available on this grid")
  }

  // Click on page number input if available, or use next/prev buttons
  const pageInput = paginationPanel.locator(".ag-paging-page-summary-panel input")

  if (await pageInput.isVisible()) {
    await pageInput.clear()
    await pageInput.fill(String(pageNumber))
    await pageInput.press("Enter")
  } else {
    // Navigate using prev/next buttons
    const firstPageButton = paginationPanel.getByRole("button", { name: "First Page" })
    await firstPageButton.click()

    const nextPageButton = paginationPanel.getByRole("button", { name: "Next Page" })
    for (let i = 1; i < pageNumber; i++) {
      await nextPageButton.click()
      await grid.page().waitForTimeout(200)
    }
  }
}

/**
 * Assert that a row with specific content exists in the grid
 * @param grid - The AG Grid locator
 * @param colId - The column ID to search
 * @param value - The value to find
 */
export async function expectRowWithValue(
  grid: Locator,
  colId: string,
  value: string,
): Promise<void> {
  const cell = grid
    .locator(`.ag-cell[col-id="${colId}"]`)
    .filter({ hasText: value })
    .first()
  await expect(cell).toBeVisible()
}

/**
 * Assert that the grid is sorted by a column in a specific direction
 * @param grid - The AG Grid locator
 * @param colId - The column ID
 * @param direction - Expected sort direction
 */
export async function expectSortedBy(
  grid: Locator,
  colId: string,
  direction: "asc" | "desc",
): Promise<void> {
  const header = grid.locator(`.ag-header-cell[col-id="${colId}"]`)
  const ariaSort = direction === "asc" ? "ascending" : "descending"
  await expect(header).toHaveAttribute("aria-sort", ariaSort)
}
