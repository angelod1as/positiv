import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { headerCopy, noticeCopy } from '../../../app/copy/layout'
import { SitePage } from '../../pages/SitePage'

type FixtureLink = { label: string; page: { address: string } | null; url: string | null }

type FixtureSiteSettings = {
  navigation: FixtureLink[]
  footer: { columns: { title: string; links: FixtureLink[] }[] }
}

// Read rather than imported, for the reason given in mocks/sanity-mock-server.ts.
const siteSettings = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'site-settings.json'), 'utf8'),
) as FixtureSiteSettings

const hrefOf = (link: FixtureLink) => link.page?.address ?? link.url

test.describe('Site Settings from Sanity', () => {
  test('the header renders the Navigation, resolving links to Pages', async ({ page }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/sobre')

    const navigation = sitePage.navigation(headerCopy.navigationLabel)
    for (const link of siteSettings.navigation) {
      await expect(navigation.getByRole('link', { name: link.label })).toHaveAttribute(
        'href',
        hrefOf(link) ?? '',
      )
    }

    await navigation.getByRole('link', { name: 'Equipe' }).click()
    await expect(page).toHaveURL(/\/sobre\/equipe$/)
  })

  test('the Navigation moves into a menu on a small screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const sitePage = new SitePage(page)

    await sitePage.goto('/sobre')
    await page.getByRole('button', { name: headerCopy.openMenu }).click()

    const menu = page.getByRole('dialog', { name: headerCopy.menuTitle })
    await menu.getByRole('link', { name: 'Equipe' }).click()
    await expect(page).toHaveURL(/\/sobre\/equipe$/)
    await expect(menu).toBeHidden()
  })

  test('a Platform page renders the footer from the Site Settings', async ({ page }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/entrar')

    for (const column of siteSettings.footer.columns) {
      const list = sitePage.footerColumn(column.title)
      for (const link of column.links) {
        await expect(list.getByRole('link', { name: link.label })).toHaveAttribute(
          'href',
          hrefOf(link) ?? '',
        )
      }
    }
    await expect(
      page.getByRole('contentinfo').getByText('Este website está em constante desenvolvimento por'),
    ).toBeVisible()
  })
})

test.describe('the Notice from Sanity', () => {
  const notice = (page: Page) =>
    page.getByRole('alert').filter({ hasText: 'Aviso de teste' })

  test('shows on every page without covering it, and stays closed once dismissed', async ({ page }) => {
    const sitePage = new SitePage(page)

    await sitePage.goto('/sobre')

    await expect(notice(page)).toBeVisible()
    await expect(notice(page).getByRole('link', { name: 'Saiba mais no aviso' })).toHaveAttribute(
      'href',
      '/eventos',
    )
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
