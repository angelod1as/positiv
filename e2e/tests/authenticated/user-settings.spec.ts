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
})