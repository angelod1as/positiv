import { test, expect } from '@playwright/test'
import { homepageCopy } from '../../../app/copy/homepage'
import { errorsCopy } from '../../../app/copy/errors'
import { testPageContent } from '../../fixtures/test-page-content'
import { SitePage } from '../../pages/SitePage'

// The e2e suite asserts against one Page the seed owns, never against
// Editor-managed content, so deleting or renaming a real Page cannot break it.
const {
  address: TEST_PAGE_ADDRESS,
  sentinel: TEST_PAGE_SENTINEL,
  aboutTitle: ABOUT_SECTION_TITLE,
  richTextHeading: RICH_TEXT_HEADING,
  founderName: FOUNDER_NAME,
  imageAlt: IMAGE_SECTION_ALT,
  seoDescription: SEO_DESCRIPTION,
} = testPageContent
const CANONICAL = `https://www.positivparty.com${TEST_PAGE_ADDRESS}`

test.describe('Pages from Sanity', () => {
  test('the test Page loads and renders its header and every Section', async ({
    page,
  }) => {
    const sitePage = new SitePage(page)

    const response = await sitePage.goto(TEST_PAGE_ADDRESS)

    expect(response?.status()).toBe(200)
    await expect(sitePage.title).toBeVisible()
    await expect(page.getByText(TEST_PAGE_SENTINEL)).toBeVisible()
    await expect(sitePage.sectionTitle(ABOUT_SECTION_TITLE)).toBeVisible()
    await expect(sitePage.sectionTitle(RICH_TEXT_HEADING)).toBeVisible()
    await expect(sitePage.personName(FOUNDER_NAME)).toBeVisible()
    await expect(page.getByRole('img', { name: IMAGE_SECTION_ALT })).toBeVisible()
  })

  test('the Next Events Section renders the events it loads from the backend', async ({
    page,
  }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto(TEST_PAGE_ADDRESS)

    // The Section renders only when events load, so an apply link proves the
    // backend-driven component works — without asserting any event's content.
    await expect(
      page.getByRole('link', { name: homepageCopy.nextEvents.apply }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: homepageCopy.nextEvents.learnMore }),
    ).toBeVisible()
  })

  test('a Page carries its SEO meta and canonical URL', async ({ page }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto(TEST_PAGE_ADDRESS)

    await expect(sitePage.meta('description')).toHaveAttribute(
      'content',
      SEO_DESCRIPTION,
    )
    await expect(sitePage.metaProperty('og:description')).toHaveAttribute(
      'content',
      SEO_DESCRIPTION,
    )
    await expect(sitePage.metaProperty('og:url')).toHaveAttribute(
      'content',
      CANONICAL,
    )
    await expect(sitePage.canonical()).toHaveAttribute('href', CANONICAL)
    await expect(sitePage.meta('robots')).toHaveAttribute('content', 'noindex')
  })

  test('an address no Page has returns 404', async ({ page }) => {
    const sitePage = new SitePage(page)

    const response = await sitePage.goto('/sobre/ninguem')

    expect(response?.status()).toBe(404)
    await expect(sitePage.title).toHaveText(errorsCopy.boundary.notFoundTitle)
    await expect(page.getByText(errorsCopy.boundary.notFound)).toBeVisible()
  })

  test('a missing bundle under /assets returns 404', async ({ request }) => {
    const response = await request.get('/assets/nao-existe.js')

    expect(response.status()).toBe(404)
  })
})
