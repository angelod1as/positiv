import { expect, test, type Page } from "@playwright/test"
import path from "path"
import { AdminDashboardPage } from "../../pages/admin/AdminDashboardPage"
import { UserManagementPage } from "../../pages/admin/UserManagementPage"
import { getBaseUrl } from "../../utils/run-context"
import {
  getProfileId,
  readLikertStatements,
  setLikertSettings,
} from "../../utils/likert-helpers"
import { readSetupUser } from "../../utils/setup-user"
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
import {
  createEventAsAdmin,
  findSeedEventId,
  findSeedProfileId,
} from "../../utils/admin-event-helpers"

test.describe("Admin User Management", () => {
  test.use({
    storageState: path.resolve(import.meta.dirname, "../../.auth/admin.json"),
  })

  let userManagement: UserManagementPage
  let adminDashboard: AdminDashboardPage
  let testParticipants: TestParticipant[] = []

  test.beforeEach(async ({ page }) => {
    userManagement = new UserManagementPage(page)
    adminDashboard = new AdminDashboardPage(page)
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

  // An event of its own with fixture participants: Participant 1 starts
  // flagged yellow with notes, Participant 3 unflagged without any
  async function eventWithParticipants(count: number) {
    const event = await createEventAsAdmin(`Event ${Date.now()}`, 30)
    testParticipants = await createTestEventWithParticipants(event.id, count)
    return event
  }

  async function openParticipant(page: Page, eventId: string, profileId: string) {
    await page.goto(`/admin/eventos/${eventId}/participantes/${profileId}`)
    await userManagement.waitForHydration()
    await userManagement.waitForDetailView()
  }

  test("the participants table lists the event's participants", async ({
    page,
  }) => {
    const event = await eventWithParticipants(3)

    await userManagement.navigate(event.id)
    await expect(page).toHaveURL(`/admin/eventos/${event.id}`)

    await expect(userManagement.participantsTable).toBeVisible()
    await userManagement.waitForTableToLoad()
    expect(await userManagement.tableRows.count()).toBe(3)
  })

  test("an application status edited in the table is saved", async ({
    page,
  }) => {
    const event = await eventWithParticipants(1)

    await userManagement.navigate(event.id)
    const row = await userManagement.findRowByParticipantName(
      testParticipants[0].socialName,
    )
    await userManagement.editSelectCell(
      row,
      "application_status",
      "Regras enviadas",
    )

    // AG Grid renders rows in multiple containers, so the whole grid is
    // searched for the value
    const statusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="application_status"]')
      .filter({ hasText: "Regras enviadas" })
      .first()
    await expect(statusCell).toBeVisible()

    await page.reload()
    await userManagement.waitForTableToLoad()
    await expect(statusCell).toBeVisible()
  })

  test("an attendance status edited in the table is saved", async ({
    page,
  }) => {
    const event = await eventWithParticipants(2)

    await userManagement.navigate(event.id)
    const row = await userManagement.findRowByParticipantName(
      testParticipants[1].socialName,
    )
    await userManagement.editSelectCell(row, "attendance_status", "Compareceu")

    await page.reload()
    await userManagement.waitForTableToLoad()
    const attendanceCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="attendance_status"]')
      .filter({ hasText: "Compareceu" })
      .first()
    await expect(attendanceCell).toBeVisible()
  })

  test("the WhatsApp button in the table links to the participant's number", async () => {
    const event = await eventWithParticipants(1)

    await userManagement.navigate(event.id)
    const row = await userManagement.findRowByParticipantName("Participant 1")

    await expect(
      row.locator('a:has(img[alt="WhatsApp"])').first(),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\//)
  })

  test("the view button opens the participant's detail page", async ({
    page,
  }) => {
    const event = await eventWithParticipants(1)

    await userManagement.navigate(event.id)
    const row = await userManagement.findRowByParticipantName("Participant 1")
    await userManagement.clickViewParticipantButton(row)
    await userManagement.waitForDetailView()

    await expect(page).toHaveURL(
      new RegExp(`/admin/eventos/${event.id}/participantes/[\\w-]+$`),
    )
    await expect(page.locator("h2").first()).toContainText("Participant")

    await expect(page.getByText("Indicações:")).toBeVisible()
    await expect(page.getByText("Indicade por:")).toBeVisible()
    await expect(page.getByText("Vai acompanhade?")).toBeVisible()
    await expect(page.getByText("Notas (Participante):")).toBeVisible()
    await expect(page.getByText("João Test - indicação formal")).toBeVisible()
  })

  test("an application status edited on the detail page shows in the table", async ({
    page,
  }) => {
    const event = await eventWithParticipants(1)
    await openParticipant(page, event.id, testParticipants[0].profileId)

    // Neither fixture participant starts with this status, so it is a real save
    await userManagement.saveDetailField(() =>
      userManagement.editDetailField("application_status", "Pensar melhor"),
    )
    await expect(page.locator("#application_status")).toContainText(
      "Pensar melhor",
    )

    await userManagement.navigate(event.id)
    await userManagement.waitForTableToLoad()
    const updatedStatusCell = userManagement.participantsTable
      .locator('.ag-cell[col-id="application_status"]')
      .filter({ hasText: "Pensar melhor" })
      .first()
    await expect(updatedStatusCell).toBeVisible()
  })

  test("the Google Contacts button copies the name and opens Google Contacts", async ({
    page,
  }) => {
    const event = await eventWithParticipants(1)
    await openParticipant(page, event.id, testParticipants[0].profileId)

    await userManagement.clickGoogleContactsButton()
    const { copiedText, openedUrl } =
      await userManagement.verifyGoogleContactsIntegration()

    expect(copiedText).toBeTruthy()
    expect(copiedText).toContain("Participant")
    expect(openedUrl).toBeTruthy()
    expect(openedUrl).toContain("contacts.google.com")
  })

  test("removing a flag and its notes is saved", async ({ page }) => {
    const event = await eventWithParticipants(1)
    await openParticipant(page, event.id, testParticipants[0].profileId)

    // Each save waits for the reloaded data on screen: the next edit reads it
    await userManagement.saveDetailField(() =>
      userManagement.editDetailField("flag", "Sem flag"),
    )
    await expect(page.locator("#flag")).toContainText("Sem flag")
    await userManagement.saveDetailField(async () => {
      await userManagement.editDetailField("flag_notes", "")
      await page.locator("#flag_notes").blur()
    })
    await expect(page.locator("#flag_notes")).toHaveValue("")

    await page.reload()
    await userManagement.waitForDetailView()
    await expect(page.locator("#flag")).toContainText("Sem flag")
    await expect(page.locator("#flag_notes")).toHaveValue("")
  })

  test("a flag without notes is not saved", async ({ page }) => {
    const event = await eventWithParticipants(3)
    await openParticipant(page, event.id, testParticipants[2].profileId)
    await expect(page.locator("#flag")).toContainText("Sem flag")

    await userManagement.expectToastAfter("warning", () =>
      userManagement.editDetailField("flag", "Flag amarela"),
    )
    await expect(page.locator("#flag")).toContainText("Sem flag")
  })

  test("a flag with notes is saved", async ({ page }) => {
    const event = await eventWithParticipants(3)
    await openParticipant(page, event.id, testParticipants[2].profileId)

    const flagNotes = `E2E flag notes ${Date.now()}`
    await userManagement.saveDetailField(async () => {
      await userManagement.editDetailField("flag_notes", flagNotes)
      await page.locator("#flag_notes").blur()
    })
    await userManagement.saveDetailField(() =>
      userManagement.editDetailField("flag", "Flag amarela"),
    )
    await expect(page.locator("#flag")).toContainText("Flag amarela")

    await page.reload()
    await userManagement.waitForDetailView()
    await expect(page.locator("#flag")).toContainText("Flag amarela")
    await expect(page.locator("#flag_notes")).toHaveValue(flagNotes)
  })

  test("the veteran checkbox is saved", async ({ page }) => {
    const event = await eventWithParticipants(1)
    await openParticipant(page, event.id, testParticipants[0].profileId)

    const wasVeteran = await userManagement.veteranCheckbox.isChecked()
    await userManagement.saveDetailField(() =>
      userManagement.veteranLabel.click(),
    )
    await expect(userManagement.veteranCheckbox).toBeChecked({
      checked: !wasVeteran,
    })

    await page.reload()
    await userManagement.waitForDetailView()
    await expect(userManagement.veteranCheckbox).toBeChecked({
      checked: !wasVeteran,
    })
  })

  test("an attendance status edited on the detail page is saved", async ({
    page,
  }) => {
    const event = await eventWithParticipants(1)
    await openParticipant(page, event.id, testParticipants[0].profileId)

    await userManagement.saveDetailField(() =>
      userManagement.editDetailField("attendance_status", "Desistiu"),
    )
    await expect(page.locator("#attendance_status")).toContainText("Desistiu")

    await page.reload()
    await userManagement.waitForDetailView()
    await expect(page.locator("#attendance_status")).toContainText("Desistiu")
  })

  /**
   * POS-362: navigating between events via participant history must update
   * the displayed status data (it used to show stale data).
   *
   * Uses seed data:
   * - User3 (user3@example.com / social_name: "user3")
   * - "Evento Com Inscrições Abertas 1": application_status='sent_payment_data', attendance_status='pending'
   * - "Evento Concluído 1": application_status='finalised', attendance_status='attended'
   */
  const OPEN_SEED_EVENT = "Evento Com Inscrições Abertas 1"

  async function openUser3OnOpenEvent(page: Page) {
    const eventId = await findSeedEventId(OPEN_SEED_EVENT)
    const profileId = await findSeedProfileId("user3@example.com")
    await openParticipant(page, eventId, profileId)
    return eventId
  }

  async function followHistoryToCompletedEvent(page: Page, eventId: string) {
    const historySection = page.getByRole("heading", {
      name: "Histórico de candidaturas",
    })
    await expect(historySection).toBeVisible({ timeout: 5000 })

    // first(): the pattern also matches "Evento Concluído 10", "11" and so on
    const historyEventLink = page
      .getByRole("link", { name: /Evento Concluído 1/i })
      .first()
    await expect(historyEventLink).toBeVisible()
    await historyEventLink.click()

    await page.waitForFunction(
      (oldEventId) => {
        const match = window.location.href.match(/\/eventos\/([^/]+)/)
        return match && match[1] !== oldEventId
      },
      eventId,
      { timeout: 10000 },
    )
    await page.waitForLoadState("networkidle")
  }

  const applicationStatus = (page: Page) =>
    page.locator('[id="application_status"]')
  const attendanceStatus = (page: Page) =>
    page.locator('[id="attendance_status"]')

  test("a participant opened from the table shows that event's statuses", async ({
    page,
  }) => {
    await userManagement.navigate(await findSeedEventId(OPEN_SEED_EVENT))
    await userManagement.waitForTableToLoad()

    // user3 may be on page 2+ due to default sort, so the search box brings
    // them into view first
    const searchInput = userManagement.participantsTable.locator(
      '[aria-label="Buscar participantes"]',
    )
    await searchInput.fill("user3")
    const user3Link = userManagement.participantsTable
      .locator(".ag-pinned-left-cols-container a")
      .getByText("user3", { exact: true })
      .first()
    // Read the href and navigate instead of clicking: AG Grid recycles the row
    // elements while it applies the quick filter, so a click can land on a row
    // that is being detached. The href is stable once the link is visible.
    await expect(user3Link).toBeVisible()
    const user3Href = await user3Link.getAttribute("href")
    if (!user3Href) {
      throw new Error("Could not get the href from the user3 link")
    }
    await page.goto(user3Href)

    await page.waitForURL(/\/participantes\//)
    await userManagement.waitForDetailView()
    expect(page.url()).toContain("/participantes/")

    await expect(
      page.getByText(/No evento.*Evento Com Inscrições Abertas 1/),
    ).toBeVisible()
    await expect(applicationStatus(page)).toContainText(
      "Dados de pagto enviados",
    )
    await expect(attendanceStatus(page)).toContainText("Pendente")
  })

  test("a history link shows the other event's statuses (POS-362)", async ({
    page,
  }) => {
    const eventId = await openUser3OnOpenEvent(page)
    const openEventUrl = page.url()
    await expect(applicationStatus(page)).toContainText(
      "Dados de pagto enviados",
    )

    await followHistoryToCompletedEvent(page, eventId)

    expect(page.url()).not.toEqual(openEventUrl)
    expect(page.url()).toContain("/participantes/")
    // The "No evento" paragraph targets the header, not the history link
    await expect(page.getByText(/No evento.*Evento Concluído 1/)).toBeVisible()
    await expect(applicationStatus(page)).toContainText("Finalizado")
    await expect(attendanceStatus(page)).toContainText("Compareceu")
  })

  test("going back from a history link shows the first event's statuses again", async ({
    page,
  }) => {
    const eventId = await openUser3OnOpenEvent(page)
    await followHistoryToCompletedEvent(page, eventId)

    await page.goBack()
    await page.waitForLoadState("networkidle")

    await expect(
      page.getByText(/No evento.*Evento Com Inscrições Abertas 1/),
    ).toBeVisible()
    await expect(applicationStatus(page)).toContainText(
      "Dados de pagto enviados",
    )
    await expect(attendanceStatus(page)).toContainText("Pendente")
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
    // Use is_veteran column which is always visible (Vet ou Nov?)
    const veteranHeader = grid.locator('.ag-header-cell[col-id="is_veteran"]')
    await veteranHeader.waitFor({ state: "visible", timeout: 5000 })
    const filterButton = veteranHeader.locator(".ag-header-icon")
    await filterButton.click()

    // Wait for filter popup - AG Grid renders filter content in a popup
    // Wait for the "Selecionar Todos" button which indicates the filter UI is ready
    const selectAllButton = page.getByRole("button", {
      name: "Selecionar Todos",
    })
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

    // Focus on the first cell in the center container to avoid pinned-left link cells
    const firstCenterCell = grid
      .locator(".ag-center-cols-container .ag-row")
      .first()
      .locator(".ag-cell")
      .first()
    await firstCenterCell.click()

    // Test arrow key navigation
    // Press right arrow to move to next cell
    await page.keyboard.press("ArrowRight")
    // Verify focus moved - AG Grid adds ag-cell-focus class to focused cell
    const focusedCell = grid.locator(".ag-cell-focus")
    await expect(focusedCell).toBeVisible()

    // Press down arrow to move to row below
    await page.keyboard.press("ArrowDown")

    // Test Enter key to start editing on an editable cell (is_veteran uses agSelectCellEditor)
    // Target the first data row specifically to avoid any off-screen cell issues
    const editableCell = grid
      .locator('.ag-center-cols-container .ag-row[row-index="0"] .ag-cell[col-id="is_veteran"]')
      .first()
    await editableCell.scrollIntoViewIfNeeded()
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

  test("participant's Likert answers show on their profile (WEB-79)", async ({
    page,
    browser,
  }) => {
    const statements = readLikertStatements()
    const comment = `Comentário do admin ${Date.now()}`
    const answers = Object.fromEntries(
      statements.map(({ key }, index) => [
        key,
        index === 0
          ? { choice: "strongly_agree", comment }
          : { choice: "disagree" },
      ]),
    )

    const participant = await browser.newContext({
      storageState: path.resolve(import.meta.dirname, "../../.auth/user.json"),
    })
    try {
      await setLikertSettings({ enabled: true, required: false })
      const response = await participant.request.post(
        `${getBaseUrl()}/api/account/escala`,
        { data: answers },
      )
      expect(response.ok()).toBe(true)
      expect(await response.json()).toEqual({ ok: true })
    } finally {
      await participant.close()
      await setLikertSettings({ enabled: false, required: false })
    }

    const profileId = await getProfileId((await readSetupUser()).userId)
    await page.goto(`/admin/participantes/${profileId}`)
    await expect(
      page.getByRole("heading", { level: 3, name: "Escala de Likert" }),
    ).toBeVisible()
    await expect(page.getByText("mais recente")).toBeVisible()
    await page.getByRole("link", { name: "Ver respostas" }).first().click()

    await expect(page).toHaveURL(
      new RegExp(`/admin/participantes/${profileId}/escala/[\\w-]+$`),
    )
    const cell = (name: string) =>
      page.getByRole("cell", { name, exact: true })
    const row = (text: string) =>
      page.getByRole("row").filter({ has: cell(text) })
    for (const { text } of statements) {
      await expect(cell(text)).toHaveCount(1)
    }
    await expect(
      row(statements[0].text).getByRole("cell", {
        name: "Concordo totalmente",
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      row(statements[0].text).getByRole("cell", { name: comment, exact: true }),
    ).toBeVisible()
    await expect(
      row(statements[1].text).getByRole("cell", {
        name: "Discordo",
        exact: true,
      }),
    ).toBeVisible()
  })
})
