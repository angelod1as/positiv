import { test, expect } from '@playwright/test'
import path from 'path'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { EventManagementPage } from '../../pages/admin/EventManagementPage'

test.describe('Admin Event Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('admin can navigate to dashboard and manage events', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)
    const eventManagement = new EventManagementPage(page)
    
    // Generate unique event name
    const timestamp = Date.now()
    const eventTitle = `Test Event E2E ${timestamp}`
    const updatedEventTitle = `Updated Test Event E2E ${timestamp}`
    
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await expect(page).toHaveURL('/admin')
    
    // Verify admin dashboard content
    await adminDashboard.verifyAdminAccess()
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
    
    // Wait for table to load and verify new event appears in the list
    await adminDashboard.eventsTable.waitFor({ state: 'visible' })
    const eventVisible = await adminDashboard.isEventInList(eventTitle)
    expect(eventVisible).toBeTruthy()
    
    // Click to view the event
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
    await eventManagement.saveEvent()
    
    // Should show validation errors - looking for minimum characters error
    await expect(page.getByText('No mínimo 2 caracteres').first()).toBeVisible()
    await expect(page.getByText('precisa ser um emoji')).toBeVisible()
  })
})