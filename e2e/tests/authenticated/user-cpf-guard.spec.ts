import { test, expect } from '@playwright/test'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'
import { setProfileCpf, setProfileCpfExempt } from '../../utils/cpf-helpers'
import { createSupabaseAdminClient } from '../../utils/db-cleanup'

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

test.describe('WEB-40: someone with no CPF', () => {
  let profileId: string
  let originalCpf: string | null
  let originalWhereLives: string | null

  test.beforeEach(async ({ context }) => {
    profileId = await ensureTestUserProfileExists()
    const { data } = await createSupabaseAdminClient()
      .from('profiles')
      .select('where_lives')
      .eq('id', profileId)
      .single()
    originalWhereLives = data?.where_lives ?? null
    originalCpf = await setProfileCpf(profileId, null)
    // The link opens the organisation's WhatsApp; nothing here should leave the app.
    await context.route('https://wa.me/**', (route) => route.abort())
  })

  test.afterEach(async () => {
    await setProfileCpfExempt(profileId, false)
    await setProfileCpf(profileId, originalCpf)
    await createSupabaseAdminClient()
      .from('profiles')
      .update({ where_lives: originalWhereLives })
      .eq('id', profileId)
  })

  test('asks for an exemption without losing the form, and gets through once an admin grants it', async ({
    page,
    context,
  }) => {
    await page.goto('/dashboard')

    const modal = page.getByRole('alertdialog')
    const request = modal.getByRole('link', { name: 'Não tenho CPF ou sou pessoa estrangeira' })
    await expect(request).toHaveAttribute('href', /^https:\/\/wa\.me\//)
    await expect(request).toHaveAttribute('target', '_blank')

    await modal.getByRole('button', { name: /atualizar meu perfil/i }).click()
    await page.waitForURL('**/conta/dados-basicos')

    const whereLives = page.getByRole('textbox', { name: /em que cidade você mora/i })
    await whereLives.fill('Berlim')

    const whatsapp = context.waitForEvent('page')
    await page.getByRole('link', { name: 'Não tenho CPF ou sou pessoa estrangeira' }).click()
    await (await whatsapp).close()
    await expect(page.getByText(/aguardando liberação da administração/i)).toBeVisible()

    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await expect(page.getByText(/ainda não liberou o cadastro sem CPF/i)).toBeVisible()
    await expect(whereLives).toHaveValue('Berlim')
    await expect(page).toHaveURL(/conta\/dados-basicos/)

    await setProfileCpfExempt(profileId, true)

    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page.getByRole('alertdialog')).toBeHidden()
  })

  test('shows an exempt profile its passport in place of the CPF', async ({ page }) => {
    await setProfileCpfExempt(profileId, true)

    await page.goto('/conta/dados-basicos')

    await expect(page.getByRole('textbox', { name: 'CPF' })).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'RG ou passaporte' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: "I don't have a CPF. Click to speak with management" })
    ).toBeVisible()
  })
})

