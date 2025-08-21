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
    await page.click('button:has-text("Create Newsletter")')
    
    // Wait for navigation back to newsletter list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Verify the newsletter appears in the list
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await expect(newsletterRow).toBeVisible({ timeout: 10000 })
    
    // Verify status badge shows Draft
    await expect(newsletterRow.locator('text="Draft"')).toBeVisible()
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
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the row with the newsletter and click the View button
    const newsletterRow = page.locator('tr').filter({ hasText: subject })
    await newsletterRow.locator('button:has-text("View")').click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the view page
    await expect(page).toHaveURL(/\/admin\/newsletters\/[a-f0-9-]+$/)
    
    // Verify details are displayed - subject is in CardTitle with text-2xl
    await expect(page.locator('.text-2xl').filter({ hasText: subject })).toBeVisible()
    await expect(page.locator('text="Draft"')).toBeVisible()
    await expect(page.locator('text="Template: General News"')).toBeVisible()
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
    
    await page.click('button:has-text("Create Newsletter")')
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Find the row with the newsletter and click the Edit button
    const newsletterRow = page.locator('tr').filter({ hasText: originalSubject })
    await newsletterRow.locator('button:has-text("Edit")').click()
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
    await page.click('button:has-text("Update Newsletter")')
    
    // Wait for navigation back to newsletter list or view
    await page.waitForLoadState('networkidle')
    
    // Go back to list if not already there
    if (!page.url().endsWith('/admin/newsletters')) {
      await page.goto('/admin/newsletters')
      await page.waitForLoadState('networkidle')
    }
    
    // Verify the updated subject appears
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
    
    // Click new newsletter button - the button text is "Create Newsletter"
    await page.click('a:has-text("Create Newsletter")')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the create page
    await expect(page).toHaveURL('/admin/newsletters/new')
    await expect(page.locator('h1').filter({ hasText: 'Create Newsletter' })).toBeVisible()
    
    // Navigate back to list using direct navigation
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify we're back on the list page
    await expect(page).toHaveURL('/admin/newsletters')
  })
})