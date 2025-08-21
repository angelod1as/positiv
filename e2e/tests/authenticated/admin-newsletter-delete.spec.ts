import { test, expect } from '@playwright/test'
import { cleanupTestNewsletters } from '../../utils/db-cleanup'

test.describe('Admin Newsletter Delete Operations', () => {
  
  test.afterEach(async () => {
    await cleanupTestNewsletters()
  })

  test('admin can delete a draft newsletter from edit page', async ({ page }) => {
    // Create a draft newsletter first
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter to Delete - Edit ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Delete Test\n\nThis newsletter will be deleted.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Navigate to edit page
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button:has-text("Edit")').click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete Newsletter")')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    
    // Confirm deletion in dialog
    const confirmButton = page.locator('button:has-text("Delete")').last()
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
    
    // Should redirect to newsletter list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Newsletter should no longer exist in the list
    await expect(page.locator(`text="${subject}"`)).toHaveCount(0)
  })

  test('admin can delete a draft newsletter from list page', async ({ page }) => {
    // Create a draft newsletter first
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter to Delete - List ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Delete Test\n\nThis newsletter will be deleted from list.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the newsletter row and click delete button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    const deleteButton = newsletterRow.locator('button[aria-label="Delete"]')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    
    // Confirm deletion in dialog
    const confirmButton = page.locator('button:has-text("Delete")').last()
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
    
    // Wait for deletion to complete
    await page.waitForTimeout(1000)
    
    // Newsletter should no longer exist in the list
    await expect(page.locator(`text="${subject}"`)).toHaveCount(0)
  })

  test('admin can delete a draft newsletter from view page', async ({ page }) => {
    // Create a draft newsletter first
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter to Delete - View ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Delete Test\n\nThis newsletter will be deleted from view page.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Navigate to view page
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button:has-text("View")').click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete Newsletter")')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    
    // Confirm deletion in dialog
    const confirmButton = page.locator('button:has-text("Delete")').last()
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
    
    // Should redirect to newsletter list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Newsletter should no longer exist in the list
    await expect(page.locator(`text="${subject}"`)).toHaveCount(0)
  })

  test('admin cannot delete a sent newsletter', async ({ page }) => {
    // For this test, we'd need to mock a sent newsletter
    // Since we can't easily create a sent newsletter in E2E tests,
    // we'll test that the delete button is not shown for sent newsletters
    
    // First, create and send a newsletter (using the send-now functionality)
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Sent Newsletter - No Delete ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Sent Newsletter\n\nThis newsletter cannot be deleted.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the newsletter and go to edit page to send it
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button:has-text("Edit")').click()
    await page.waitForLoadState('networkidle')
    
    // Send the newsletter using the dialog
    page.on('dialog', async dialog => {
      await dialog.accept()
    })
    
    await page.click('button:has-text("Send Now")')
    
    // Wait for redirect to view page
    await page.waitForURL('**/admin/newsletters/*', { timeout: 10000 })
    
    // On the view page, delete button should not be visible
    const deleteButton = page.locator('button:has-text("Delete Newsletter")')
    await expect(deleteButton).toHaveCount(0)
    
    // Navigate back to list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // In the list, the sent newsletter should not have a delete button
    const sentNewsletterRow = page.locator('tr').filter({ hasText: subject })
    const deleteButtonInList = sentNewsletterRow.locator('button[aria-label="Delete"]')
    await expect(deleteButtonInList).toHaveCount(0)
  })

  test('confirmation dialog can be cancelled', async ({ page }) => {
    // Create a draft newsletter
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter Cancel Delete ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Cancel Delete Test\n\nThis deletion will be cancelled.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Navigate to edit page
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button:has-text("Edit")').click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete Newsletter")')
    await deleteButton.click()
    
    // Cancel deletion in dialog
    const cancelButton = page.locator('button:has-text("Cancel")').last()
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()
    
    // Should remain on edit page
    await expect(page).toHaveURL(/\/admin\/newsletters\/.*\/edit/)
    
    // Newsletter should still exist
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`text="${subject}"`).first()).toBeVisible()
  })
})