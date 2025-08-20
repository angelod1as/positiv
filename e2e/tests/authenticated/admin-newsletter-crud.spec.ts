import { test, expect } from '@playwright/test'
import { NewsletterListPage } from '../../pages/admin/NewsletterListPage'
import { NewsletterCreatePage } from '../../pages/admin/NewsletterCreatePage'
import { NewsletterViewPage } from '../../pages/admin/NewsletterViewPage'
import { NewsletterEditPage } from '../../pages/admin/NewsletterEditPage'
import { cleanupTestNewsletters } from '../../utils/db-cleanup'

test.describe('Admin Newsletter CRUD Operations', () => {
  let _listPage: NewsletterListPage
  let _createPage: NewsletterCreatePage
  let _viewPage: NewsletterViewPage
  let _editPage: NewsletterEditPage

  test.beforeEach(async ({ page }) => {
    _listPage = new NewsletterListPage(page)
    _createPage = new NewsletterCreatePage(page)
    _viewPage = new NewsletterViewPage(page)
    _editPage = new NewsletterEditPage(page)
  })

  test.afterEach(async () => {
    // Clean up test newsletters after each test
    await cleanupTestNewsletters()
  })

  test('admin can create a draft newsletter', async ({ page }) => {
    // Generate unique subject with timestamp
    const timestamp = Date.now()
    const subject = `Test Newsletter - Draft ${timestamp}`
    
    // Navigate to newsletter list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Go to new newsletter page
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in newsletter details
    const subjectInput = page.locator('input[name="subject"]')
    await subjectInput.fill(subject)
    await page.waitForTimeout(100)
    
    const templateSelect = page.locator('select[name="template_name"]')
    await templateSelect.selectOption('general-news')
    await page.waitForTimeout(100)
    
    // Add simple MDX content
    const mdxContent = `# Test Newsletter

This is a test newsletter content.

- Item 1
- Item 2
- Item 3`
    
    const contentTextarea = page.locator('textarea[name="content_mdx"]')
    await contentTextarea.fill(mdxContent)
    await page.waitForTimeout(100)
    
    // Select all recipients
    const segmentSelect = page.locator('select[name="segment_type"]')
    await segmentSelect.selectOption('all')
    await page.waitForTimeout(100)
    
    // Select draft status
    const statusSelect = page.locator('select[name="status"]')
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('draft')
      await page.waitForTimeout(100)
    }
    
    // Submit the form
    await page.click('button:has-text("Create Newsletter")')
    
    // Wait for navigation back to newsletter list
    await page.waitForURL('**/admin/newsletters', { timeout: 10000 })
    
    // Verify the newsletter appears in the list
    const newsletterCard = page.locator(`text="${subject}"`).first()
    await expect(newsletterCard).toBeVisible({ timeout: 10000 })
    
    // Verify status badge
    const statusBadge = page.locator('.bg-yellow-100').filter({ hasText: 'Draft' }).first()
    await expect(statusBadge).toBeVisible()
  })

  test('admin can view newsletter details', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const subject = `Test Newsletter - View Details ${timestamp}`
    
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
    
    // Click on the newsletter to view details
    await page.click(`text="${subject}"`)
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the view page
    await expect(page).toHaveURL(/\/admin\/newsletters\/[a-f0-9-]+$/)
    
    // Verify details are displayed
    await expect(page.locator('h1').filter({ hasText: subject })).toBeVisible()
    await expect(page.locator('text="Draft"')).toBeVisible()
    await expect(page.locator('text="general-news"')).toBeVisible()
  })

  test('admin can edit newsletter', async ({ page }) => {
    // First create a newsletter
    const timestamp = Date.now()
    const originalSubject = `Test Newsletter - Original ${timestamp}`
    const updatedSubject = `Test Newsletter - Updated ${timestamp}`
    
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
    
    // Click on the newsletter to view it
    await page.click(`text="${originalSubject}"`)
    await page.waitForLoadState('networkidle')
    
    // Click edit button
    await page.click('a:has-text("Edit")')
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
    await page.waitForTimeout(1000)
    
    // Go back to list if not already there
    if (!page.url().endsWith('/admin/newsletters')) {
      await page.goto('/admin/newsletters')
      await page.waitForLoadState('networkidle')
    }
    
    // Verify the updated subject appears
    await expect(page.locator(`text="${updatedSubject}"`).first()).toBeVisible({ timeout: 10000 })
    
    // Verify the original subject is gone
    await expect(page.locator(`text="${originalSubject}"`)).not.toBeVisible()
  })

  test('admin can navigate newsletter pages', async ({ page }) => {
    // Navigate to newsletter list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the list page
    await expect(page).toHaveURL('/admin/newsletters')
    await expect(page.locator('h1').filter({ hasText: 'Newsletters' })).toBeVisible()
    
    // Click new newsletter button
    await page.click('a:has-text("New Newsletter")')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the create page
    await expect(page).toHaveURL('/admin/newsletters/new')
    await expect(page.locator('h1').filter({ hasText: 'Create Newsletter' })).toBeVisible()
    
    // Go back to list
    await page.click('a:has-text("Cancel")')
    await page.waitForLoadState('networkidle')
    
    // Verify we're back on the list page
    await expect(page).toHaveURL('/admin/newsletters')
  })
})