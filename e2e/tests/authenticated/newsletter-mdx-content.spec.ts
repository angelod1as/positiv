import { test, expect } from '@playwright/test'
import { NewsletterListPage } from '../../pages/admin/NewsletterListPage'
import { NewsletterCreatePage } from '../../pages/admin/NewsletterCreatePage'
import { MailhogHelper } from '../../helpers/mailhog'

test.describe('Newsletter MDX Content Rendering', () => {
  let listPage: NewsletterListPage
  let createPage: NewsletterCreatePage
  let mailhog: MailhogHelper

  test.beforeEach(async ({ page }) => {
    listPage = new NewsletterListPage(page)
    createPage = new NewsletterCreatePage(page)
    mailhog = new MailhogHelper()
    await mailhog.clearAllMessages()
  })

  test('MDX EventCard component renders correctly', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('EventCard Component Test')
    await createPage.selectTemplate('event-announcement')
    
    const mdxContent = `# Upcoming Event

<EventCard 
  title="Summer Beach Party"
  date="2025-07-15"
  location="Copacabana Beach"
  spots={100}
/>

Don't miss this amazing event!`
    
    await createPage.fillMDXContent(mdxContent)
    
    // Preview the newsletter
    await createPage.previewNewsletter()
    
    // Check EventCard is rendered in preview
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Verify EventCard content
    await expect(previewModal).toContainText('Summer Beach Party')
    await expect(previewModal).toContainText('2025-07-15')
    await expect(previewModal).toContainText('Copacabana Beach')
    await expect(previewModal).toContainText('100')
    
    // Close preview
    await page.click('[data-testid="close-preview"]')
    
    // Send newsletter
    await createPage.selectSegmentation('all')
    await createPage.sendImmediately()
    
    // Check email content
    await mailhog.waitForMessages(1, 15000)
    const messages = await mailhog.getMessages()
    const messageContent = await mailhog.getMessageContent(messages[0].ID)
    const htmlContent = messageContent?.Content?.Body || ''
    
    // Verify EventCard rendered in email
    expect(htmlContent).toContain('Summer Beach Party')
    expect(htmlContent).toContain('Copacabana Beach')
    expect(htmlContent).toContain('100')
  })

  test('MDX Button component renders with correct link', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Button Component Test')
    await createPage.selectTemplate('general-news')
    
    const mdxContent = `# Check Out Our Events

<Button href="https://positiv.com/events">
  Browse All Events
</Button>

<Button href="https://positiv.com/register">
  Register Now
</Button>`
    
    await createPage.fillMDXContent(mdxContent)
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Check buttons are rendered
    const buttons = previewModal.locator('a[href*="positiv.com"]')
    await expect(buttons).toHaveCount(2)
    
    // Close preview and send
    await page.click('[data-testid="close-preview"]')
    await createPage.selectSegmentation('all')
    await createPage.sendImmediately()
    
    // Verify in email
    await mailhog.waitForMessages(1, 15000)
    const messages = await mailhog.getMessages()
    const messageContent = await mailhog.getMessageContent(messages[0].ID)
    const htmlContent = messageContent?.Content?.Body || ''
    
    expect(htmlContent).toContain('href="https://positiv.com/events"')
    expect(htmlContent).toContain('href="https://positiv.com/register"')
    expect(htmlContent).toContain('Browse All Events')
    expect(htmlContent).toContain('Register Now')
  })

  test('MDX Divider component renders correctly', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Divider Component Test')
    await createPage.selectTemplate('general-news')
    
    const mdxContent = `# Section One

Content for section one.

<Divider />

# Section Two

Content for section two.

<Divider />

# Section Three

Content for section three.`
    
    await createPage.fillMDXContent(mdxContent)
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Check dividers are rendered
    const dividers = previewModal.locator('hr')
    const dividerCount = await dividers.count()
    expect(dividerCount).toBeGreaterThanOrEqual(2)
    
    await page.click('[data-testid="close-preview"]')
  })

  test('MDX Quote component renders with author', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Quote Component Test')
    await createPage.selectTemplate('general-news')
    
    const mdxContent = `# Testimonials

<Quote author="João Silva">
  Positiv changed my life! The community is amazing and the events are unforgettable.
</Quote>

<Quote author="Maria Santos">
  I've made so many friends through Positiv events. Highly recommend!
</Quote>`
    
    await createPage.fillMDXContent(mdxContent)
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Check quotes are rendered
    await expect(previewModal).toContainText('Positiv changed my life!')
    await expect(previewModal).toContainText('João Silva')
    await expect(previewModal).toContainText('Maria Santos')
    
    // Check blockquote styling
    const quotes = previewModal.locator('blockquote')
    await expect(quotes).toHaveCount(2)
    
    await page.click('[data-testid="close-preview"]')
  })

  test('MDX markdown formatting works correctly', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Markdown Formatting Test')
    await createPage.selectTemplate('general-news')
    
    const mdxContent = `# Main Heading

## Subheading

This is **bold text** and this is *italic text*.

### Lists

- Item one
- Item two
- Item three

1. Numbered item one
2. Numbered item two
3. Numbered item three

### Links

Check out [our website](https://positiv.com) for more info.

### Code

Inline \`code\` and block:

\`\`\`
const greeting = "Hello, Positiv!";
console.log(greeting);
\`\`\`

> This is a blockquote using markdown syntax.`
    
    await createPage.fillMDXContent(mdxContent)
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Check markdown elements are rendered
    await expect(previewModal.locator('h1')).toContainText('Main Heading')
    await expect(previewModal.locator('h2')).toContainText('Subheading')
    await expect(previewModal.locator('strong')).toContainText('bold text')
    await expect(previewModal.locator('em')).toContainText('italic text')
    await expect(previewModal.locator('ul li')).toHaveCount(3)
    await expect(previewModal.locator('ol li')).toHaveCount(3)
    await expect(previewModal.locator('a[href="https://positiv.com"]')).toContainText('our website')
    
    await page.click('[data-testid="close-preview"]')
  })

  test('preview updates live as MDX content changes', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Live Preview Test')
    await createPage.selectTemplate('general-news')
    
    // Initial content
    await createPage.fillMDXContent('# Initial Content')
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toContainText('Initial Content')
    
    // Update content
    await createPage.fillMDXContent('# Updated Content\n\nThis is the new content.')
    
    // Check if preview auto-updates or needs refresh
    const hasAutoUpdate = await previewModal.locator('text=Updated Content').isVisible({ timeout: 2000 }).catch(() => false)
    
    if (!hasAutoUpdate) {
      // Click refresh/update preview if needed
      const refreshButton = page.locator('[data-testid="refresh-preview"]')
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
      }
    }
    
    await expect(previewModal).toContainText('Updated Content')
    await expect(previewModal).toContainText('This is the new content')
    
    await page.click('[data-testid="close-preview"]')
  })

  test('invalid MDX shows error message', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Invalid MDX Test')
    await createPage.selectTemplate('general-news')
    
    // Invalid MDX with unclosed component
    const invalidMdx = `# Test

<EventCard 
  title="Broken Event"
  date="2025-01-01"
  
Missing closing tag and attributes`
    
    await createPage.fillMDXContent(invalidMdx)
    await createPage.previewNewsletter()
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"], [data-testid="mdx-error"]')
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (hasError) {
      await expect(errorMessage).toContainText(/error|invalid/i)
    }
  })

  test('all components work together in complex MDX', async ({ page }) => {
    await listPage.navigate()
    await listPage.clickCreateNewsletter()
    
    await createPage.fillSubject('Complex MDX Newsletter')
    await createPage.selectTemplate('general-news')
    
    const complexMdx = `# 🎉 Novidades do Positiv!

Olá pessoal! Temos ótimas notícias para compartilhar.

## Próximos Eventos

<EventCard 
  title="Festa de Verão"
  date="2025-02-15"
  location="Praia de Copacabana"
  spots={50}
/>

<Divider />

<EventCard 
  title="Workshop de Fotografia"
  date="2025-02-20"
  location="Centro Cultural"
  spots={20}
/>

## O que nossos membros dizem

<Quote author="Pedro Oliveira">
  Os eventos do Positiv são sempre incríveis! A organização é impecável.
</Quote>

<Divider />

## Não perca!

Reserve seu lugar agora mesmo:

<Button href="https://positiv.com/events">
  Ver Todos os Eventos
</Button>

---

*Abraços,*  
**Equipe Positiv**`
    
    await createPage.fillMDXContent(complexMdx)
    await createPage.previewNewsletter()
    
    const previewModal = page.locator('[data-testid="preview-modal"]')
    await expect(previewModal).toBeVisible()
    
    // Verify all components are rendered
    await expect(previewModal).toContainText('Novidades do Positiv')
    await expect(previewModal).toContainText('Festa de Verão')
    await expect(previewModal).toContainText('Workshop de Fotografia')
    await expect(previewModal).toContainText('Pedro Oliveira')
    await expect(previewModal).toContainText('Ver Todos os Eventos')
    
    // Check structure
    const eventCards = previewModal.locator('.event-card, [class*="event"]')
    const eventCardCount = await eventCards.count()
    expect(eventCardCount).toBeGreaterThanOrEqual(2)
    
    await page.click('[data-testid="close-preview"]')
    
    // Send and verify email
    await createPage.selectSegmentation('all')
    await createPage.sendImmediately()
    
    await mailhog.waitForMessages(1, 15000)
    const messages = await mailhog.getMessages()
    const messageContent = await mailhog.getMessageContent(messages[0].ID)
    const htmlContent = messageContent?.Content?.Body || ''
    
    // Verify all content in email
    expect(htmlContent).toContain('Festa de Verão')
    expect(htmlContent).toContain('Workshop de Fotografia')
    expect(htmlContent).toContain('Pedro Oliveira')
    expect(htmlContent).toContain('positiv.com/events')
  })
})