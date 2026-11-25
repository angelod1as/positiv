import { test, expect } from '@playwright/test'
import { emailConsentCopy, emailsPageCopy } from '../../../app/copy/emails'
import { agreeToTermsCopy } from '../../../app/copy/dashboard'
import { headerCopy } from '../../../app/copy/layout'
import { LikertAnswerPage } from '../../pages/LikertAnswerPage'
import { readLikertStatements, setLikertSettings } from '../../utils/likert-helpers'

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

  test('Answers the Likert scale from the keyboard, resumes it and sees it in the history', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const likertLink = () => page.getByRole('link', { name: 'Escala de Likert' })
    const submissions = () => page.getByRole('link', { name: /^Enviada em / })
    const total = readLikertStatements().length
    const likert = new LikertAnswerPage(page)
    const answered: string[] = []
    let submittedBefore = 0
    let fifth = ''
    let sixth = ''

    try {
      await test.step('without "Obrigatória" the account page shows no way in', async () => {
        await setLikertSettings({ enabled: false, required: false })
        await page.goto('/conta')
        await expect(page.getByRole('link', { name: 'Mudar senha' })).toBeVisible()
        await expect(likertLink()).toHaveCount(0)
      })

      await test.step('with "Obrigatória" the account page leads to the scale', async () => {
        await setLikertSettings({ enabled: false, required: true })
        await page.goto('/conta')
        await likertLink().click()
        await expect(page).toHaveURL('/conta/escala')
        await expect(page.getByRole('heading', { level: 1, name: 'Escala de Likert' })).toBeVisible()
        submittedBefore = await submissions().count()

        await page.getByRole('link', { name: /^Responder/ }).click()
        await expect(page).toHaveURL('/conta/escala/responder')
        await expect(likert.statement()).toBeVisible()
        await likert.waitForHydration()
        await likert.expectPosition(1, total)
      })

      await test.step('the shortcut dialog opens and closes, and swallows the numbers while open', async () => {
        await likert.keyboardHelpLink().click()
        await expect(likert.keyboardHelp()).toBeVisible()
        await page.keyboard.press('2')
        await likert.expectPicked(null)
        await page.keyboard.press('Escape')
        await expect(likert.keyboardHelp()).toBeHidden()
        await likert.expectPicked(null)
      })

      await test.step('1 to 5 pick; Enter, Space and the right arrow move on', async () => {
        answered.push(await likert.statementText())
        await page.keyboard.press('4')
        await likert.expectPicked(4)
        await page.keyboard.press('Enter')
        answered.push(await likert.expectMovedFrom(answered[0]))
        await likert.expectPosition(2, total)

        await page.keyboard.press('2')
        await likert.expectPicked(2)
        await page.keyboard.press(' ')
        answered.push(await likert.expectMovedFrom(answered[1]))
        await likert.expectPosition(3, total)

        await page.keyboard.press('5')
        await likert.expectPicked(5)
        await page.keyboard.press('ArrowRight')
        answered.push(await likert.expectMovedFrom(answered[2]))
        await likert.expectPosition(4, total)
      })

      await test.step('the left arrow goes back to the answer as it was left', async () => {
        await page.keyboard.press('ArrowLeft')
        await expect(likert.statement()).toHaveText(answered[2])
        await likert.expectPicked(5)
        await page.keyboard.press('ArrowRight')
        await expect(likert.statement()).toHaveText(answered[3])
      })

      await test.step('inside the comment digits and Enter type, Ctrl/Cmd + Enter moves on', async () => {
        await page.keyboard.press('3')
        await likert.comment().click()
        await page.keyboard.type('linha 1')
        await page.keyboard.press('Enter')
        await page.keyboard.type('linha 2')
        await expect(likert.comment()).toHaveValue('linha 1\nlinha 2')
        await expect(likert.statement()).toHaveText(answered[3])
        await likert.expectPicked(3)
        await page.keyboard.press('ControlOrMeta+Enter')
        fifth = await likert.expectMovedFrom(answered[3])
        await likert.expectPosition(5, total)
      })

      await test.step('coming back resumes on the first unanswered statement', async () => {
        await page.goto('/conta')
        await likert.navigate()
        await likert.expectPosition(5, total)
        await expect(likert.statement()).toHaveText(fifth)
        expect(answered).not.toContain(fifth)
      })

      await test.step('the left arrow walks back through the answers in the order given', async () => {
        for (const [index, text] of [...answered].reverse().entries()) {
          await page.keyboard.press('ArrowLeft')
          await expect(likert.statement()).toHaveText(text)
          await likert.expectPosition(4 - index, total)
        }
        await likert.expectPicked(4)
        for (const text of answered.slice(1)) {
          await page.keyboard.press('ArrowRight')
          await expect(likert.statement()).toHaveText(text)
        }
        await expect(likert.comment()).toHaveValue('linha 1\nlinha 2')
        await page.keyboard.press('ArrowRight')
        await expect(likert.statement()).toHaveText(fifth)
      })

      await test.step('Escape leaves the comment, and the numbers pick again', async () => {
        await likert.comment().click()
        await page.keyboard.press('Escape')
        await page.keyboard.press('2')
        await likert.expectPicked(2)
        await expect(likert.comment()).toHaveValue('')
        await page.keyboard.press('Enter')
        sixth = await likert.expectMovedFrom(fifth)
      })

      await test.step('answering the last statements sends the scale', async () => {
        await page.keyboard.press('1')
        await page.keyboard.press('Enter')
        await likert.expectMovedFrom(sixth)
        await likert.expectPosition(total, total)
        await page.keyboard.press('5')
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL('/conta/escala')
      })

      await test.step('the history gains the submission, holding the answers given', async () => {
        await expect(submissions()).toHaveCount(submittedBefore + 1)
        await submissions().first().click()
        await expect(page.getByRole('heading', { level: 1, name: /^Respostas de / })).toBeVisible()
        for (const text of [...answered, fifth, sixth]) {
          await expect(page.getByText(text, { exact: true })).toBeVisible()
        }
        await expect(page.getByText('linha 1')).toBeVisible()
      })

      await test.step('the draft went with the submission: answering again starts over', async () => {
        await likert.navigate()
        await likert.expectPosition(1, total)
        await likert.expectPicked(null)
      })

      await test.step('turning "Obrigatória" off takes the way in away again', async () => {
        await setLikertSettings({ enabled: false, required: false })
        await page.goto('/conta')
        await expect(page.getByRole('link', { name: 'Mudar senha' })).toBeVisible()
        await expect(likertLink()).toHaveCount(0)
      })
    } finally {
      await setLikertSettings({ enabled: false, required: false })
    }
  })
})
