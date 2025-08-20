import { test, expect, type Page } from '@playwright/test'
import { NewsletterCreatePage } from './NewsletterCreatePage'

test.describe('NewsletterCreatePage', () => {
  test('should have all required page methods', () => {
    const pageStub = {} as unknown as Page
    const newsletterCreatePage = new NewsletterCreatePage(pageStub)
    
    expect(typeof newsletterCreatePage.navigate).toBe('function')
    expect(typeof newsletterCreatePage.fillSubject).toBe('function')
    expect(typeof newsletterCreatePage.selectTemplate).toBe('function')
    expect(typeof newsletterCreatePage.fillMDXContent).toBe('function')
    expect(typeof newsletterCreatePage.selectSegmentation).toBe('function')
    expect(typeof newsletterCreatePage.toggleVeteransOnly).toBe('function')
    expect(typeof newsletterCreatePage.toggleNewbiesOnly).toBe('function')
    expect(typeof newsletterCreatePage.selectActivityType).toBe('function')
    expect(typeof newsletterCreatePage.selectActivityStatus).toBe('function')
    expect(typeof newsletterCreatePage.setEventAttendanceCount).toBe('function')
    expect(typeof newsletterCreatePage.previewNewsletter).toBe('function')
    expect(typeof newsletterCreatePage.saveAsDraft).toBe('function')
    expect(typeof newsletterCreatePage.sendImmediately).toBe('function')
    expect(typeof newsletterCreatePage.scheduleNewsletter).toBe('function')
    expect(typeof newsletterCreatePage.getRecipientCount).toBe('function')
    expect(typeof newsletterCreatePage.getValidationErrors).toBe('function')
  })

  test('should have correct selectors', () => {
    const pageStub = {} as unknown as Page
    const newsletterCreatePage = new NewsletterCreatePage(pageStub)
    
    const page = newsletterCreatePage as unknown as Record<string, string>
    
    expect(page.subjectInput).toBe('input[name="subject"]')
    expect(page.templateSelect).toBe('select[name="template_name"]')
    expect(page.mdxEditor).toBe('textarea[name="content_mdx"]')
    expect(page.veteransCheckbox).toBe('input[name="veteransOnly"]')
    expect(page.newbiesCheckbox).toBe('input[name="newbiesOnly"]')
    expect(page.activityTypeSelect).toBe('select[name="activityType"]')
    expect(page.activityStatusSelect).toBe('select[name="activityStatus"]')
    expect(page.previewButton).toBe('button:has-text("Preview")')
    expect(page.saveDraftButton).toBe('button:has-text("Save as Draft")')
    expect(page.sendButton).toBe('button:has-text("Send Now")')
    expect(page.scheduleButton).toBe('button:has-text("Schedule")')
    expect(page.recipientCount).toBe('[data-testid="recipient-count"]')
  })
})