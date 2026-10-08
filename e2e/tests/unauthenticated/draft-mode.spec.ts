import { test, expect } from '@playwright/test'
import { testPageContent } from '../../fixtures/test-page-content'
import { E2E_SANITY_VIEWER_TOKEN } from '../../mocks/sanity-mock-server'
import { SitePage } from '../../pages/SitePage'

const { address: TEST_PAGE_ADDRESS, sentinel: TEST_PAGE_SENTINEL } =
  testPageContent

// Draft mode only opens through the signed cookie that the preview-url-secret
// handshake sets. A visitor has neither, so they only ever see published
// content, and the viewer token stays on the server.
test.describe('Draft mode is closed to visitors', () => {
  test('a visitor sees published content and is never put into draft mode', async ({
    page,
    context,
  }) => {
    const sitePage = new SitePage(page)

    const response = await sitePage.goto(TEST_PAGE_ADDRESS)

    expect(response?.status()).toBe(200)
    await expect(page.getByText(TEST_PAGE_SENTINEL)).toBeVisible()

    const cookies = await context.cookies()
    expect(
      cookies.find((cookie) => cookie.name === '__sanity_preview'),
    ).toBeUndefined()
  })

  test('the viewer token never reaches the browser', async ({ page }) => {
    const sitePage = new SitePage(page)

    const response = await sitePage.goto(TEST_PAGE_ADDRESS)
    expect(response).toBeTruthy()
    const html = (await response?.text()) ?? ''

    expect(html).not.toContain(E2E_SANITY_VIEWER_TOKEN)
  })
})
