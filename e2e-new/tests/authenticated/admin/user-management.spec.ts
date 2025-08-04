import { test, expect } from '@playwright/test'
import path from 'path'
import { UserManagementPage } from '../../../pages/admin/UserManagementPage'
import { AdminDashboardPage } from '../../../pages/admin/AdminDashboardPage'

test.describe('Admin User Management', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../../.auth/admin.json') })
  
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
  
  test('manage event participants with table operations and detail view', async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    await adminDashboard.verifyAdminAccess()
    
    // Find an event with participants
    // For testing, we'll navigate to the first available event
    const eventRows = await page.locator('.p-datatable-tbody tr').all()
    if (eventRows.length === 0) {
      test.skip(true, 'No events available for testing')
    }
    
    // Click view on the first event
    await page.locator('.p-datatable-tbody tr').first().locator('[title="Ver evento"]').click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    
    // Get the event ID from URL
    const url = page.url()
    const eventId = url.split('/').pop() || ''
    
    // Navigate to user management
    await userManagement.navigate(eventId)
    await userManagement.waitForTableToLoad()
    
    // Check if there are participants
    const participantRows = await userManagement.tableRows.count()
    if (participantRows === 0) {
      test.skip(true, 'No participants in this event for testing')
    }
    
    // Test 1: Edit inline table data
    const firstRow = await userManagement.tableRows.first()
    const participantName = await firstRow.locator('td').nth(1).textContent() || 'Unknown'
    
    // Edit application status
    await userManagement.editSelectCell(firstRow, 'application_status', 'accepted_in_process')
    
    // Edit payment amount
    await userManagement.editNumberCell(firstRow, 'payment', '150')
    
    // Edit has_paid checkbox
    await userManagement.editCheckboxCell(firstRow, 'has_paid', true)
    
    // Verify changes are reflected
    expect(await userManagement.verifyCellContent(firstRow, 'application_status', 'Aceite no processo')).toBeTruthy()
    expect(await userManagement.verifyCellContent(firstRow, 'payment', '150')).toBeTruthy()
    
    // Test 2: WhatsApp button functionality
    await userManagement.clickWhatsAppButton(firstRow)
    
    // Get phone from the row (assuming it's visible in the table)
    const phoneCell = firstRow.locator('button:has(img[alt="Whatsapp"])').first()
    const phoneVisible = await phoneCell.isVisible()
    
    if (phoneVisible) {
      // Verify WhatsApp URL format
      const openedUrl = await userManagement.getLastOpenedUrl()
      expect(openedUrl).toMatch(/^https:\/\/wa\.me\//)
    }
    
    // Test 3: Open participant detail view
    await userManagement.clickViewParticipantButton(firstRow)
    await userManagement.waitForDetailView()
    
    // Verify we're on the detail page
    await expect(page).toHaveURL(new RegExp(`/admin/eventos/${eventId}/participantes/[\\w-]+$`))
    await expect(page.locator('h1')).toContainText(participantName.split(' ')[0])
    
    // Test 4: Edit data in detail view
    await userManagement.editDetailField('flag', 'yellow')
    await userManagement.editDetailField('flag_notes', 'Test note from E2E')
    await userManagement.editDetailField('admin_general_notes', 'General admin notes from E2E test')
    await userManagement.editDetailField('spot_type', 'regular')
    
    // Save changes
    await userManagement.saveDetailViewChanges()
    
    // Test 5: Google Contacts integration
    await userManagement.clickGoogleContactsButton()
    
    const { copiedText, openedUrl } = await userManagement.verifyGoogleContactsIntegration()
    
    // Verify clipboard content was copied
    expect(copiedText).toBeTruthy()
    expect(copiedText).toContain(participantName.split(' ')[0])
    
    // Verify Google Contacts URL was opened
    expect(openedUrl).toBeTruthy()
    expect(openedUrl).toContain('contacts.google.com')
    
    // Test 6: Navigate back to table
    await page.goBack()
    await userManagement.waitForTableToLoad()
    
    // Test 7: Data persistence - refresh page
    await page.reload()
    await userManagement.waitForTableToLoad()
    
    // Find the same participant row
    const updatedRow = await userManagement.findRowByParticipantName(participantName)
    
    // Verify previously edited data persists
    expect(await userManagement.verifyCellContent(updatedRow, 'payment', '150')).toBeTruthy()
    
    // Test 8: Navigate away and back
    await adminDashboard.navigate()
    await userManagement.navigate(eventId)
    await userManagement.waitForTableToLoad()
    
    // Find the participant again
    const finalRow = await userManagement.findRowByParticipantName(participantName)
    
    // Verify data still persists
    expect(await userManagement.verifyCellContent(finalRow, 'payment', '150')).toBeTruthy()
  })
  
  test('edit multiple participants in table', async ({ page }) => {
    // Navigate to admin dashboard
    await adminDashboard.navigate()
    
    // Find an event with multiple participants
    const eventRows = await page.locator('.p-datatable-tbody tr').all()
    if (eventRows.length === 0) {
      test.skip(true, 'No events available for testing')
    }
    
    // Click view on the first event
    await page.locator('.p-datatable-tbody tr').first().locator('[title="Ver evento"]').click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    
    const url = page.url()
    const eventId = url.split('/').pop() || ''
    
    await userManagement.navigate(eventId)
    await userManagement.waitForTableToLoad()
    
    const participantCount = await userManagement.tableRows.count()
    if (participantCount < 2) {
      test.skip(true, 'Need at least 2 participants for this test')
    }
    
    // Edit multiple participants
    const firstRow = await userManagement.tableRows.nth(0)
    const secondRow = await userManagement.tableRows.nth(1)
    
    // Edit first participant
    await userManagement.editSelectCell(firstRow, 'attendance_status', 'present')
    await userManagement.editCheckboxCell(firstRow, 'is_veteran', true)
    
    // Edit second participant
    await userManagement.editSelectCell(secondRow, 'attendance_status', 'absent')
    await userManagement.editSelectCell(secondRow, 'approved_to_attend', 'approved')
    
    // Verify changes
    expect(await userManagement.verifyCellContent(firstRow, 'attendance_status', 'Presente')).toBeTruthy()
    expect(await userManagement.verifyCellContent(secondRow, 'attendance_status', 'Ausente')).toBeTruthy()
    expect(await userManagement.verifyCellContent(secondRow, 'approved_to_attend', 'Aprovade')).toBeTruthy()
  })
})