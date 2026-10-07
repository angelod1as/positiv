import { test, expect } from '@playwright/test'
import { HomePage } from '../../pages/HomePage'

test.describe('Homepage from Sanity', () => {
  test('the Page at / loads and renders its hero and the WhatsApp button', async ({
    page,
  }) => {
    const homePage = new HomePage(page)

    await homePage.goto()

    await expect(homePage.heroTitle).toBeVisible()
    await expect(homePage.whatsAppButton).toBeVisible()
  })

  test('the Page at / carries its SEO meta', async ({ page }) => {
    const homePage = new HomePage(page)

    await homePage.goto()

    await expect(page).toHaveTitle('Positiv Party')
    await expect(homePage.description).toHaveAttribute('content', /.+/)
    await expect(homePage.canonical).toHaveAttribute(
      'href',
      'https://www.positivparty.com/',
    )
  })
})
