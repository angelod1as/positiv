import { test, expect } from '@playwright/test'
import path from 'path'
import { UserManagementPage } from '../../pages/admin/UserManagementPage'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { EventManagementPage } from '../../pages/admin/EventManagementPage'
import { createTestEventWithParticipants, cleanupTestParticipants, type TestParticipant } from '../../utils/event-helpers'

test.describe('Admin User Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })
  
  let userManagement: UserManagementPage
  let adminDashboard: AdminDashboardPage
  let eventManagement: EventManagementPage
  let testParticipants: TestParticipant[] = []
  let testEventId: string = ''
  let testEventIdDetail: string = ''
  
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
  })
  
  test('table inline editing operations', async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()
    
    // Create a test event with participants
    const timestamp = Date.now()
    const eventTitle = `Test Event ${timestamp}`
    
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
    testEventId = url.split('/').pop() || ''
    expect(testEventId).not.toBe('novo')
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
    const firstRow = await userManagement.findRowByParticipantName(firstParticipant.socialName)
    
    // Edit application status
    await userManagement.editSelectCell(firstRow, 'application_status', 'sent_rules')
    await page.waitForTimeout(1000) // Allow for save
    
    // Verify the change persisted (check for translated value)
    const hasStatus = await userManagement.verifyCellContent(firstRow, 'application_status', 'Regras enviadas')
    expect(hasStatus).toBe(true)
    
    // Test 2: Inline editing - Checkbox cell (has_paid)
    const secondParticipant = testParticipants[1]
    const secondRow = await userManagement.findRowByParticipantName(secondParticipant.socialName)
    
    await userManagement.editCheckboxCell(secondRow, 'has_paid', true)
    await page.waitForTimeout(1000)
    
    // Test 3: Inline editing - Select cell (attendance_status)
    await userManagement.editSelectCell(secondRow, 'attendance_status', 'attended')
    await page.waitForTimeout(1000)
    
    // Test 4: Inline editing - Number cell (payment) on first row which already has has_paid=true
    const firstRowPaymentCell = firstRow.locator(`td:has([name="payment"])`).first()
    await firstRowPaymentCell.click()
    
    const firstRowPaymentInput = firstRowPaymentCell.locator('input[type="number"]').first()
    await firstRowPaymentInput.waitFor({ state: 'visible' })
    await firstRowPaymentInput.clear()
    await firstRowPaymentInput.fill('150')
    
    // Click outside to save
    await page.locator('h1').first().click()
    await page.waitForTimeout(2000)
    
    // Test 5: Data persistence - Refresh page
    await page.reload()
    await userManagement.waitForTableToLoad()
    
    // Find rows again and verify data persisted
    const refreshedFirstRow = await userManagement.findRowByParticipantName(firstParticipant.socialName)
    const refreshedSecondRow = await userManagement.findRowByParticipantName(secondParticipant.socialName)
    
    // Verify first participant changes persisted
    const firstStatusPersisted = await userManagement.verifyCellContent(refreshedFirstRow, 'application_status', 'Regras enviadas')
    expect(firstStatusPersisted).toBe(true)
    
    // Verify first participant payment value was updated
    const refreshedPaymentInput = refreshedFirstRow.locator('input[name="payment"]').first()
    const paymentValue = await refreshedPaymentInput.inputValue()
    expect(paymentValue).toBe('150.00')
    
    // Verify second participant changes persisted
    const secondStatusPersisted = await userManagement.verifyCellContent(refreshedSecondRow, 'attendance_status', 'Compareceu')
    expect(secondStatusPersisted).toBe(true)
  })
  
  test('detail view and external integrations', async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()
    
    // Create a new test event for detail view testing
    const timestamp = Date.now()
    const eventTitle = `Test Event Detail View ${timestamp}`
    
    await adminDashboard.clickCreateEvent()
    await expect(page).toHaveURL('/admin/eventos/novo')
    
    // Fill event creation form
    await eventManagement.fillBasicEventInfo({
      title: eventTitle,
      emoji: '🎯',
      description: 'Test event for detail view E2E tests',
      location: 'Test Location',
      price: '50',
      capacity: '30',
      type: 'regular'
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
    testEventIdDetail = url.split('/').pop() || ''
    expect(testEventIdDetail).not.toBe('novo')
    expect(testEventIdDetail).toMatch(/^[\w-]+$/)
    
    // Create test participants with minimal data for speed
    testParticipants = await createTestEventWithParticipants(testEventIdDetail, 2)
    
    // Navigate back to the event page to see participants
    await userManagement.navigate(testEventIdDetail)
    await userManagement.waitForTableToLoad()
    
    // Get the first participant row
    const firstRow = await userManagement.tableRows.first()
    const participantName = await firstRow.locator('td').nth(1).textContent() || 'Unknown'
    
    // Test WhatsApp button if available
    const whatsappButton = firstRow.locator('button:has(img[alt="Whatsapp"])').first()
    const hasWhatsApp = await whatsappButton.count() > 0
    
    if (hasWhatsApp) {
      await userManagement.clickWhatsAppButton(firstRow)
      const openedUrl = await userManagement.getLastOpenedUrl()
      expect(openedUrl).toMatch(/^https:\/\/wa\.me\//)
    }
    
    // Test detail view
    await userManagement.clickViewParticipantButton(firstRow)
    await userManagement.waitForDetailView()
    
    // Verify we're on the detail page
    await expect(page).toHaveURL(new RegExp(`/admin/eventos/${testEventIdDetail}/participantes/[\\w-]+$`))
    await expect(page.locator('h1')).toContainText(participantName.split(' ')[0])
    
    // Edit a field in detail view
    await userManagement.editDetailField('application_status', 'finalised')
    
    // Save changes
    await userManagement.saveDetailViewChanges()
    
    // Test Google Contacts integration if visible
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
    
    // Navigate back to table
    await userManagement.navigate(testEventIdDetail)
    await userManagement.waitForTableToLoad()
    
    // Verify detail view change reflected in table
    const updatedRow = await userManagement.findRowByParticipantName(participantName.split(' ')[0])
    const statusUpdated = await userManagement.verifyCellContent(updatedRow, 'application_status', 'Finalizado')
    expect(statusUpdated).toBe(true)
  })
})