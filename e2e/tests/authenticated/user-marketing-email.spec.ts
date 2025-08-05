import { test, expect } from '@playwright/test'

test.describe('Marketing Email Preference Management', () => {
  test('marketing email preference persists and can be toggled', async ({ page }) => {
    // Go to terms page to check current state
    await page.goto('/conta/termos-e-condicoes')
    await expect(page).toHaveURL('/conta/termos-e-condicoes')
    
    // The marketing checkbox should be checked (set to true during onboarding in auth.ts)
    const marketingCheckbox = page.getByLabel('Aceito receber e-mails sobre a Positiv')
    await expect(marketingCheckbox).toBeVisible()
    await expect(marketingCheckbox).toBeChecked()
    
    // Now uncheck it
    await marketingCheckbox.uncheck()
    await expect(marketingCheckbox).not.toBeChecked()
    
    // Submit the form
    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    
    // Wait for navigation
    await page.waitForLoadState('networkidle')
    
    // Go back to terms page to verify it was saved
    await page.goto('/conta/termos-e-condicoes')
    await expect(marketingCheckbox).toBeVisible()
    await expect(marketingCheckbox).not.toBeChecked()
    
    // Now check it again
    await marketingCheckbox.check()
    await expect(marketingCheckbox).toBeChecked()
    
    // Submit again
    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await page.waitForLoadState('networkidle')
    
    // Verify one more time it persisted
    await page.goto('/conta/termos-e-condicoes')
    await expect(marketingCheckbox).toBeVisible()
    await expect(marketingCheckbox).toBeChecked()
  })
  
  test('marketing email preference preserved when updating basic data', async ({ page }) => {
    // First, ensure marketing emails are OFF
    await page.goto('/conta/termos-e-condicoes')
    const marketingCheckbox = page.getByLabel('Aceito receber e-mails sobre a Positiv')
    
    // Uncheck if checked
    if (await marketingCheckbox.isChecked()) {
      await marketingCheckbox.uncheck()
      await page.getByRole('button', { name: /continuar|salvar/i }).click()
      await page.waitForLoadState('networkidle')
    }
    
    // Now go to basic data and update something
    await page.goto('/conta/dados-basicos')
    await expect(page).toHaveURL('/conta/dados-basicos')
    
    // Update social name
    const socialNameInput = page.locator('input[name="social_name"]')
    const newName = `Test Marketing ${Date.now()}`
    await socialNameInput.clear()
    await socialNameInput.fill(newName)
    
    // Submit
    await page.getByRole('button', { name: /continuar|salvar/i }).click()
    await page.waitForLoadState('networkidle')
    
    // If redirected to gender page, submit that too
    if (page.url().includes('dados-basicos-cont')) {
      await page.getByRole('button', { name: /continuar|salvar/i }).click()
      await page.waitForLoadState('networkidle')
    }
    
    // Go back to terms page and verify marketing preference is still OFF
    await page.goto('/conta/termos-e-condicoes')
    await expect(marketingCheckbox).toBeVisible()
    await expect(marketingCheckbox).not.toBeChecked()
  })
})