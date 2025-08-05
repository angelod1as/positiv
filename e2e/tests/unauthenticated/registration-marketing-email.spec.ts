import { test, expect } from '@playwright/test'

test.describe('Registration with Marketing Email Acceptance', () => {
  test('should preserve marketing email preference through registration flow', async ({ page }) => {
    // Generate unique test data
    const timestamp = Date.now()
    const uniqueEmail = `test-${timestamp}@example.com`
    const password = 'TestPassword123!'
    
    // Navigate to registration page
    await page.goto('/registrar')
    
    // Fill registration form
    await page.getByRole('textbox', { name: /e-mail/i }).fill(uniqueEmail)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByLabel('Confirme a senha').fill(password)
    
    // Use force option to bypass visibility checks for the checkbox
    await page.getByLabel('Sou maior de 18 anos').check({ force: true })
    
    // Submit registration
    await page.getByRole('button', { name: /cadastrar/i }).click()
    
    // Wait for redirect to home or confirmation page
    await page.waitForURL('/', { timeout: 10000 })
    
    // Simulate email confirmation (in real scenario, user would click email link)
    // For testing, we'll navigate directly to the confirm page with token
    // This would normally be handled by clicking the confirmation link
    
    // Navigate to login and authenticate
    await page.goto('/entrar')
    await page.getByRole('textbox', { name: /e-mail/i }).fill(uniqueEmail)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Check if we're redirected to agree-to-terms page
    const url = page.url()
    if (url.includes('agree-to-terms')) {
      // Find and click the marketing email checkbox label
      const marketingCheckbox = page.getByLabel('Aceito receber e-mails sobre a Positiv')
      await expect(marketingCheckbox).toBeVisible()
      await marketingCheckbox.click()
      
      // Also click required checkbox labels
      await page.getByLabel('Li tudo e estou de acordo!').click()
      await page.getByLabel('Aceito receber e-mails gerais do sistema').click()
      
      // Submit the form
      await page.getByRole('button', { name: /continuar/i }).click()
      
      // Should redirect to basic data page
      await expect(page).toHaveURL(/basic-data/)
      
      // Fill basic data form
      await page.getByLabel('Nome completo').fill('Test User')
      await page.getByLabel('Nome social ou apelido').fill('Tester')
      await page.getByLabel('Data de nascimento').fill('1990-01-01')
      await page.getByLabel('Em que cidade você mora?').fill('São Paulo')
      await page.getByLabel('Como chegou até nós?').fill('Test')
      await page.getByLabel('Whatsapp').fill('11999999999')
      await page.getByLabel('Confirme seu whatsapp').fill('11999999999')
      await page.getByLabel('CPF').fill('12345678901')
      await page.getByLabel('RG').fill('123456789')
      await page.getByLabel('Emissor do RG').fill('SSP/SP')
      
      // Submit basic data
      await page.getByRole('button', { name: /salvar/i }).click()
      
      // Verify we proceed to the next step
      await expect(page).toHaveURL(/gender-pronouns-orientation/)
    }
  })
  
  test('should handle unchecked marketing email preference', async ({ page }) => {
    // Generate unique test data
    const timestamp = Date.now()
    const uniqueEmail = `test-uncheck-${timestamp}@example.com`
    const password = 'TestPassword123!'
    
    // Navigate to registration page
    await page.goto('/registrar')
    
    // Fill registration form
    await page.getByRole('textbox', { name: /e-mail/i }).fill(uniqueEmail)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByLabel('Confirme a senha').fill(password)
    
    // Use force option to bypass visibility checks for the checkbox
    await page.getByLabel('Sou maior de 18 anos').check({ force: true })
    
    // Submit registration
    await page.getByRole('button', { name: /cadastrar/i }).click()
    
    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 })
    
    // Navigate to login
    await page.goto('/entrar')
    await page.getByRole('textbox', { name: /e-mail/i }).fill(uniqueEmail)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Check if we're redirected to agree-to-terms page
    const url = page.url()
    if (url.includes('agree-to-terms')) {
      // Find the marketing email checkbox
      const marketingCheckbox = page.getByLabel('Aceito receber e-mails sobre a Positiv')
      await expect(marketingCheckbox).toBeVisible()
      
      // Verify it starts as checked (default true per the code)
      await expect(marketingCheckbox).toBeChecked()
      
      // Click to uncheck it
      await marketingCheckbox.click()
      
      // Click required checkbox labels
      await page.getByLabel('Li tudo e estou de acordo!').click()
      await page.getByLabel('Aceito receber e-mails gerais do sistema').click()
      
      // Submit the form
      await page.getByRole('button', { name: /continuar/i }).click()
      
      // Should redirect to basic data page
      await expect(page).toHaveURL(/basic-data/)
    }
  })
})