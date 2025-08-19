import { test, expect } from '@playwright/test'
import { NewsletterListPage } from '../../pages/admin/NewsletterListPage'
import { NewsletterCreatePage } from '../../pages/admin/NewsletterCreatePage'
import { NewsletterViewPage } from '../../pages/admin/NewsletterViewPage'
import { NewsletterEditPage } from '../../pages/admin/NewsletterEditPage'
import { MailhogHelper } from '../../helpers/mailhog'

test.describe('Admin Newsletter Management', () => {
  let listPage: NewsletterListPage
  let createPage: NewsletterCreatePage
  let viewPage: NewsletterViewPage
  let editPage: NewsletterEditPage
  let mailhog: MailhogHelper

  test.beforeEach(async ({ page }) => {
    listPage = new NewsletterListPage(page)
    createPage = new NewsletterCreatePage(page)
    viewPage = new NewsletterViewPage(page)
    editPage = new NewsletterEditPage(page)
    mailhog = new MailhogHelper()
    
    // Clear Mailhog messages before each test
    await mailhog.clearAllMessages()
  })

  test('admin can create and send newsletter immediately', async ({ page }) => {
    // Navigate to newsletter list
    await listPage.navigate()
    
    // Click create button
    await listPage.clickCreateNewsletter()
    
    // Fill in newsletter details
    await createPage.fillSubject('Test Newsletter - Immediate Send')
    await createPage.selectTemplate('general-news')
    
    // Add MDX content
    const mdxContent = `# Welcome to our Newsletter!

This is a test newsletter with **bold text** and *italic text*.

<EventCard 
  title="Summer Party"
  date="2025-02-15"
  location="Beach Club"
  spots={50}
/>

## Important Updates

- New feature launched
- Community event coming up
- Registration open for workshops

<Button href="https://positiv.com/events">
  View All Events
</Button>

---

Best regards,  
*The Positiv Team*`
    
    await createPage.fillMDXContent(mdxContent)
    
    // Select all recipients (no segmentation)
    await createPage.selectSegmentation('all')
    
    // Check recipient count
    const recipientCount = await createPage.getRecipientCount()
    expect(recipientCount).toBeGreaterThan(0)
    
    // Send immediately
    await createPage.sendImmediately()
    
    // Wait for navigation to view page
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    // Verify newsletter was created
    const subject = await viewPage.getSubject()
    expect(subject).toBe('Test Newsletter - Immediate Send')
    
    const status = await viewPage.getStatus()
    expect(status).toMatch(/sending|sent/i)
    
    // Check Mailhog for sent emails
    const messagesReceived = await mailhog.waitForMessages(1, 10000)
    expect(messagesReceived).toBe(true)
    
    const messages = await mailhog.getMessages()
    expect(messages.length).toBeGreaterThan(0)
    
    // Verify email content
    const latestMessage = messages[0]
    expect(latestMessage.Content.Headers.Subject[0]).toBe('Test Newsletter - Immediate Send')
  })

  test('admin can schedule a newsletter for future', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    // Fill newsletter details
    await createPage.fillSubject('Scheduled Newsletter Test')
    await createPage.selectTemplate('event-announcement')
    
    const mdxContent = `# Upcoming Event!

Join us for our next community gathering.

<EventCard 
  title="Spring Meetup"
  date="2025-03-20"
  location="Community Center"
  spots={30}
/>

See you there!`
    
    await createPage.fillMDXContent(mdxContent)
    await createPage.selectSegmentation('all')
    
    // Schedule for 1 hour from now
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 1)
    await createPage.scheduleNewsletter(futureDate)
    
    // Verify scheduled status
    await page.waitForURL(/\/admin\/newsletters\/view/)
    const status = await viewPage.getStatus()
    expect(status).toMatch(/scheduled/i)
    
    const scheduledDate = await viewPage.getScheduledDate()
    expect(scheduledDate).toBeTruthy()
  })

  test('admin can edit draft newsletter', async ({ page }) => {
    // First create a draft
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Draft Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Draft Content')
    await createPage.saveAsDraft()
    
    // Navigate back to list
    await page.waitForURL(/\/admin\/newsletters/)
    await listPage.filterByStatus('draft')
    
    // Edit the draft
    await listPage.clickEditNewsletter('Draft Newsletter')
    
    // Update content
    await editPage.fillSubject('Updated Draft Newsletter')
    await editPage.fillMDXContent('# Updated Content\n\nThis content has been updated.')
    await editPage.updateNewsletter()
    
    // Verify updates
    await page.waitForURL(/\/admin\/newsletters\/view/)
    const subject = await viewPage.getSubject()
    expect(subject).toBe('Updated Draft Newsletter')
  })

  test('admin can preview newsletter before sending', async () => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Preview Test Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Preview Test\n\nThis is preview content.')
    
    // Click preview
    await createPage.previewNewsletter()
    
    // Verify preview modal appears
    const previewModal = createPage['page'].locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Close preview
    await createPage['page'].click('[data-testid="close-preview"]')
    await expect(previewModal).not.toBeVisible()
  })

  test('admin can delete draft newsletter', async ({ page }) => {
    // Create a draft first
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Newsletter to Delete')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# To be deleted')
    await createPage.saveAsDraft()
    
    // Go to view page
    await page.waitForURL(/\/admin\/newsletters\/view/)
    
    // Delete the newsletter
    await viewPage.clickDelete()
    
    // Should redirect to list
    await page.waitForURL(/\/admin\/newsletters$/)
    
    // Verify newsletter is gone
    const rows = await page.locator('table tr:has-text("Newsletter to Delete")').count()
    expect(rows).toBe(0)
  })

  test('validation errors are shown for invalid input', async () => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    // Try to send without filling required fields
    await createPage.sendImmediately()
    
    // Check for validation errors
    const errors = await createPage.getValidationErrors()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.includes('subject'))).toBe(true)
    expect(errors.some(e => e.includes('content'))).toBe(true)
  })
})