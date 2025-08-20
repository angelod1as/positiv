import { test, expect } from '@playwright/test'

test.describe('Simple Newsletter Test', () => {
  test('can navigate and create newsletter', async ({ page }) => {
    // Go to newsletter list
    await page.goto('/admin/newsletters')
    await page.waitForLoadState('networkidle')
    
    // Go to new newsletter page directly
    await page.goto('/admin/newsletters/new')
    await page.waitForLoadState('networkidle')
    
    // Fill the form
    await page.fill('input[name="subject"]', 'Test Newsletter')
    await page.selectOption('select[name="template_name"]', 'general-news')
    await page.fill('textarea[name="content_mdx"]', '# Test Content')
    await page.selectOption('select[name="segment_type"]', 'all')
    
    // Submit the form
    await page.click('button:has-text("Create Newsletter")')
    
    // Wait for redirect
    await page.waitForURL(/\/admin\/newsletters/, { timeout: 10000 })
    
    // Verify we're redirected
    expect(page.url()).toContain('/admin/newsletters')
  })
})