import { test, expect, type Page } from '@playwright/test'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'
import { setProfilePhone } from '../../utils/phone-helpers'

const LANDLINE = { phone: 1133334444, phone_is_international: false }
const UNFLAGGED_FOREIGN = { phone: 351912345678, phone_is_international: false }
const MOBILE = '11987654321'

async function followTheModalToTheForm(page: Page) {
  await page.goto('/dashboard')

  const modal = page.getByRole('alertdialog')
  await expect(modal).toBeVisible()
  await expect(modal.getByText(/celular válido/i)).toBeVisible()

  await modal.getByRole('button', { name: /atualizar meu perfil/i }).click()
  await page.waitForURL('**/conta/dados-basicos')
  await expect(page.getByRole('alertdialog')).toBeHidden()
}

async function saveAndLeave(page: Page) {
  await page.getByRole('button', { name: /continuar|salvar/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await expect(page.getByRole('alertdialog')).toBeHidden()
}

test.describe('POS-572: the profile guard and a phone that is not a mobile', () => {
  let profileId: string
  let originalPhone: Awaited<ReturnType<typeof setProfilePhone>>

  test.beforeEach(async () => {
    profileId = await ensureTestUserProfileExists()
  })

  test.afterEach(async () => {
    await setProfilePhone(profileId, originalPhone)
  })

  test('stops someone whose phone is a landline, and lets them go once it is a mobile', async ({
    page,
  }) => {
    originalPhone = await setProfilePhone(profileId, LANDLINE)

    await followTheModalToTheForm(page)

    for (const name of ['WhatsApp', 'Confirme seu whatsapp']) {
      const input = page.getByRole('spinbutton', { name, exact: true })
      await input.clear()
      await input.fill(MOBILE)
    }

    await saveAndLeave(page)
  })

  test('lets someone abroad keep their number by ticking the international box', async ({
    page,
  }) => {
    originalPhone = await setProfilePhone(profileId, UNFLAGGED_FOREIGN)

    await followTheModalToTheForm(page)

    // The input is visually hidden behind the styled box; the label is what a
    // person clicks.
    await page.getByText('Celular internacional', { exact: true }).click()
    await expect(
      page.getByRole('checkbox', { name: 'Celular internacional' })
    ).toBeChecked()

    await saveAndLeave(page)
  })
})
