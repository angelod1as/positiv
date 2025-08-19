import { test, expect } from '@playwright/test'
import { NewsletterListPage } from '../../pages/admin/NewsletterListPage'
import { NewsletterCreatePage } from '../../pages/admin/NewsletterCreatePage'
import { MailhogHelper } from '../../helpers/mailhog'

test.describe('Newsletter Unsubscribe Functionality', () => {
  let listPage: NewsletterListPage
  let createPage: NewsletterCreatePage
  let mailhog: MailhogHelper

  test.beforeEach(async ({ page }) => {
    listPage = new NewsletterListPage(page)
    createPage = new NewsletterCreatePage(page)
    mailhog = new MailhogHelper()
    await mailhog.clearAllMessages()
  })

  test('recipient can unsubscribe from newsletter', async ({ page, context }) => {
    // Step 1: Admin creates and sends a newsletter
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Unsubscribe Test Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Test Newsletter\n\nThis newsletter includes an unsubscribe link.')
    await createPage.selectSegmentation('all')
    await createPage.sendImmediately()
    
    // Wait for newsletter to be sent
    await page.waitForURL(/\/admin\/newsletters\/view/)
    const status = await page.textContent('[data-testid="status-badge"]')
    expect(status).toMatch(/sending|sent/i)
    
    // Step 2: Check Mailhog for the sent email
    const messagesReceived = await mailhog.waitForMessages(1, 15000)
    expect(messagesReceived).toBe(true)
    
    const messages = await mailhog.getMessages()
    expect(messages.length).toBeGreaterThan(0)
    
    const latestMessage = messages[0]
    const messageContent = await mailhog.getMessageContent(latestMessage.ID)
    
    // Step 3: Extract unsubscribe link from email
    const htmlContent = messageContent?.Content?.Body || ''
    const unsubscribeLink = await mailhog.extractUnsubscribeLink(htmlContent)
    expect(unsubscribeLink).toBeTruthy()
    
    // Step 4: Open unsubscribe link in new page
    const unsubscribePage = await context.newPage()
    if (unsubscribeLink) {
      await unsubscribePage.goto(unsubscribeLink)
    }
    
    // Step 5: Verify unsubscribe page loads
    await expect(unsubscribePage.locator('h1')).toContainText(/unsubscribe/i)
    
    // Step 6: Confirm unsubscribe
    await unsubscribePage.click('button:has-text("Confirm Unsubscribe")')
    
    // Step 7: Verify success message
    await expect(unsubscribePage.locator('[role="alert"]')).toContainText(/successfully unsubscribed/i)
    
    await unsubscribePage.close()
  })

  test('unsubscribe link is unique per recipient', async ({ page }) => {
    // Send newsletter to multiple recipients
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Multi-recipient Unsubscribe Test')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Test Newsletter')
    await createPage.selectSegmentation('all')
    await createPage.sendImmediately()
    
    // Wait for multiple emails
    await page.waitForURL(/\/admin\/newsletters\/view/)
    const messagesReceived = await mailhog.waitForMessages(2, 15000)
    
    if (messagesReceived) {
      const messages = await mailhog.getMessages()
      
      if (messages.length >= 2) {
        // Get unsubscribe links from different emails
        const message1Content = await mailhog.getMessageContent(messages[0].ID)
        const message2Content = await mailhog.getMessageContent(messages[1].ID)
        
        const link1 = await mailhog.extractUnsubscribeLink(message1Content?.Content?.Body || '')
        const link2 = await mailhog.extractUnsubscribeLink(message2Content?.Content?.Body || '')
        
        // Verify links are different (contain different tokens)
        expect(link1).toBeTruthy()
        expect(link2).toBeTruthy()
        expect(link1).not.toBe(link2)
      }
    }
  })

  test('unsubscribe prevents future newsletters', async ({ page, context }) => {
    // Step 1: Send first newsletter
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('First Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# First Newsletter')
    await createPage.selectSegmentation('all')
    
    const initialRecipientCount = await createPage.getRecipientCount()
    await createPage.sendImmediately()
    
    // Step 2: Get unsubscribe link and unsubscribe
    await page.waitForURL(/\/admin\/newsletters\/view/)
    await mailhog.waitForMessages(1, 15000)
    
    const messages = await mailhog.getMessages()
    const messageContent = await mailhog.getMessageContent(messages[0].ID)
    const unsubscribeLink = await mailhog.extractUnsubscribeLink(messageContent?.Content?.Body || '')
    
    if (unsubscribeLink) {
      const unsubscribePage = await context.newPage()
      await unsubscribePage.goto(unsubscribeLink)
      await unsubscribePage.click('button:has-text("Confirm Unsubscribe")')
      await unsubscribePage.waitForSelector('text=/successfully unsubscribed/i')
      await unsubscribePage.close()
    }
    
    // Step 3: Create second newsletter and verify recipient count decreased
    await mailhog.clearAllMessages()
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Second Newsletter')
    await createPage.selectTemplate('general-news')
    await createPage.fillMDXContent('# Second Newsletter')
    await createPage.selectSegmentation('all')
    
    const newRecipientCount = await createPage.getRecipientCount()
    
    // Recipient count should be less after unsubscribe
    expect(newRecipientCount).toBeLessThan(initialRecipientCount)
  })

  test('unsubscribe page handles invalid tokens gracefully', async ({ page }) => {
    // Navigate directly to unsubscribe with invalid token
    await page.goto('/unsubscribe?token=invalid-token-12345')
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText(/invalid or expired/i)
  })

  test('unsubscribe page handles missing token gracefully', async ({ page }) => {
    // Navigate to unsubscribe without token
    await page.goto('/unsubscribe')
    
    // Should show error or redirect
    const errorMessage = page.locator('[role="alert"]')
    const isError = await errorMessage.isVisible()
    
    if (isError) {
      await expect(errorMessage).toContainText(/token.*required/i)
    } else {
      // Might redirect to home
      await expect(page).toHaveURL('/')
    }
  })
})