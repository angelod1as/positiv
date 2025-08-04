import { test, expect } from '@playwright/test'
import { SettingsPage } from '../../pages/SettingsPage'
import { LoginPage } from '../../pages/LoginPage'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'

test.describe('POS-192: User Settings and Profile Management', () => {
  let settingsPage: SettingsPage
  let profileId: string | null

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page)
    
    // Get the test user's profile ID
    profileId = await ensureTestUserProfileExists()
    expect(profileId).toBeTruthy()
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check if we need to complete onboarding
    const currentUrl = page.url()
    if (currentUrl.includes('termos-e-condicoes')) {
      // Complete onboarding  
      await page.getByRole('checkbox', { name: /aceito/i }).check()
      await page.getByRole('button', { name: 'Aceitar' }).click()
      await page.waitForURL('/dashboard', { timeout: 30000 })
      await page.waitForLoadState('networkidle')
    }
  })

  test('Complete settings journey: navigate → edit fields → save → verify persistence', async ({ page }) => {
    // Step 1: Navigate to account page
    await settingsPage.gotoAccountPage()
    await expect(page).toHaveURL('/conta')
    
    // Step 2: Navigate to basic data form
    await settingsPage.navigateToBasicData()
    await expect(page).toHaveURL(/\/conta\/dados-basicos/)
    
    // Step 3: Fill basic data form with valid data
    const testData = {
      fullName: 'João da Silva Santos',
      socialName: 'João',
      dateOfBirth: '1990-01-15',
      whereLives: 'São Paulo, SP',
      howCameToUs: 'Indicação de um amigo',
      phone: '11999887766',
      cpf: '12345678901',
      rg: '123456789',
      rgIssuer: 'SSP/SP'
    }
    
    await settingsPage.fillBasicDataForm(testData)
    
    // Step 4: Submit basic data form
    await settingsPage.submitBasicDataForm()
    
    // Should navigate to gender/pronouns/orientation page
    await expect(page).toHaveURL('/conta/dados-basicos/genero-pronomes-orientacao')
    
    // Step 5: Select multiple options for gender, orientation, and pronouns
    await settingsPage.selectGenderPronounsOrientation({
      genders: ['Homem', 'Não-binário'],
      orientations: ['Heterossexual', 'Bissexual'],
      pronouns: ['Ele/Dele', 'Elu/Delu']
    })
    
    // Step 6: Submit gender/pronouns form
    await settingsPage.submitGenderPronounsForm()
    
    // Wait for success toast
    await settingsPage.waitForSuccessToast()
    
    // Step 7: Navigate back to account page
    await settingsPage.gotoAccountPage()
    
    // Verify that "Edit basic data" button is now visible (indicating data was saved)
    await expect(settingsPage.editBasicDataButton).toBeVisible()
    
    // Step 8: Navigate back to basic data to verify persistence
    await settingsPage.editBasicDataButton.click()
    await page.waitForURL('/conta/dados-basicos')
    
    // Step 9: Verify all fields retained their values
    const currentValues = await settingsPage.getCurrentFormValues()
    
    expect(currentValues.fullName).toBe(testData.fullName)
    expect(currentValues.socialName).toBe(testData.socialName)
    expect(currentValues.dateOfBirth).toBe(testData.dateOfBirth)
    expect(currentValues.whereLives).toBe(testData.whereLives)
    expect(currentValues.howCameToUs).toBe(testData.howCameToUs)
    expect(currentValues.phone).toBe(testData.phone)
    expect(currentValues.cpf).toBe(testData.cpf)
    expect(currentValues.rg).toBe(testData.rg)
    expect(currentValues.rgIssuer).toBe(testData.rgIssuer)
    
    // Step 10: Continue to gender/pronouns page to verify those values
    await settingsPage.submitBasicDataForm()
    await page.waitForURL('/conta/dados-basicos/genero-pronomes-orientacao')
    
    // Verify selected checkboxes
    const selectedGenders = await settingsPage.getSelectedCheckboxes('gender')
    const selectedOrientations = await settingsPage.getSelectedCheckboxes('orientation')
    const selectedPronouns = await settingsPage.getSelectedCheckboxes('pronouns')
    
    expect(selectedGenders).toContain('Homem')
    expect(selectedGenders).toContain('Não-binário')
    expect(selectedOrientations).toContain('Heterossexual')
    expect(selectedOrientations).toContain('Bissexual')
    expect(selectedPronouns).toContain('Ele/Dele')
    expect(selectedPronouns).toContain('Elu/Delu')
  })

  test('Update partial data and verify changes persist', async ({ page }) => {
    // Navigate to account page
    await settingsPage.gotoAccountPage()
    
    // If basic data is not filled, skip this test
    const hasBasicData = await settingsPage.editBasicDataButton.isVisible()
    if (!hasBasicData) {
      test.skip()
      return
    }
    
    // Navigate to basic data form
    await settingsPage.navigateToBasicData()
    await expect(page).toHaveURL(/\/conta\/dados-basicos/)
    
    // Get current values
    const originalValues = await settingsPage.getCurrentFormValues()
    
    // Update only some fields
    const updates = {
      socialName: 'Joãozinho',
      whereLives: 'Rio de Janeiro, RJ',
      phone: '21988776655'
    }
    
    await settingsPage.fillAndVerify(settingsPage.socialNameInput, updates.socialName)
    await settingsPage.fillAndVerify(settingsPage.whereLivesInput, updates.whereLives)
    await settingsPage.fillAndVerify(settingsPage.phoneInput, updates.phone)
    await settingsPage.fillAndVerify(settingsPage.confirmPhoneInput, updates.phone)
    
    // Submit form
    await settingsPage.submitBasicDataForm()
    await page.waitForURL('/conta/dados-basicos/genero-pronomes-orientacao')
    
    // Submit gender/pronouns form without changes
    await settingsPage.submitGenderPronounsForm()
    await settingsPage.waitForSuccessToast()
    
    // Navigate back to verify changes
    await settingsPage.gotoBasicDataPage()
    const updatedValues = await settingsPage.getCurrentFormValues()
    
    // Verify updated fields changed
    expect(updatedValues.socialName).toBe(updates.socialName)
    expect(updatedValues.whereLives).toBe(updates.whereLives)
    expect(updatedValues.phone).toBe(updates.phone)
    
    // Verify other fields remained the same
    expect(updatedValues.fullName).toBe(originalValues.fullName)
    expect(updatedValues.dateOfBirth).toBe(originalValues.dateOfBirth)
    expect(updatedValues.cpf).toBe(originalValues.cpf)
    expect(updatedValues.rg).toBe(originalValues.rg)
  })

  test('Change password flow', async ({ page }) => {
    // Navigate to account page
    await settingsPage.gotoAccountPage()
    
    // Click change password
    await settingsPage.changePasswordButton.click()
    await page.waitForURL('/conta/mudar-senha')
    
    // Fill password form
    const newPassword = 'NewTestPassword123!'
    await settingsPage.changePassword(newPassword, newPassword)
    
    // Should redirect back to account page with success message
    await expect(page).toHaveURL('/conta')
    await settingsPage.waitForSuccessToast()
    
    // Verify toast message mentions email
    const toastText = await settingsPage.successToast.textContent()
    expect(toastText).toContain('e-mail')
  })

  test.describe('Form validation errors', () => {
    test('Basic data form validation', async ({ page }) => {
      // Navigate to basic data form
      await settingsPage.gotoAccountPage()
      
      // Navigate to basic data
      await settingsPage.navigateToBasicData()
      await expect(page).toHaveURL(/\/conta\/dados-basicos/)
      
      // Clear all fields if they have values
      await settingsPage.fullNameInput.clear()
      await settingsPage.dateOfBirthInput.clear()
      await settingsPage.phoneInput.clear()
      await settingsPage.confirmPhoneInput.clear()
      await settingsPage.cpfInput.clear()
      await settingsPage.rgInput.clear()
      await settingsPage.rgIssuerInput.clear()
      
      // Try to submit empty form
      await settingsPage.basicDataSubmitButton.click()
      
      // Should not navigate away
      await expect(page).toHaveURL('/conta/dados-basicos')
      
      // Check for required field errors
      await expect(settingsPage.fieldErrors).toBeVisible()
      
      // Test uppercase validation
      await settingsPage.fillAndVerify(settingsPage.fullNameInput, 'JOÃO SILVA')
      await settingsPage.basicDataSubmitButton.click()
      
      // Should show uppercase error
      const fullNameError = await settingsPage.getFieldError('full_name')
      expect(fullNameError).toContain('maiúscula')
      
      // Test phone number validation
      await settingsPage.fillAndVerify(settingsPage.fullNameInput, 'João Silva')
      await settingsPage.fillAndVerify(settingsPage.phoneInput, '123') // Too short
      await settingsPage.fillAndVerify(settingsPage.confirmPhoneInput, '123')
      await settingsPage.basicDataSubmitButton.click()
      
      // Should show phone error
      const phoneError = await settingsPage.getFieldError('phone')
      expect(phoneError).toContain('inválido')
      
      // Test phone confirmation mismatch
      await settingsPage.fillAndVerify(settingsPage.phoneInput, '11999887766')
      await settingsPage.fillAndVerify(settingsPage.confirmPhoneInput, '11999887777')
      await settingsPage.basicDataSubmitButton.click()
      
      // Should show confirmation error
      const confirmPhoneError = await settingsPage.getFieldError('confirm_phone')
      expect(confirmPhoneError).toBeTruthy()
    })

    test('Change password validation', async ({ page }) => {
      // Navigate to change password
      await settingsPage.gotoAccountPage()
      await settingsPage.changePasswordButton.click()
      await page.waitForURL('/conta/mudar-senha')
      
      // Test empty fields
      await settingsPage.changePasswordSubmitButton.click()
      
      // Should not navigate away
      await expect(page).toHaveURL('/conta/mudar-senha')
      await expect(settingsPage.fieldErrors).toBeVisible()
      
      // Test password too short
      await settingsPage.fillAndVerify(settingsPage.newPasswordInput, '12345') // Less than 6 chars
      await settingsPage.fillAndVerify(settingsPage.confirmPasswordInput, '12345')
      await settingsPage.changePasswordSubmitButton.click()
      
      // Should show length error
      const passwordError = await settingsPage.getFieldError('password')
      expect(passwordError).toContain('6 caracteres')
      
      // Test password mismatch
      await settingsPage.fillAndVerify(settingsPage.newPasswordInput, 'ValidPassword123')
      await settingsPage.fillAndVerify(settingsPage.confirmPasswordInput, 'DifferentPassword123')
      await settingsPage.changePasswordSubmitButton.click()
      
      // Should show mismatch error
      const confirmError = await settingsPage.getFieldError('confirm_password')
      expect(confirmError).toContain('não combinam')
    })

    test('Gender/pronouns/orientation validation', async ({ page }) => {
      // Navigate to gender/pronouns page
      await settingsPage.gotoAccountPage()
      
      // Navigate to basic data first
      const hasBasicData = await settingsPage.editBasicDataButton.isVisible()
      if (hasBasicData) {
        await settingsPage.navigateToBasicData()
      } else {
        // Fill minimum required data
        await settingsPage.navigateToBasicData()
        
        const minData = {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          whereLives: 'São Paulo',
          howCameToUs: 'Test',
          phone: '11999887766',
          cpf: '12345678901',
          rg: '123456789',
          rgIssuer: 'SSP/SP'
        }
        
        await settingsPage.fillBasicDataForm(minData)
      }
      
      await settingsPage.submitBasicDataForm()
      await page.waitForURL('/conta/dados-basicos/genero-pronomes-orientacao')
      
      // Try to submit without selecting anything
      await settingsPage.genderPronounsSubmitButton.click()
      
      // Should show validation errors
      await expect(settingsPage.fieldErrors).toBeVisible()
      
      // Test selecting "Outro" without filling the text field
      await page.getByRole('checkbox', { name: 'Outro' }).first().check()
      await settingsPage.genderPronounsSubmitButton.click()
      
      // Should show error for empty "other" field
      await expect(settingsPage.fieldErrors).toBeVisible()
    })
  })

  test('Data persistence across sessions: update → logout → login → verify', async ({ page, context }) => {
    // Get current user email from storage
    const loginPage = new LoginPage(page)
    const userEmail = await loginPage.getCurrentUserEmail()
    expect(userEmail).toBeTruthy()
    
    // Step 1: Navigate to settings and update all fields
    await settingsPage.gotoAccountPage()
    
    // Navigate to basic data
    await settingsPage.navigateToBasicData()
    await expect(page).toHaveURL(/\/conta\/dados-basicos/)
    
    // Fill with unique test data (using timestamp to ensure uniqueness)
    const timestamp = Date.now()
    const testData = {
      fullName: `Test User ${timestamp}`,
      socialName: `Tester ${timestamp}`,
      dateOfBirth: '1995-06-20',
      whereLives: 'Brasília, DF',
      howCameToUs: `E2E Test ${timestamp}`,
      phone: '61988776655',
      cpf: '98765432109',
      rg: '987654321',
      rgIssuer: 'SSP/DF'
    }
    
    await settingsPage.fillBasicDataForm(testData)
    await settingsPage.submitBasicDataForm()
    
    // Continue to gender/pronouns page
    await page.waitForURL('/conta/dados-basicos/genero-pronomes-orientacao')
    
    // Select specific options
    const genderData = {
      genders: ['Mulher', 'Travesti'],
      orientations: ['Lésbica', 'Pansexual'],
      pronouns: ['Ela/Dela'],
      orientationOther: 'Demissexual'
    }
    
    await settingsPage.selectGenderPronounsOrientation(genderData)
    await settingsPage.submitGenderPronounsForm()
    await settingsPage.waitForSuccessToast()
    
    // Step 2: Logout
    await settingsPage.gotoAccountPage()
    await settingsPage.logoutButton.click()
    
    // Wait for logout to complete
    await page.waitForURL('/')
    await page.waitForLoadState('networkidle')
    
    // Clear storage to ensure complete logout
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())
    
    // Step 3: Login again with same user
    await loginPage.goto()
    
    // Use the stored user credentials from the auth setup
    // Since we're in an authenticated test, we need to get the password from somewhere
    // For now, we'll use a known test password pattern
    const testPassword = 'TestPassword123!'
    
    // Perform login
    await loginPage.emailInput.fill(userEmail || '')
    await loginPage.passwordInput.fill(testPassword)
    await loginPage.submitButton.click()
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard|\/conta\/termos-e-condicoes/)
    
    // If terms page appears, accept them
    if (page.url().includes('termos-e-condicoes')) {
      await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Aceitar' }).click()
      await page.waitForURL('/dashboard')
    }
    
    // Step 4: Navigate back to settings and verify all data persisted
    await settingsPage.gotoAccountPage()
    await settingsPage.editBasicDataButton.click()
    await page.waitForURL('/conta/dados-basicos')
    
    // Verify basic data
    const currentValues = await settingsPage.getCurrentFormValues()
    expect(currentValues.fullName).toBe(testData.fullName)
    expect(currentValues.socialName).toBe(testData.socialName)
    expect(currentValues.dateOfBirth).toBe(testData.dateOfBirth)
    expect(currentValues.whereLives).toBe(testData.whereLives)
    expect(currentValues.howCameToUs).toBe(testData.howCameToUs)
    expect(currentValues.phone).toBe(testData.phone)
    expect(currentValues.cpf).toBe(testData.cpf)
    expect(currentValues.rg).toBe(testData.rg)
    expect(currentValues.rgIssuer).toBe(testData.rgIssuer)
    
    // Continue to verify gender/pronouns/orientation
    await settingsPage.submitBasicDataForm()
    await page.waitForURL('/conta/dados-basicos/genero-pronomes-orientacao')
    
    // Verify selected options
    const selectedGenders = await settingsPage.getSelectedCheckboxes('gender')
    const selectedOrientations = await settingsPage.getSelectedCheckboxes('orientation')
    const selectedPronouns = await settingsPage.getSelectedCheckboxes('pronouns')
    
    expect(selectedGenders).toContain('Mulher')
    expect(selectedGenders).toContain('Travesti')
    expect(selectedOrientations).toContain('Lésbica')
    expect(selectedOrientations).toContain('Pansexual')
    expect(selectedOrientations).toContain('Outro')
    expect(selectedPronouns).toContain('Ela/Dela')
    
    // Verify the "other" field value
    const otherOrientationValue = await settingsPage.orientationOtherInput.inputValue()
    expect(otherOrientationValue).toBe(genderData.orientationOther)
  })
})