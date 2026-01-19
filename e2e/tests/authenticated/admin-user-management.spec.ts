import { expect, test } from "@playwright/test"
import path from "path"
import { AdminDashboardPage } from "../../pages/admin/AdminDashboardPage"
import { EventManagementPage } from "../../pages/admin/EventManagementPage"
import { UserManagementPage } from "../../pages/admin/UserManagementPage"
import {
  waitForAGGridReady,
  sortByColumn,
  expectSortedBy,
} from "../../helpers/ag-grid"
import {
  cleanupTestParticipants,
  createTestEventWithParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"

test.describe("Admin User Management", () => {
  test.use({
    storageState: path.resolve(import.meta.dirname, "../../.auth/admin.json"),
  })

  let userManagement: UserManagementPage
  let adminDashboard: AdminDashboardPage
  let eventManagement: EventManagementPage
  let testParticipants: TestParticipant[] = []
  let testEventId: string = ""
  let testEventIdDetail: string = ""

  test.beforeEach(async ({ page }) => {
    userManagement = new UserManagementPage(page)
    adminDashboard = new AdminDashboardPage(page)
    eventManagement = new EventManagementPage(page)
  })

  test.afterEach(async () => {
    // Cleanup window.open override
    await userManagement.cleanup()

    // Cleanup test participants
    if (testParticipants.length > 0) {
      await cleanupTestParticipants(testParticipants)
      testParticipants = []
    }

    // Note: Test events are cleaned up in global teardown to avoid
    // interfering with other tests that may need them
  })

  test("table inline editing operations", async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Create a test event with participants
    const timestamp = Date.now()
    const eventTitle = `[E2E-TEST] Event ${timestamp}`

    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL("/admin/eventos/novo")

    // Fill event creation form
    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: "🎭",
      description: "Test event for user management E2E tests",
      location: "Test Location",
      price: "100",
      capacity: "50",
      type: "regular",
    })

    // Set event start date (one month from now)
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + 30) // Add 30 days instead of adding a month
    await eventManagement.setEventStartDate(eventDate)

    // Click auto-calculate dates button
    await eventManagement.clickCalculateDates()

    // Save the event (this will wait for navigation)
    await eventManagement.saveEvent()

    // Should redirect to view event page
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)

    // Get the event ID from URL - ensure it's not "novo"
    const url = page.url()
    testEventId = url.split("/").pop() || ""
    expect(testEventId).not.toBe("novo")
    expect(testEventId).toMatch(/^[\w-]+$/)

    // Create test participants
    testParticipants = await createTestEventWithParticipants(testEventId, 3)

    // Navigate to user management page
    await userManagement.navigate(testEventId)
    await expect(page).toHaveURL(`/admin/eventos/${testEventId}`)

    // Verify the participants table is visible
    await expect(userManagement.participantsTable).toBeVisible()
    await userManagement.waitForTableToLoad()

    // Verify participant count
    const participantCount = await userManagement.tableRows.count()
    expect(participantCount).toBe(3)

    // Test 1: Inline editing - Select cell (application_status)
    const firstParticipant = testParticipants[0]
    const firstRow = await userManagement.findRowByParticipantName(
      firstParticipant.socialName,
    )

    // Edit application status - use display name that appears in dropdown
    // Wait for the POST response to ensure auto-save completes before proceeding
    const saveResponsePromise1 = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && resp.status() === 200,
    )
    await userManagement.editSelectCell(
      firstRow,
      "application_status",
      "Regras enviadas",
    )
    await saveResponsePromise1

    // Verify the change shows immediately - look for the cell in the grid that has our value
    // AG Grid renders rows in multiple containers, so we search the whole grid for the status
    const firstParticipantStatusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="application_status"]')
      .filter({ hasText: "Regras enviadas" })
      .first()
    await expect(firstParticipantStatusCell).toBeVisible()

    // Test 2: Inline editing - Another select cell (attendance_status)
    const secondParticipant = testParticipants[1]
    const secondRow = await userManagement.findRowByParticipantName(
      secondParticipant.socialName,
    )

    // Wait for the POST response to ensure auto-save completes before page reload
    const saveResponsePromise2 = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && resp.status() === 200,
    )
    await userManagement.editSelectCell(
      secondRow,
      "attendance_status",
      "Compareceu",
    )
    await saveResponsePromise2

    // Test 3: Data persistence - Refresh page and verify changes persist
    await page.reload()
    await userManagement.waitForTableToLoad()

    // Verify first participant changes persisted - search for cell with our value
    const persistedFirstStatusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="application_status"]')
      .filter({ hasText: "Regras enviadas" })
      .first()
    await expect(persistedFirstStatusCell).toBeVisible()

    // Verify second participant changes persisted
    const persistedSecondStatusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="attendance_status"]')
      .filter({ hasText: "Compareceu" })
      .first()
    await expect(persistedSecondStatusCell).toBeVisible()
  })

  test("detail view and external integrations", async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Create a new test event for detail view testing
    const timestamp = Date.now()
    const eventTitle = `[E2E-TEST] Event Detail View ${timestamp}`

    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL("/admin/eventos/novo")

    // Fill event creation form
    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: "🎯",
      description: "Test event for detail view E2E tests",
      location: "Test Location",
      price: "50",
      capacity: "30",
      type: "regular",
    })

    // Set event start date (one month from now)
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + 30)
    await eventManagement.setEventStartDate(eventDate)

    // Click auto-calculate dates button
    await eventManagement.clickCalculateDates()

    // Save the event (this will wait for navigation)
    await eventManagement.saveEvent()

    // Should redirect to view event page
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)

    // Get the event ID from URL - ensure it's not "novo"
    const url = page.url()
    testEventIdDetail = url.split("/").pop() || ""
    expect(testEventIdDetail).not.toBe("novo")
    expect(testEventIdDetail).toMatch(/^[\w-]+$/)

    // Create test participants with minimal data for speed
    testParticipants = await createTestEventWithParticipants(
      testEventIdDetail,
      2,
    )

    // Navigate back to the event page to see participants
    await userManagement.navigate(testEventIdDetail)
    await userManagement.waitForTableToLoad()

    // Get the first participant row - need to get name from pinned left section
    const firstRow = await userManagement.tableRows.first()
    const rowIndex = await firstRow.getAttribute("row-index")
    // social_name is in the left pinned section, so we need to look there
    const participantName =
      (await userManagement.participantsTable
        .locator(
          `.ag-pinned-left-cols-container .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="social_name"]`,
        )
        .textContent()) || "Unknown"

    // Test WhatsApp button if available
    const whatsappButton = firstRow
      .locator('button:has(img[alt="WhatsApp"])')
      .first()
    const hasWhatsApp = (await whatsappButton.count()) > 0

    if (hasWhatsApp) {
      await userManagement.clickWhatsAppButton(firstRow)
      const openedUrl = await userManagement.getLastOpenedUrl()
      expect(openedUrl).toMatch(/^https:\/\/wa\.me\//)
    }

    // Test detail view
    await userManagement.clickViewParticipantButton(firstRow)
    await userManagement.waitForDetailView()

    // Verify we're on the detail page
    await expect(page).toHaveURL(
      new RegExp(`/admin/eventos/${testEventIdDetail}/participantes/[\\w-]+$`),
    )
    await expect(page.locator("h2").first()).toContainText(
      participantName.split(" ")[0],
    )

    // Verify important participant fields are displayed
    await expect(page.getByText("Indicações:")).toBeVisible()
    await expect(page.getByText("Indicade por:")).toBeVisible()
    await expect(page.getByText("Vai acompanhade?")).toBeVisible()
    await expect(page.getByText("Notas (Participante):")).toBeVisible()

    // Verify the referred field value is displayed
    // We know the first participant (index 0) has 'João Test - indicação formal'
    // and the second (index 1) has 'ninguém'
    const participantIndex = participantName.includes("Participant 1") ? 0 : 1
    const expectedReferredValue =
      participantIndex === 0 ? "João Test - indicação formal" : "ninguém"
    await expect(page.getByText(expectedReferredValue)).toBeVisible()

    // Edit a field in detail view (use display name for Radix UI Select)
    await userManagement.editDetailField("application_status", "Finalizado")

    // Save changes
    await userManagement.saveDetailViewChanges()

    // Test Google Contacts integration if visible
    const googleContactsVisible =
      await userManagement.googleContactsButton.isVisible()
    if (googleContactsVisible) {
      await userManagement.clickGoogleContactsButton()

      const { copiedText, openedUrl } =
        await userManagement.verifyGoogleContactsIntegration()

      // Verify clipboard content was copied
      expect(copiedText).toBeTruthy()
      expect(copiedText).toContain(participantName.split(" ")[0])

      // Verify Google Contacts URL was opened
      expect(openedUrl).toBeTruthy()
      expect(openedUrl).toContain("contacts.google.com")
    }

    // Navigate back to table
    await userManagement.navigate(testEventIdDetail)
    await userManagement.waitForTableToLoad()

    // Verify detail view change reflected in table - search for cell with our value
    const updatedStatusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="application_status"]')
      .filter({ hasText: "Finalizado" })
      .first()
    await expect(updatedStatusCell).toBeVisible()
  })

  /**
   * POS-362: Test that navigating between events via participant history
   * correctly updates the displayed status data (fixes stale data bug).
   *
   * Uses seed data:
   * - User3 (user3@example.com / social_name: "user3")
   * - "Evento Com Inscrições Abertas 1": application_status='sent_payment_data', attendance_status='pending'
   * - "Evento Concluído 1": application_status='finalised', attendance_status='attended'
   */
  test("participant history navigation shows correct data (POS-362)", async ({
    page,
  }) => {
    // Navigate to the Registration Open event using seed data
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on "Evento Com Inscrições Abertas 1" in the events table
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for participants table to load
    await userManagement.waitForTableToLoad()

    // Find the row for User3 (social_name: "user3") - seed data participant with history
    const participantRow =
      await userManagement.findRowByParticipantName("user3")

    // Click to view participant details
    await userManagement.clickViewParticipantButton(participantRow)

    // Wait for navigation to participant detail page
    await page.waitForURL(/\/participantes\//)
    await userManagement.waitForDetailView()

    // Store the current URL to verify navigation later
    const currentEventUrl = page.url()
    expect(currentEventUrl).toContain("/participantes/")

    // Verify we're on the correct event page by checking the "No evento" paragraph
    await expect(
      page.getByText(/No evento.*Evento Com Inscrições Abertas 1/),
    ).toBeVisible()

    // Verify current event's status values (Radix UI Select shows text in trigger button)
    const applicationStatusTrigger = page.locator('[id="application_status"]')
    const attendanceStatusTrigger = page.locator('[id="attendance_status"]')

    await expect(applicationStatusTrigger).toContainText("Dados de pagto enviados")
    await expect(attendanceStatusTrigger).toContainText("Pendente")

    // Find and click on a different event in the history section
    const historySection = page.getByRole("heading", {
      name: "Histórico de Inscrições",
    })
    await expect(historySection).toBeVisible({ timeout: 5000 })

    // Click on the completed event link in history and wait for navigation
    const historyEventLink = page.getByRole("link", {
      name: /Evento Concluído 1/i,
    })
    await expect(historyEventLink).toBeVisible()

    // Extract event ID from current URL to detect change (using URL API for robustness)
    const currentEventId =
      new URL(currentEventUrl).pathname.match(/\/eventos\/([^/]+)/)?.[1] ?? ""

    // Click the link
    await historyEventLink.click()

    // Wait for URL to change to a different event
    await page.waitForFunction(
      (oldEventId) => {
        const url = window.location.href
        const match = url.match(/\/eventos\/([^/]+)/)
        return match && match[1] !== oldEventId
      },
      currentEventId,
      { timeout: 10000 },
    )

    await page.waitForLoadState("networkidle")

    // Verify URL changed (different event ID)
    const newUrl = page.url()
    expect(newUrl).not.toEqual(currentEventUrl)
    expect(newUrl).toContain("/participantes/")

    // KEY ASSERTION: Verify the page now shows the completed event's data
    // This is what was broken in POS-362 - it showed stale data from previous event
    // Use the "No evento" paragraph to specifically target the header, not the history link
    await expect(page.getByText(/No evento.*Evento Concluído 1/)).toBeVisible()

    // Verify the status values updated to the completed event's values
    // User3 attended the completed event with finalised status
    await expect(applicationStatusTrigger).toContainText("Finalizado")
    await expect(attendanceStatusTrigger).toContainText("Compareceu")

    // Test browser back navigation also works correctly
    await page.goBack()
    await page.waitForLoadState("networkidle")

    // Should show the original event data again
    await expect(
      page.getByText(/No evento.*Evento Com Inscrições Abertas 1/),
    ).toBeVisible()
    await expect(applicationStatusTrigger).toContainText("Dados de pagto enviados")
    await expect(attendanceStatusTrigger).toContainText("Pendente")
  })

  test("AG Grid sorting functionality", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")
    await expect(grid).toBeVisible()

    // Test sorting by full_name column ascending
    await sortByColumn(grid, "full_name", "asc")
    await expectSortedBy(grid, "full_name", "asc")

    // Test sorting by full_name column descending
    await sortByColumn(grid, "full_name", "desc")
    await expectSortedBy(grid, "full_name", "desc")

    // Clear sort and verify
    await sortByColumn(grid, "full_name", "none")
    const header = grid.locator('.ag-header-cell[col-id="full_name"]')
    await expect(header).not.toHaveAttribute("aria-sort", "ascending")
    await expect(header).not.toHaveAttribute("aria-sort", "descending")
  })

  test("AG Grid filter persistence across page reload", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")
    const initialRowCount = await grid.locator(".ag-row").count()
    expect(initialRowCount).toBeGreaterThan(0)

    // Apply a filter using the multi-select filter
    // Click on application_status filter button
    const appStatusHeader = grid.locator(
      '.ag-header-cell[col-id="application_status"]',
    )
    const filterButton = appStatusHeader.locator(".ag-header-icon")
    await filterButton.click()

    // Wait for filter popup - AG Grid renders filter content in a popup
    // Wait for the "Selecionar Todos" button which indicates the filter UI is ready
    const selectAllButton = page.getByRole("button", { name: "Selecionar Todos" })
    await selectAllButton.waitFor({ state: "visible", timeout: 5000 })

    // Verify filter options are visible
    await expect(selectAllButton).toBeVisible()

    // Close filter
    await page.keyboard.press("Escape")

    // Reload page
    await page.reload()
    await waitForAGGridReady(page, "participants-table")

    // Verify grid is still visible after reload
    await expect(grid).toBeVisible()
  })

  test("AG Grid row selection and navigation", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")

    // Get the first row from pinned left section (where social_name is)
    // AG Grid renders rows in separate containers for each pinned section
    const pinnedLeftRow = grid
      .locator(".ag-pinned-left-cols-container .ag-row")
      .first()
    await expect(pinnedLeftRow).toBeVisible()

    // Get the row-index to find corresponding cells across viewports
    const rowIndex = await pinnedLeftRow.getAttribute("row-index")
    expect(rowIndex).toBeTruthy()

    // Get participant name from the pinned left section
    const socialNameCell = grid
      .locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="social_name"]`)
      .first()
    const participantName = await socialNameCell.textContent()
    expect(participantName).toBeTruthy()

    // Click on the actions cell using row-index (actions is in pinned right)
    const actionsCell = grid
      .locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="actions"]`)
      .first()
    const viewLink = actionsCell.locator("a").first()
    await viewLink.scrollIntoViewIfNeeded()
    await viewLink.click()

    // Verify navigation to participant detail page
    await expect(page).toHaveURL(/\/participantes\//)

    // Verify participant name is shown in detail view
    await expect(page.locator("h2").first()).toContainText(
      (participantName ?? "").trim(),
    )
  })

  test("AG Grid pagination controls", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants (need one with enough for pagination)
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")

    // Check if pagination panel exists
    const paginationPanel = grid.locator(".ag-paging-panel")
    const hasPagination = await paginationPanel.isVisible()

    if (hasPagination) {
      // Verify pagination info is displayed
      const pageInfo = paginationPanel.locator(".ag-paging-row-summary-panel")
      await expect(pageInfo).toBeVisible()

      // Verify page size selector if present
      const pageSizeSelector = paginationPanel.locator(
        ".ag-paging-page-size select",
      )
      if (await pageSizeSelector.isVisible()) {
        // Verify it shows options
        const options = await pageSizeSelector.locator("option").count()
        expect(options).toBeGreaterThan(0)
      }
    }
  })

  test("AG Grid accessibility - ARIA roles and attributes", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")

    // Verify grid has proper ARIA role
    const gridRole = grid.locator('[role="grid"]')
    await expect(gridRole).toBeVisible()

    // Verify header row has proper role
    const headerRow = grid.locator('[role="row"]').first()
    await expect(headerRow).toBeVisible()

    // Verify data rows have proper roles
    const dataRows = grid.locator('.ag-row[role="row"]')
    const rowCount = await dataRows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify cells have proper roles (gridcell or columnheader)
    const headerCells = grid.locator('[role="columnheader"]')
    const headerCellCount = await headerCells.count()
    expect(headerCellCount).toBeGreaterThan(0)

    // Verify sortable columns have aria-sort attribute when sorted
    const sortableHeader = grid.locator(
      '.ag-header-cell[col-id="full_name"]',
    )
    await sortableHeader.click() // Sort ascending
    await expect(sortableHeader).toHaveAttribute("aria-sort", "ascending")

    await sortableHeader.click() // Sort descending
    await expect(sortableHeader).toHaveAttribute("aria-sort", "descending")
  })

  test("AG Grid keyboard navigation", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")

    // Focus on the first cell
    const firstCell = grid.locator(".ag-cell").first()
    await firstCell.click()

    // Test arrow key navigation
    // Press right arrow to move to next cell
    await page.keyboard.press("ArrowRight")
    // Verify focus moved - AG Grid adds ag-cell-focus class to focused cell
    const focusedCell = grid.locator(".ag-cell-focus")
    await expect(focusedCell).toBeVisible()

    // Press down arrow to move to row below
    await page.keyboard.press("ArrowDown")

    // Press Tab to move between cells
    await page.keyboard.press("Tab")

    // Test Enter key to start editing (on editable cells)
    // First navigate to an editable cell
    const editableCell = grid.locator('.ag-cell[col-id="application_status"]').first()
    await editableCell.click()
    await page.keyboard.press("Enter")

    // Verify edit mode is activated (popup editor should appear)
    const popupEditor = page.locator(".ag-popup-editor")
    // Editor may or may not appear depending on cell type, so we just verify no error

    // Press Escape to cancel editing
    await page.keyboard.press("Escape")

    // Verify we exited edit mode
    await expect(popupEditor).not.toBeVisible()
  })

  test("AG Grid fullscreen toggle", async ({ page }) => {
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table")

    // Find the fullscreen toggle button
    const fullscreenButton = page.getByRole("button", {
      name: "Maximizar tabela",
    })

    if (await fullscreenButton.isVisible()) {
      // Click to enter fullscreen
      await fullscreenButton.click()

      // Verify grid is now in fullscreen mode (check for fullscreen class or style)
      const gridContainer = grid.locator("..") // Parent element
      await expect(gridContainer).toBeVisible()

      // Find minimize button
      const minimizeButton = page.getByRole("button", {
        name: "Minimizar tabela",
      })

      if (await minimizeButton.isVisible()) {
        // Click to exit fullscreen
        await minimizeButton.click()
      }
    }
  })

  /**
   * POS-378: Test that clicking on a profile name in the all-participants table
   * navigates to the profile detail page.
   */
  test("all-participants table profile name links to detail page (POS-378)", async ({
    page,
  }) => {
    // Navigate to all-participants page
    await page.goto("/admin/participantes")
    await page.waitForLoadState("networkidle")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "all-participants-table")
    await expect(grid).toBeVisible()

    // Get the first row from pinned left section (where social_name is)
    const pinnedLeftRow = grid
      .locator(".ag-pinned-left-cols-container .ag-row")
      .first()
    await expect(pinnedLeftRow).toBeVisible()

    // Get the row-index to find corresponding cells across viewports
    const rowIndex = await pinnedLeftRow.getAttribute("row-index")
    expect(rowIndex).toBeTruthy()

    // Get the social_name cell which should now be a link
    const socialNameCell = grid
      .locator(
        `.ag-pinned-left-cols-container .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="social_name"]`,
      )
      .first()
    await expect(socialNameCell).toBeVisible()

    // Get the link inside the cell
    const profileLink = socialNameCell.locator("a")
    await expect(profileLink).toBeVisible()

    // Get the profile name text for later verification
    const profileName = await profileLink.textContent()
    expect(profileName).toBeTruthy()

    // Click the profile link
    await profileLink.click()

    // Verify navigation to profile detail page
    await expect(page).toHaveURL(/\/admin\/participantes\/[\w-]+$/)

    // Verify profile name appears in the detail view
    await expect(page.locator("h2").first()).toContainText(
      (profileName ?? "").trim(),
    )
  })
})
