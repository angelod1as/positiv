import { test, expect } from '@playwright/test'
import { cleanupTestNewsletters } from '../../utils/db-cleanup'

test.describe('Admin Newsletter CRUD Operations', () => {

  test.afterEach(async () => {
    // Clean up test newsletters after each test
    await cleanupTestNewsletters()
  })

  test('admin can create a draft newsletter', async ({ page }) => {
    // Generate unique subject with timestamp
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter - Draft ${timestamp}`
    
    // Navigate to newsletter list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Go to new newsletter page
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in newsletter details
    const subjectInput = page.locator('input[name="subject"]')
    await expect(subjectInput).toBeVisible()
    await subjectInput.fill(subject)
    
    const templateSelect = page.locator('select[name="template_name"]')
    await expect(templateSelect).toBeVisible()
    await templateSelect.selectOption('general-news')
    
    // Add simple MDX content
    const mdxContent = `# Test Newsletter

This is a test newsletter content.

- Item 1
- Item 2
- Item 3`
    
    const contentTextarea = page.locator('textarea[name="content_mdx"]')
    await expect(contentTextarea).toBeVisible()
    await contentTextarea.fill(mdxContent)
    
    // Select all recipients
    const segmentSelect = page.locator('select[name="segment_type"]')
    await expect(segmentSelect).toBeVisible()
    await segmentSelect.selectOption('all')
    
    // Select draft status
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await expect(statusSelect).toBeAttached()
      await expect(statusSelect).toBeEnabled()
      await statusSelect.selectOption('draft')
    }
    
    // Submit the form
    await page.click('button:has-text("Criar Newsletter")')
    
    // Wait for navigation back to newsletter list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Verify the newsletter appears in the list
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await expect(newsletterRow).toBeVisible({ timeout: 10000 })
    
    // Verify status badge shows Draft
    await expect(newsletterRow.locator('text="Rascunho"')).toBeVisible()
  })

  test('admin can view newsletter details', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter - View Details ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Test Content\n\nThis is test content.')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Criar Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the row with the newsletter and click the View button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button[aria-label="Visualizar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the view page
    await expect(page).toHaveURL(/\/admin\/newsletters\/[a-f0-9-]+$/)
    
    // Verify details are displayed - subject is in CardTitle with text-2xl
    await expect(page.locator('.text-2xl').filter({ hasText: subject })).toBeVisible()
    await expect(page.locator('text="Rascunho"')).toBeVisible()
    await expect(page.locator('text="Modelo: Notícias Gerais"')).toBeVisible()
  })

  test('admin can edit newsletter', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const originalSubject = `[E2E-TEST] Newsletter - Original ${timestamp}`
    const updatedSubject = `[E2E-TEST] Newsletter - Updated ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', originalSubject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Original Content')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Criar Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the row with the newsletter and click the Edit button
    const newsletterRow = page.locator('tr').filter({ hasText: originalSubject })
    await newsletterRow.locator('button[aria-label="Editar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Update the subject
    const subjectInput = page.locator('input[name="subject"]')
    await subjectInput.clear()
    await subjectInput.fill(updatedSubject)
    
    // Update the content
    const contentTextarea = page.locator('textarea[name="content_mdx"]')
    await contentTextarea.clear()
    await contentTextarea.fill('# Updated Content\n\nThis content has been updated.')
    
    // Save changes
    await page.click('button:has-text("Atualizar Newsletter"), button:has-text("Atualizar")')
    
    // Wait for redirect to view page
    await page.waitForURL('**/admin/newsletters/*', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the view page and the updated subject is shown
    await expect(page.locator('.text-2xl').filter({ hasText: updatedSubject })).toBeVisible({ timeout: 10000 })
    
    // Navigate back to the list to verify the changes there
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify the updated subject appears in the list
    await expect(page.locator(`text="${updatedSubject}"`).first()).toBeVisible({ timeout: 10000 })
    
    // Verify the original subject is gone
    await expect(page.locator(`text="${originalSubject}"`)).toHaveCount(0)
  })

  test('admin can navigate newsletter pages', async ({ page }) => {
    // Navigate to newsletter list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the list page
    await expect(page).toHaveURL('/admin/newsletters')
    await expect(page.locator('h1').filter({ hasText: 'Newsletters' })).toBeVisible()
    
    // Click new newsletter button - the button text is "Criar Newsletter"
    await page.click('a:has-text("Criar Newsletter")')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the create page
    await expect(page).toHaveURL('/admin/newsletters/new')
    await expect(page.locator('h1').filter({ hasText: 'Criar Newsletter' })).toBeVisible()
    
    // Navigate back to list using direct navigation
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify we're back on the list page
    await expect(page).toHaveURL('/admin/newsletters')
  })

  test('admin can delete draft newsletter from view page', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter - Delete ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Test Content for Deletion')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Criar Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the newsletter row and click View button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button[aria-label="Visualizar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button
    await page.click('button:has-text("Excluir")')
    
    // Wait for dialog to appear and confirm deletion
    await page.waitForSelector('button:has-text("Sim, excluir")', { state: 'visible' })
    await page.click('button:has-text("Sim, excluir")')
    
    // Wait for navigation back to list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Verify the newsletter is no longer in the list
    await expect(page.locator(`text="${subject}"`)).not.toBeVisible()
  })

  test('admin can delete draft newsletter after viewing from edit navigation', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter - Delete from Edit ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Test Content for Deletion')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Criar Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the newsletter row and click Edit button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button[aria-label="Editar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Delete button doesn't exist on edit page, so go to view page first
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Find the newsletter row again and click View button
    const newsletterRowView = page.locator('tr').filter({ hasText: subject })
    await newsletterRowView.locator('button[aria-label="Visualizar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button on view page
    await page.click('button:has-text("Excluir")')
    
    // Wait for dialog to appear and confirm deletion
    await page.waitForSelector('button:has-text("Sim, excluir")', { state: 'visible' })
    await page.click('button:has-text("Sim, excluir")')
    
    // Wait for navigation back to list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Verify the newsletter is no longer in the list
    await expect(page.locator(`text="${subject}"`)).not.toBeVisible()
  })

  test('admin can cancel newsletter deletion', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const subject = `[E2E-TEST] Newsletter - Cancel Delete ${timestamp}`
    
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="subject"]', subject)
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Test Content')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
    }
    
    await page.click('button:has-text("Criar Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the newsletter row and click View button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button[aria-label="Visualizar"]').first().click()
    await page.waitForLoadState('networkidle')
    
    // Click delete button
    await page.click('button:has-text("Excluir")')
    
    // Wait for dialog to appear and cancel deletion
    await page.waitForSelector('button:has-text("Cancelar")', { state: 'visible' })
    await page.click('button:has-text("Cancelar")')
    
    // Verify we're still on the view page
    await expect(page.locator('.text-2xl').filter({ hasText: subject })).toBeVisible()
    
    // Go back to list to verify newsletter still exists
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify the newsletter is still in the list
    await expect(page.locator(`text="${subject}"`).first()).toBeVisible()
  })
})