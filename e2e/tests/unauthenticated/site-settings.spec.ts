import { test, expect, type Page } from '@playwright/test'
import { headerCopy, noticeCopy } from '../../../app/copy/layout'
import { siteSettingsContent } from '../../fixtures/test-page-content'
import { SitePage } from '../../pages/SitePage'

// Seed-owned Site Settings, so asserting them is safe.
const {
  pageLinkLabel: PAGE_LINK_LABEL,
  pageLinkAddress: PAGE_LINK_ADDRESS,
  footerColumnTitle: FOOTER_COLUMN_TITLE,
  footerLinkLabel: FOOTER_LINK_LABEL,
  footerLinkAddress: FOOTER_LINK_ADDRESS,
  noticeText: NOTICE_TEXT,
  noticeLinkLabel: NOTICE_LINK_LABEL,
  noticeLinkHref: NOTICE_LINK_HREF,
} = siteSettingsContent

const notice = (page: Page) =>
  page.getByRole('alert').filter({ hasText: NOTICE_TEXT })

test.describe('Site Settings from Sanity', () => {
  test('the header Navigation resolves a link to its Page and navigates', async ({
    page,
  }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/')

    const link = sitePage
      .navigation(headerCopy.navigationLabel)
      .getByRole('link', { name: PAGE_LINK_LABEL })
    await expect(link).toHaveAttribute('href', PAGE_LINK_ADDRESS)

    await link.click()
    await expect(page).toHaveURL(new RegExp(`${PAGE_LINK_ADDRESS}$`))
  })

  test('the Navigation moves into a menu on a small screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const sitePage = new SitePage(page)

    await sitePage.goto('/')
    await page.getByRole('button', { name: headerCopy.openMenu }).click()

    const menu = page.getByRole('dialog', { name: headerCopy.menuTitle })
    await menu.getByRole('link', { name: PAGE_LINK_LABEL }).click()

    await expect(page).toHaveURL(new RegExp(`${PAGE_LINK_ADDRESS}$`))
    await expect(menu).toBeHidden()
  })

  test('a Platform page renders the footer, resolving a column link to its Page', async ({
    page,
  }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/entrar')

    const column = sitePage.footerColumn(FOOTER_COLUMN_TITLE)
    await expect(
      column.getByRole('link', { name: FOOTER_LINK_LABEL }),
    ).toHaveAttribute('href', FOOTER_LINK_ADDRESS)
  })
})

test.describe('the Notice from Sanity', () => {
  test('shows without covering the page, resolves its link, and stays dismissed', async ({
    page,
  }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/sobre')

    await expect(notice(page)).toBeVisible()
    await expect(
      notice(page).getByRole('link', { name: NOTICE_LINK_LABEL }),
    ).toHaveAttribute('href', NOTICE_LINK_HREF)
    await expect
      .poll(async () => {
        const noticeBox = await notice(page).boundingBox()
        const titleBox = await sitePage.title.boundingBox()
        return noticeBox && titleBox && titleBox.y - (noticeBox.y + noticeBox.height)
      })
      .toBeGreaterThanOrEqual(0)

    await sitePage.goto('/entrar')
    await expect(notice(page)).toBeVisible()
    await notice(page).getByRole('button', { name: noticeCopy.dismiss }).click()
    await expect(notice(page)).toBeHidden()

    await page.reload()
    await sitePage.waitForPageLoad()
    await expect(notice(page)).toBeHidden()
  })
})
