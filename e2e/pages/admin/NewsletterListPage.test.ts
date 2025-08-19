import { test, expect, type Page } from '@playwright/test'
import { NewsletterListPage } from './NewsletterListPage'

test.describe('NewsletterListPage', () => {
  test('should have all required page methods', () => {
    // Type check to ensure required methods exist
    const pageStub = {} as unknown as Page
    const newsletterListPage = new NewsletterListPage(pageStub)
    
    expect(typeof newsletterListPage.navigate).toBe('function')
    expect(typeof newsletterListPage.clickCreateNewsletter).toBe('function')
    expect(typeof newsletterListPage.getNewsletterRow).toBe('function')
    expect(typeof newsletterListPage.clickViewNewsletter).toBe('function')
    expect(typeof newsletterListPage.clickEditNewsletter).toBe('function')
    expect(typeof newsletterListPage.getNewsletterCount).toBe('function')
    expect(typeof newsletterListPage.waitForNewslettersToLoad).toBe('function')
    expect(typeof newsletterListPage.searchNewsletters).toBe('function')
    expect(typeof newsletterListPage.filterByStatus).toBe('function')
  })

  test('should have correct selectors', () => {
    const pageStub = {} as unknown as Page
    const newsletterListPage = new NewsletterListPage(pageStub)
    
    // Access protected properties through type assertion for testing
    const page = newsletterListPage as unknown as Record<string, string>
    
    expect(page.createButton).toBe('a:has-text("Create Newsletter")')
    expect(page.newsletterTable).toBe('table')
    expect(page.searchInput).toBe('input[placeholder*="Search"]')
    expect(page.statusFilter).toBe('select[name="status"]')
    expect(page.loadingIndicator).toBe('[data-loading="true"]')
  })
})