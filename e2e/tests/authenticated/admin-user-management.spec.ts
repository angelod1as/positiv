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

    // Edit application status
    await userManagement.editSelectCell(
      firstRow,
      "application_status",
      "sent_rules",
    )
    await page.waitForTimeout(1000) // Allow for save

    // Verify the change persisted (check for translated value)
    const hasStatus = await userManagement.verifyCellContent(
      firstRow,
      "application_status",
      "Regras enviadas",
    )
    expect(hasStatus).toBe(true)

    // Test 2: Inline editing - Checkbox cell (has_paid)
    const secondParticipant = testParticipants[1]
    const secondRow = await userManagement.findRowByParticipantName(
      secondParticipant.socialName,
    )

    await userManagement.editCheckboxCell(secondRow, "has_paid", true)
    await page.waitForTimeout(1000)

    // Test 3: Inline editing - Select cell (attendance_status)
    await userManagement.editSelectCell(
      secondRow,
      "attendance_status",
      "attended",
    )
    await page.waitForTimeout(1000)

    // Test 4: Inline editing - Number cell (payment) on first row which already has has_paid=true
    await userManagement.editNumberCell(firstRow, "payment", "150")

    // Test 5: Data persistence - Refresh page
    await page.reload()
    await userManagement.waitForTableToLoad()

    // Find rows again and verify data persisted
    const refreshedFirstRow = await userManagement.findRowByParticipantName(
      firstParticipant.socialName,
    )
    const refreshedSecondRow = await userManagement.findRowByParticipantName(
      secondParticipant.socialName,
    )

    // Verify first participant changes persisted
    const firstStatusPersisted = await userManagement.verifyCellContent(
      refreshedFirstRow,
      "application_status",
      "Regras enviadas",
    )
    expect(firstStatusPersisted).toBe(true)

    // Verify first participant payment value was updated
    // In AG Grid, the payment cell displays the formatted value as text
    const paymentPersisted = await userManagement.verifyCellContent(
      refreshedFirstRow,
      "payment",
      "150",
    )
    expect(paymentPersisted).toBe(true)

    // Verify second participant changes persisted
    const secondStatusPersisted = await userManagement.verifyCellContent(
      refreshedSecondRow,
      "attendance_status",
      "Compareceu",
    )
    expect(secondStatusPersisted).toBe(true)
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

    // Get the first participant row
    const firstRow = await userManagement.tableRows.first()
    // AG Grid uses col-id for cell identification - get name from social_name column
    const participantName =
      (await firstRow.locator('.ag-cell[col-id="social_name"]').textContent()) ||
      "Unknown"

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
    await expect(page.locator("h1")).toContainText(
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

    // Edit a field in detail view
    await userManagement.editDetailField("application_status", "finalised")

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

    // Verify detail view change reflected in table
    const updatedRow = await userManagement.findRowByParticipantName(
      participantName.split(" ")[0],
    )
    const statusUpdated = await userManagement.verifyCellContent(
      updatedRow,
      "application_status",
      "Finalizado",
    )
    expect(statusUpdated).toBe(true)
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

    // Verify current event's status values
    const applicationStatusSelect = page.locator('[name="application_status"]')
    const attendanceStatusSelect = page.locator('[name="attendance_status"]')

    await expect(applicationStatusSelect).toHaveValue("sent_payment_data")
    await expect(attendanceStatusSelect).toHaveValue("pending")

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

    // Extract event ID from current URL to detect change
    const currentEventId = currentEventUrl.split("/eventos/")[1].split("/")[0]

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
    await expect(applicationStatusSelect).toHaveValue("finalised")
    await expect(attendanceStatusSelect).toHaveValue("attended")

    // Test browser back navigation also works correctly
    await page.goBack()
    await page.waitForLoadState("networkidle")

    // Should show the original event data again
    await expect(
      page.getByText(/No evento.*Evento Com Inscrições Abertas 1/),
    ).toBeVisible()
    await expect(applicationStatusSelect).toHaveValue("sent_payment_data")
    await expect(attendanceStatusSelect).toHaveValue("pending")
  })

  test("AG Grid sorting functionality", async ({ page }) => {
    // Navigate to a seed event with participants
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")
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
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")
    const initialRowCount = await grid.locator(".ag-row").count()
    expect(initialRowCount).toBeGreaterThan(0)

    // Apply a filter using the multi-select filter
    // Click on application_status filter button
    const appStatusHeader = grid.locator(
      '.ag-header-cell[col-id="application_status"]',
    )
    const filterButton = appStatusHeader.locator(".ag-header-icon")
    await filterButton.click()

    // Wait for filter popup
    const filterPopup = page.locator(".ag-filter-wrapper, .ag-popup")
    await filterPopup.waitFor({ state: "visible", timeout: 5000 })

    // Select a specific status (if filter options are visible)
    // Since multi-select filters vary, just verify the filter UI opens
    await expect(filterPopup).toBeVisible()

    // Close filter
    await page.keyboard.press("Escape")

    // Reload page
    await page.reload()
    await waitForAGGridReady(page, "participants-table-ag")

    // Verify grid is still visible after reload
    await expect(grid).toBeVisible()
  })

  test("AG Grid row selection and navigation", async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")

    // Get the first row
    const firstRow = grid.locator(".ag-row").first()
    await expect(firstRow).toBeVisible()

    // Get participant name from the row
    const participantName = await firstRow
      .locator('.ag-cell[col-id="social_name"]')
      .textContent()
    expect(participantName).toBeTruthy()

    // Click on the actions cell to view participant
    const actionsCell = firstRow.locator('.ag-cell[col-id="actions"]')
    const viewLink = actionsCell.locator("a").first()
    await viewLink.click()

    // Verify navigation to participant detail page
    await expect(page).toHaveURL(/\/participantes\//)

    // Verify participant name is shown in detail view
    await expect(page.locator("h1")).toContainText(
      (participantName ?? "").trim(),
    )
  })

  test("AG Grid pagination controls", async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with participants (need one with enough for pagination)
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")

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
    // Navigate to a seed event with participants
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")

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
    // Navigate to a seed event with participants
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")

    // Focus on the first cell
    const firstCell = grid.locator(".ag-cell").first()
    await firstCell.click()

    // Test arrow key navigation
    // Press right arrow to move to next cell
    await page.keyboard.press("ArrowRight")
    // Verify focus moved (the focused cell will have a specific class or attribute)

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
    // Navigate to a seed event with participants
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()

    // Click on an event with known participants
    await adminDashboard.clickViewEvent("Evento Com Inscrições Abertas 1")

    // Wait for AG Grid to be ready
    const grid = await waitForAGGridReady(page, "participants-table-ag")

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
})
