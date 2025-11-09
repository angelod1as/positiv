import { test, expect } from '@playwright/test'

test.describe('POS-192: User Settings and Profile Management', () => {
  test('Can navigate to account settings', async ({ page }) => {
    // Go to account page
    await page.goto('/conta')
    await expect(page).toHaveURL('/conta')
    
    // Verify main buttons are visible
    await expect(page.getByRole('link', { name: 'Mudar senha' })).toBeVisible()
    await expect(page.getByRole('link', { name: /dados básicos/i })).toBeVisible()
  })

  test('Can navigate to and update basic data', async ({ page }) => {
    // Go directly to basic data
    await page.goto('/conta/dados-basicos')
    await expect(page).toHaveURL('/conta/dados-basicos')
    
    // Update social name
    const socialNameInput = page.locator('input[name="social_name"]')
    const newName = `Test ${Date.now()}`
    await socialNameInput.clear()
    await socialNameInput.fill(newName)
    
    // Click continue button
    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    
    // Wait for any response
    await page.waitForLoadState('networkidle')
    
    // If we're on gender page, that's fine
    if (page.url().includes('genero-pronomes')) {
      // Just submit this form too
      await page.getByRole('button', { name: 'Continuar' }).click()
      await page.waitForLoadState('networkidle')
    }
    
    // Go back to basic data
    await page.goto('/conta/dados-basicos')
    
    // Verify the value persisted
    const currentValue = await socialNameInput.inputValue()
    expect(currentValue).toBe(newName)
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
    await expect(page.locator('[id^="errors-for-"]').first()).toBeVisible()
    
    // Try with mismatched passwords
    await page.getByLabel('Nova senha').fill('ValidPassword123')
    await page.getByLabel('Confirmar senha').fill('DifferentPassword123')
    await page.getByRole('button', { name: 'Mudar senha' }).click()
    
    // Should see mismatch error
    await expect(page.locator('text=/não combinam/i')).toBeVisible()
  })

  test('Marketing email preference can be toggled and persists', async ({ page }) => {
    // Go to terms page
    await page.goto('/conta/termos-e-condicoes')
    await expect(page).toHaveURL('/conta/termos-e-condicoes')

    // Dismiss newsletter modal if it appears (sessionStorage not persisted in storageState)
    const newsletterHeading = page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })
    const isModalVisible = await newsletterHeading.isVisible().catch(() => false)
    if (isModalVisible) {
      await page.getByRole('button', { name: /talvez mais tarde/i }).click()
      await page.waitForLoadState('networkidle')
    }

    // Ensure required checkboxes are checked first
    const agreeCheckbox = page.getByLabel('Li tudo e estou de acordo!')
    const systemEmailsCheckbox = page.getByLabel('Aceito receber e-mails gerais do sistema')
    
    // Check them if not already checked
    if (!(await agreeCheckbox.isChecked())) {
      await page.getByText('Li tudo e estou de acordo!').click()
    }
    if (!(await systemEmailsCheckbox.isChecked())) {
      await page.getByText('Aceito receber e-mails gerais do sistema').click()
    }
    
    // Find the marketing email checkbox
    const marketingCheckbox = page.getByLabel('Aceito receber e-mails sobre a Positiv')
    await expect(marketingCheckbox).toBeVisible()
    
    // Get initial state
    const initialState = await marketingCheckbox.isChecked()
    
    // Toggle it by clicking the label text (avoids label overlay issues)
    await page.getByText('Aceito receber e-mails sobre a Positiv').click()
    
    // Verify it toggled
    const afterToggle = await marketingCheckbox.isChecked()
    expect(afterToggle).toBe(!initialState)
    
    // Save the form
    await page.getByRole('button', { name: 'Continuar' }).click()
    
    // Wait for navigation - the page redirects to dados-basicos after save
    await page.waitForURL('**/conta/dados-basicos', { timeout: 10000 })
    
    // Navigate back to terms page to verify persistence
    await page.goto('/conta/termos-e-condicoes')
    await page.waitForLoadState('networkidle')
    
    // Verify the new state persisted
    const newState = await marketingCheckbox.isChecked()
    expect(newState).toBe(!initialState)
    
    // Toggle it back to original state by clicking the label text
    await page.getByText('Aceito receber e-mails sobre a Positiv').click()
    
    // Verify it toggled back
    const afterSecondToggle = await marketingCheckbox.isChecked()
    expect(afterSecondToggle).toBe(initialState)
    
    // Ensure the agree checkbox is still checked before saving again
    if (!(await agreeCheckbox.isChecked())) {
      await page.getByText('Li tudo e estou de acordo!').click()
    }
    
    // Save again
    await page.getByRole('button', { name: 'Continuar' }).click()
    
    // Wait for navigation - the page redirects to dados-basicos after save
    await page.waitForURL('**/conta/dados-basicos', { timeout: 10000 })
    
    // Navigate back to terms page for final verification
    await page.goto('/conta/termos-e-condicoes')
    await page.waitForLoadState('networkidle')
    const finalState = await marketingCheckbox.isChecked()
    expect(finalState).toBe(initialState)
  })
})