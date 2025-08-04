import { test, expect } from '@playwright/test'
import path from 'path'
import { UserManagementPage } from '../../pages/admin/UserManagementPage'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { EventManagementPage } from '../../pages/admin/EventManagementPage'

test.describe('Admin User Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })
  
  let userManagement: UserManagementPage
  let adminDashboard: AdminDashboardPage
  
  test.beforeEach(async ({ page }) => {
    userManagement = new UserManagementPage(page)
    adminDashboard = new AdminDashboardPage(page)
  })
  
  test.afterEach(async ({ page }) => {
    // Cleanup window.open override
    await userManagement.cleanup()
  })
  
  test('verify user management page loads correctly', async ({ page }) => {
    const eventManagement = new EventManagementPage(page)
    
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()
    
    // Create a test event first to ensure we have data
    const timestamp = Date.now()
    const eventTitle = `Test Event for User Management ${timestamp}`
    
    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL('/admin/eventos/novo')
    
    // Fill event creation form
    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: '🎭',
      description: 'Test event for user management E2E tests',
      location: 'Test Location',
      price: '100',
      capacity: '50',
      type: 'regular'
    })
    
    // Set event start date
    const eventDate = new Date()
    eventDate.setMonth(eventDate.getMonth() + 1) // 1 month from now
    await eventManagement.setEventStartDate(eventDate)
    
    // Click auto-calculate dates button
    await eventManagement.clickCalculateDates()
    
    // Save the event
    await eventManagement.saveEvent()
    
    // Should redirect to view event page
    await expect(page).toHaveURL(/\/admin\/eventos\/[\w-]+$/)
    
    // Get the event ID from URL
    const url = page.url()
    const eventId = url.split('/').pop() || ''
    
    // Navigate to user management page
    await userManagement.navigate(eventId)
    await expect(page).toHaveURL(`/admin/eventos/${eventId}`)
    
    // Verify the participants table is visible
    await expect(userManagement.participantsTable).toBeVisible()
    
    // Verify table headers are present
    await expect(page.getByText('Inscrições')).toBeVisible()
    
    // Since we just created the event, there should be no participants
    const participantCount = await userManagement.tableRows.count()
    expect(participantCount).toBe(0)
    
    // Verify the empty state is shown properly
    await expect(page.getByText('0 inscrites')).toBeVisible()
  })
  
  test('test user management with existing event data', async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()
    
    // Look for existing events with participants
    await adminDashboard.eventsTable.waitFor({ state: 'visible' })
    
    // Find events that might have participants (completed or ongoing)
    const eventRows = await page.locator('.p-datatable-tbody tr').all()
    
    let foundEventWithParticipants = false
    let eventId = ''
    
    // Try to find an event with participants
    for (const row of eventRows) {
      const status = await row.locator('td').nth(3).textContent() // Assuming status is in 4th column
      
      // Look for events that are likely to have participants
      if (status && (status.includes('Completed') || status.includes('Registration'))) {
        await row.getByRole('link', { name: 'Ver evento' }).click()
        await page.waitForNavigation({ waitUntil: 'networkidle' })
        
        eventId = page.url().split('/').pop() || ''
        
        // Check if this event has participants
        const participantRows = await userManagement.tableRows.count()
        if (participantRows > 0) {
          foundEventWithParticipants = true
          break
        }
        
        // Go back to admin dashboard if no participants
        await adminDashboard.navigate()
      }
    }
    
    if (!foundEventWithParticipants) {
      test.skip(true, 'No events with participants found for testing')
    }
    
    // Now we have an event with participants, let's test
    const firstRow = await userManagement.tableRows.first()
    const participantName = await firstRow.locator('td').nth(1).textContent() || 'Unknown'
    
    // Test WhatsApp button functionality
    const phoneCell = firstRow.locator('button:has(img[alt="Whatsapp"])').first()
    const hasWhatsApp = await phoneCell.isVisible()
    
    if (hasWhatsApp) {
      await userManagement.clickWhatsAppButton(firstRow)
      const openedUrl = await userManagement.getLastOpenedUrl()
      expect(openedUrl).toMatch(/^https:\/\/wa\.me\//)
    }
    
    // Test opening participant detail view
    await userManagement.clickViewParticipantButton(firstRow)
    await userManagement.waitForDetailView()
    
    // Verify we're on the detail page
    await expect(page).toHaveURL(new RegExp(`/admin/eventos/${eventId}/participantes/[\\w-]+$`))
    await expect(page.locator('h1')).toContainText(participantName.split(' ')[0])
    
    // Test Google Contacts integration
    const googleContactsVisible = await userManagement.googleContactsButton.isVisible()
    
    if (googleContactsVisible) {
      await userManagement.clickGoogleContactsButton()
      
      const { copiedText, openedUrl } = await userManagement.verifyGoogleContactsIntegration()
      
      // Verify clipboard content was copied
      expect(copiedText).toBeTruthy()
      expect(copiedText).toContain(participantName.split(' ')[0])
      
      // Verify Google Contacts URL was opened
      expect(openedUrl).toBeTruthy()
      expect(openedUrl).toContain('contacts.google.com')
    }
  })
})