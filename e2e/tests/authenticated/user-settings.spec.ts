import { test, expect } from '@playwright/test'
import { emailConsentCopy, emailsPageCopy } from '../../../app/copy/emails'
import { agreeToTermsCopy } from '../../../app/copy/dashboard'
import { headerCopy } from '../../../app/copy/layout'

test.describe('POS-192: User Settings and Profile Management', () => {
  test('Can navigate to account settings', async ({ page }) => {
    // On a small screen the Platform's links live in the header menu
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await page.getByRole('button', { name: headerCopy.openMenu }).click()
    const menu = page.getByRole('dialog', { name: headerCopy.menuTitle })
    await menu.getByRole('link', { name: headerCopy.accountTitle }).click()

    await expect(page).toHaveURL('/conta')
    await expect(menu).toBeHidden()

    // Verify main buttons are visible
    await expect(page.getByRole('link', { name: 'Mudar senha' })).toBeVisible()
    await expect(page.getByRole('link', { name: /dados básicos/i })).toBeVisible()
  })

  test('Can navigate to and update basic data', async ({ page }) => {
    // Go directly to basic data
    await page.goto('/conta/dados-basicos')
    await expect(page).toHaveURL('/conta/dados-basicos')
    
    // Update social name. The form opens holding what the profile knows, so
    // this is the only field the test has to touch before saving.
    const socialNameInput = page.getByLabel('Nome social ou apelido')
    const newName = `Test ${Date.now()}`
    await socialNameInput.clear()
    await socialNameInput.fill(newName)

    // One screen, one save
    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Go back to basic data
    await page.goto('/conta/dados-basicos')

    // Verify the value persisted
    await expect(page.getByLabel('Nome social ou apelido')).toHaveValue(newName)
  })

  test('Can reach the code of conduct Page from the account page', async ({
    page,
  }) => {
    await page.goto('/conta')

    await page.getByRole('link', { name: 'Código de Conduta' }).click()

    await expect(page).toHaveURL('/codigo-de-conduta')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Código de Conduta' }),
    ).toBeVisible()
  })

  test('Can choose which e-mails to receive from the account page', async ({
    page,
  }) => {
    const alerts = () =>
      page.getByRole('checkbox', {
        name: emailConsentCopy.labels.registrationAlerts,
      })
    // The box itself is visually hidden behind its styled twin, so the label
    // is what a person clicks.
    const setAlerts = async (on: boolean) => {
      if ((await alerts().isChecked()) !== on) {
        await page
          .getByText(emailConsentCopy.labels.registrationAlerts, { exact: true })
          .click()
      }
      await expect(alerts()).toBeChecked({ checked: on })
    }
    const save = async () => {
      await page.getByRole('button', { name: emailConsentCopy.save }).click()
      await expect(page.getByText(emailsPageCopy.successToast)).toBeVisible()
    }

    await page.goto('/conta')
    await page.getByRole('link', { name: emailsPageCopy.title }).click()

    await expect(page).toHaveURL('/emails')
    await expect(
      page.getByRole('heading', { level: 1, name: emailsPageCopy.title }),
    ).toBeVisible()
    await expect(page.getByText(emailConsentCopy.alwaysSent)).toBeVisible()

    // Start from alerts on, whatever an earlier run left behind
    await setAlerts(true)
    await expect(page.getByText(emailConsentCopy.alertsOffWarning)).toBeHidden()

    await setAlerts(false)
    await expect(page.getByText(emailConsentCopy.alertsOffWarning)).toBeVisible()
    await save()

    await page.reload()
    await expect(alerts()).not.toBeChecked()

    // Leave the shared user as it found it
    await setAlerts(true)
    await save()
  })

  test('Can navigate to change password page', async ({ page }) => {
    // Go to account page
    await page.goto('/conta')
    
    // Click change password
    await page.getByRole('link', { name: 'Mudar senha' }).click()
    await expect(page).toHaveURL('/conta/mudar-senha')
    
    // Verify form fields are visible
    await expect(page.getByLabel('Nova senha')).toBeVisible()
    await expect(page.getByLabel('Confirmar senha')).toBeVisible()
  })

  test('Password validation works', async ({ page }) => {
    // Go directly to change password
    await page.goto('/conta/mudar-senha')
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Mudar senha' }).click()
    
    // Should see validation errors
    // The runtime draws each message inside the block carrying its question's
    // id; remix-forms' errors-for-<field> element is gone.
    await expect(page.locator('[data-question-id] [role="alert"]').first()).toBeVisible()
    
    // Try with mismatched passwords
    await page.getByLabel('Nova senha').fill('ValidPassword123')
    await page.getByLabel('Confirmar senha').fill('DifferentPassword123')
    await page.getByRole('button', { name: 'Mudar senha' }).click()
    
    // Should see mismatch error
    await expect(page.locator('text=/não combinam/i')).toBeVisible()
  })

  test('Email choices on the terms page persist', async ({ page }) => {
    const newsletter = () =>
      page.getByRole('checkbox', { name: emailConsentCopy.labels.newsletter })
    // The box itself is visually hidden behind its styled twin, so the label
    // is what a person clicks.
    const tick = (label: string) =>
      page.getByText(label, { exact: true }).click()
    const saveTerms = async () => {
      if (!(await page.getByLabel(agreeToTermsCopy.labels.agree).isChecked())) {
        await tick(agreeToTermsCopy.labels.agree)
      }
      await page
        .getByRole('button', { name: agreeToTermsCopy.buttonLabel })
        .click()
      await page.waitForURL('**/conta/dados-basicos', { timeout: 10000 })
    }

    await page.goto('/conta/termos-e-condicoes')
    await expect(page.getByText(emailConsentCopy.alwaysSent)).toBeVisible()

    const initialState = await newsletter().isChecked()

    await tick(emailConsentCopy.labels.newsletter)
    await expect(newsletter()).toBeChecked({ checked: !initialState })
    await saveTerms()

    await page.goto('/conta/termos-e-condicoes')
    await expect(newsletter()).toBeChecked({ checked: !initialState })

    // Leave the shared user as it found it
    await tick(emailConsentCopy.labels.newsletter)
    await saveTerms()

    await page.goto('/conta/termos-e-condicoes')
    await expect(newsletter()).toBeChecked({ checked: initialState })
  })
})
