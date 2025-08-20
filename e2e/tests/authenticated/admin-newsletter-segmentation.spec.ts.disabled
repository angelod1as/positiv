import { test, expect } from '@playwright/test'
import { NewsletterListPage } from '../../pages/admin/NewsletterListPage'
import { NewsletterCreatePage } from '../../pages/admin/NewsletterCreatePage'
import { MailhogHelper } from '../../helpers/mailhog'

test.describe('Newsletter Segmentation - Phase 1 Basic Filters', () => {
  let listPage: NewsletterListPage
  let createPage: NewsletterCreatePage
  let mailhog: MailhogHelper

  test.beforeEach(async ({ page }) => {
    listPage = new NewsletterListPage(page)
    createPage = new NewsletterCreatePage(page)
    mailhog = new MailhogHelper()
    await mailhog.clearAllMessages()
  })

  test('can send to veterans only', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Veterans Only Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Newsletter for Veterans\n\nExclusive content for our veteran members.')
    
    // Select basic segmentation
    await createPage.selectSegmentation('basic')
    await createPage.toggleVeteransOnly()
    
    // Check recipient count is less than total
    const veteranCount = await createPage.getRecipientCount()
    expect(veteranCount).toBeGreaterThan(0)
    
    // Save as draft to verify segmentation
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    // Verify segmentation info is displayed
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Veterans only')
  })

  test('can send to newbies only', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Newbies Welcome Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Welcome New Members!')
    
    await createPage.selectSegmentation('basic')
    await createPage.toggleNewbiesOnly()
    
    const newbieCount = await createPage.getRecipientCount()
    expect(newbieCount).toBeGreaterThan(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Newbies only')
  })

  test('can filter by never attended events', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Never Attended - Invitation')
    await createPage.selectTemplate('event-announcement')
    await createPage.fillMDXContent('# Your First Event Awaits!')
    
    await createPage.selectSegmentation('basic')
    await createPage.selectActivityType('never_attended')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThan(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Never attended')
  })

  test('can filter by has attended events', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Thank You for Attending')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Thanks for being part of our community!')
    
    await createPage.selectSegmentation('basic')
    await createPage.selectActivityType('has_attended')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThan(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Has attended')
  })

  test('can filter by new registrations', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Welcome Recent Signups')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Welcome to Positiv!')
    
    await createPage.selectSegmentation('basic')
    await createPage.selectActivityType('never_applied')
    
    // Set registered within days
    await page.fill('input[name="registeredWithinDays"]', '30')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0) // Might be 0 if no recent signups
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('New registrations')
  })

  test('can filter by applied but never attended', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('We Miss You!')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Come Join Us!')
    
    await createPage.selectSegmentation('basic')
    await createPage.selectActivityType('applied_never_attended')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Applied but never attended')
  })

  test('excludes rejected participants by default', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Default Exclusion Test')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Test')
    
    await createPage.selectSegmentation('all')
    
    const countWithExclusion = await createPage.getRecipientCount()
    
    // Toggle to include rejected
    await page.click('input[name="excludeRejected"]')
    
    const countWithoutExclusion = await createPage.getRecipientCount()
    
    // Count without exclusion should be greater or equal
    expect(countWithoutExclusion).toBeGreaterThanOrEqual(countWithExclusion)
  })
})

test.describe('Newsletter Segmentation - Phase 2 Advanced Filters', () => {
  let listPage: NewsletterListPage
  let createPage: NewsletterCreatePage
  let mailhog: MailhogHelper

  test.beforeEach(async ({ page }) => {
    listPage = new NewsletterListPage(page)
    createPage = new NewsletterCreatePage(page)
    mailhog = new MailhogHelper()
    await mailhog.clearAllMessages()
  })

  test('can filter by inactive users (>90 days)', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Re-engagement Campaign')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# We Miss You!')
    
    await createPage.selectSegmentation('advanced')
    await createPage.selectActivityStatus('inactive')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Inactive users')
  })

  test('can filter by recent attendees (last 30 days)', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Thank You Recent Attendees')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Thanks for joining us recently!')
    
    await createPage.selectSegmentation('advanced')
    await createPage.selectActivityStatus('recent')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Recent attendees')
  })

  test('can filter by lapsed users (30-90 days)', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Come Back Soon!')
    await createPage.selectTemplate('event-announcement')
    await createPage.fillMDXContent('# New Events Waiting for You!')
    
    await createPage.selectSegmentation('advanced')
    await createPage.selectActivityStatus('lapsed')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Lapsed users')
  })

  test('can filter by event attendance count', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('VIP Members - 5+ Events')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Thank you for your loyalty!')
    
    await createPage.selectSegmentation('advanced')
    await createPage.setEventAttendanceCount(5, undefined) // Min 5, no max
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Attended 5+ events')
  })

  test('can filter by custom date range', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Custom Date Range Test')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Special Newsletter')
    
    await createPage.selectSegmentation('advanced')
    
    // Set custom date range
    const fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - 3)
    const toDate = new Date()
    
    await page.fill('input[name="lastAttendanceFrom"]', fromDate.toISOString().slice(0, 10))
    await page.fill('input[name="lastAttendanceTo"]', toDate.toISOString().slice(0, 10))
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Custom date range')
  })

  test('can filter by specific inactivity period', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('60 Days Inactive')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Time to come back!')
    
    await createPage.selectSegmentation('advanced')
    await page.fill('input[name="inactivityPeriodDays"]', '60')
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Inactive for 60 days')
  })

  test('can combine multiple filters', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Complex Segmentation')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Targeted Message')
    
    await createPage.selectSegmentation('advanced')
    
    // Combine multiple filters
    await createPage.toggleVeteransOnly()
    await createPage.selectActivityStatus('recent')
    await createPage.setEventAttendanceCount(3, 10) // Between 3 and 10 events
    
    const count = await createPage.getRecipientCount()
    expect(count).toBeGreaterThanOrEqual(0)
    
    await createPage.saveAsDraft()
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    const segmentInfo = await page.textContent('[data-testid="segment-info"]')
    expect(segmentInfo).toContain('Veterans')
    expect(segmentInfo).toContain('Recent')
    expect(segmentInfo).toContain('3-10 events')
  })
})