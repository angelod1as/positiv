import { test, expect } from '@playwright/test'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'
import { setProfileCpf } from '../../utils/cpf-helpers'

const VALID_CPF = '11144477735'
const BROKEN_CPF = '11144477736'

test.describe('POS-538: the profile guard and a CPF that does not check out', () => {
  let profileId: string
  let originalCpf: string | null

  test.beforeEach(async () => {
    profileId = await ensureTestUserProfileExists()
    originalCpf = await setProfileCpf(profileId, BROKEN_CPF)
  })

  test.afterEach(async () => {
    await setProfileCpf(profileId, originalCpf)
  })

  test('stops someone whose stored CPF is impossible, and lets them go once it is fixed', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    const modal = page.getByRole('alertdialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByText(/atualize seus dados básicos/i)).toBeVisible()

    // The modal is the only way out: no escape, no click outside.
    await page.keyboard.press('Escape')
    await expect(modal).toBeVisible()

    await modal.getByRole('button', { name: /atualizar meu perfil/i }).click()
    await page.waitForURL('**/conta/dados-basicos')
    await expect(page.getByRole('alertdialog')).toBeHidden()

    const cpfInput = page.getByRole('textbox', { name: 'CPF' })
    await cpfInput.clear()
    await cpfInput.fill(VALID_CPF)

    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await expect(page.getByRole('alertdialog')).toBeHidden()
  })

  test('explains what the CPF is for on the form itself', async ({ page }) => {
    await page.goto('/conta/dados-basicos')

    await expect(
      page.getByText(/precisamos de um cpf válido para emitir suas cobranças/i)
    ).toBeVisible()
  })
})
