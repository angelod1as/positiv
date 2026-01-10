import { test, expect } from '@playwright/test'
import path from 'path'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { EventManagementPage } from '../../pages/admin/EventManagementPage'

/**
 * Admin Event Management E2E Tests
 *
 * NOTE: These tests use the AG Grid implementation that replaced PrimeReact DataTable.
 * The table selectors in AdminDashboardPage have been updated for AG Grid.
 *
 * TODO: When the page structure changes or new AG Grid features are added,
 * these tests may need updating. Key selectors to watch:
 * - .ag-row for table rows
 * - .ag-cell for table cells
 * - [role="grid"] for the table container
 * - .ag-paging-button for pagination controls
 *
 * @see POS-346 - AG Grid migration for E2E tests
 */
test.describe('Admin Event Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  // Note: Test events are cleaned up in global teardown to avoid
  // interfering with other tests that may need them

  test('admin can navigate to dashboard and manage events', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)
    const eventManagement = new EventManagementPage(page)

    // Generate unique event name
    const timestamp = Date.now()
    const eventTitle = `[E2E-TEST] Event ${timestamp}`
    const updatedEventTitle = `[E2E-TEST] Updated Event ${timestamp}`

    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await expect(page).toHaveURL('/admin')

    // Verify admin dashboard content
    await adminDashboard.verifyAdminAccess()
    // Wait for AG Grid table to be visible
    await expect(adminDashboard.eventsTable).toBeVisible({ timeout: 10000 })

    // Click create event button
    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL('/admin/eventos/novo')

    // Fill event creation form
    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: '🎉',
      description: 'This is a test event created by E2E tests',
      location: 'Test Location',
      price: '100',
      capacity: '50',
      type: 'regular'
    })

    // Set event start date
    const eventDate = new Date()
    eventDate.setMonth(eventDate.getMonth() + 2) // 2 months from now
    await eventManagement.setEventStartDate(eventDate)

    // Click auto-calculate dates button
    await eventManagement.clickCalculateDates()

    // Verify all date fields are filled
    const allDatesFilled = await eventManagement.verifyAllDatesAreFilled()
    expect(allDatesFilled).toBeTruthy()

    // Save the event
    await eventManagement.saveEvent()

    // Should redirect to view event page
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)

    // Verify we're on the view event page with the created event
    await expect(eventManagement.eventHeading).toContainText(eventTitle)

    // Go back to dashboard
    await adminDashboard.navigate()

    // Wait for AG Grid table to load and wait for the new event to appear
    await adminDashboard.eventsTable.waitFor({ state: 'visible' })
    await adminDashboard.waitForEventInList(eventTitle)

    // Click to view the event (AG Grid row click)
    await adminDashboard.clickViewEvent(eventTitle)

    // Wait for event view page to load
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)
    await expect(eventManagement.eventHeading).toContainText(eventTitle)

    // Edit the event
    await eventManagement.clickEdit()
    await expect(page).toHaveURL(/\/admin\/eventos\/novo\/[\w-]+$/)

    // Change some fields
    await eventManagement.updateTitle(updatedEventTitle)
    await eventManagement.updatePrice('150')

    // Save changes
    await eventManagement.saveEvent()

    // Verify update success - check we're back on view page with updated title
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)
    await expect(eventManagement.eventHeading).toContainText(updatedEventTitle)

    // Test status transitions
    await eventManagement.changeStatus('Scheduled')
    await eventManagement.changeStatus('Registration Open')
    await eventManagement.changeStatus('Registration Closed')
    await eventManagement.changeStatus('Completed')

    // Verify final status
    const finalStatus = await eventManagement.getCurrentStatus()
    expect(finalStatus).toBe('Completed')
  })

  test('validates required fields when creating event', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)

    await page.goto('/admin/eventos/novo')

    // Try to save without filling required fields
    await eventManagement.clickSaveButton()

    // Should show validation errors - looking for minimum characters error
    await expect(page.getByText('No mínimo 2 caracteres').first()).toBeVisible()
    await expect(page.getByText('precisa ser um emoji')).toBeVisible()
  })

  /**
   * Test AG Grid specific functionality on the admin dashboard.
   *
   * TODO: This test verifies basic AG Grid table loading. When more AG Grid
   * features are integrated (like column filtering, sorting persistence),
   * add tests for those features here.
   */
  test('admin dashboard displays AG Grid table with events', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)

    // Navigate to admin dashboard
    await adminDashboard.navigate()

    // Verify the AG Grid table is present and loaded
    await expect(adminDashboard.eventsTable).toBeVisible({ timeout: 10000 })

    // AG Grid should have the grid role
    await expect(page.locator('[role="grid"]').first()).toBeVisible()

    // Check that AG Grid specific elements are rendered
    // This verifies the migration from PrimeReact to AG Grid is complete
    await expect(page.locator('.ag-root-wrapper').first()).toBeVisible()
  })
})
