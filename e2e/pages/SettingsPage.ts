import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class SettingsPage extends BasePage {
  // Page URLs
  private readonly accountUrl = '/conta'
  private readonly basicDataUrl = '/conta/dados-basicos'
  private readonly genderPronounsUrl = '/conta/dados-basicos/genero-pronomes-orientacao'
  private readonly changePasswordUrl = '/conta/mudar-senha'

  // Account page locators
  readonly changePasswordButton: Locator
  readonly editBasicDataButton: Locator
  readonly fillBasicDataButton: Locator
  readonly logoutButton: Locator
  readonly deleteAccountButton: Locator

  // Basic data form locators
  readonly fullNameInput: Locator
  readonly socialNameInput: Locator
  readonly dateOfBirthInput: Locator
  readonly whereLivesInput: Locator
  readonly howCameToUsInput: Locator
  readonly phoneInput: Locator
  readonly confirmPhoneInput: Locator
  readonly cpfInput: Locator
  readonly rgInput: Locator
  readonly rgIssuerInput: Locator
  readonly basicDataSubmitButton: Locator

  // Gender/Pronouns/Orientation locators
  readonly genderCheckboxes: Locator
  readonly orientationCheckboxes: Locator
  readonly pronounsCheckboxes: Locator
  readonly genderOtherInput: Locator
  readonly orientationOtherInput: Locator
  readonly pronounsOtherInput: Locator
  readonly genderPronounsSubmitButton: Locator

  // Change password locators
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly changePasswordSubmitButton: Locator

  // Error locators
  readonly generalError: Locator
  readonly fieldErrors: Locator
  readonly successToast: Locator

  constructor(page: Page) {
    super(page)

    // Account page
    this.changePasswordButton = page.getByRole('link', { name: 'Mudar senha' })
    this.editBasicDataButton = page.getByRole('link', { name: 'Editar dados básicos' })
    this.fillBasicDataButton = page.getByRole('link', { name: 'Preencher dados básicos' })
    this.logoutButton = page.getByRole('button', { name: 'Deslogar conta' })
    this.deleteAccountButton = page.getByRole('button', { name: 'Apagar conta' })

    // Basic data form
    this.fullNameInput = page.getByRole('textbox', { name: 'Nome completo' })
    this.socialNameInput = page.getByRole('textbox', { name: 'Nome social ou apelido' })
    this.dateOfBirthInput = page.getByLabel('Data de nascimento')
    this.whereLivesInput = page.getByRole('textbox', { name: 'Em que cidade você mora?' })
    this.howCameToUsInput = page.getByRole('textbox', { name: 'Como chegou até nós?' })
    this.phoneInput = page.locator('input[name="phone"]')
    this.confirmPhoneInput = page.locator('input[name="confirm_phone"]')
    this.cpfInput = page.getByRole('textbox', { name: 'CPF' })
    this.rgInput = page.getByRole('textbox', { name: 'RG', exact: true })
    this.rgIssuerInput = page.getByRole('textbox', { name: 'Emissor do RG' })
    this.basicDataSubmitButton = page.getByRole('button', { name: /Continuar|Salvar/ })

    // Gender/Pronouns/Orientation
    this.genderCheckboxes = page.getByRole('group').filter({ hasText: 'Gênero' }).getByRole('checkbox')
    this.orientationCheckboxes = page.getByRole('group').filter({ hasText: 'Orientação' }).getByRole('checkbox')
    this.pronounsCheckboxes = page.getByRole('group').filter({ hasText: 'Pronomes' }).getByRole('checkbox')
    this.genderOtherInput = page.locator('input[name="gender_other"]')
    this.orientationOtherInput = page.locator('input[name="orientation_other"]')
    this.pronounsOtherInput = page.locator('input[name="pronouns_other"]')
    this.genderPronounsSubmitButton = page.getByRole('button', { name: 'Continuar' })

    // Change password
    this.newPasswordInput = page.getByLabel('Nova senha')
    this.confirmPasswordInput = page.getByLabel('Confirmar senha')
    this.changePasswordSubmitButton = page.getByRole('button', { name: 'Mudar senha' })

    // Errors and success
    this.generalError = page.getByRole('alert')
    this.fieldErrors = page.locator('[id^="errors-for-"]')
    this.successToast = page.locator('[data-sonner-toast]').filter({ hasText: /sucesso|salvo/i })
  }

  async gotoAccountPage(): Promise<void> {
    await this.navigateTo(this.accountUrl)
  }

  async gotoBasicDataPage(): Promise<void> {
    await this.navigateTo(this.basicDataUrl)
  }

  async gotoChangePasswordPage(): Promise<void> {
    await this.navigateTo(this.changePasswordUrl)
  }

  async fillBasicDataForm(data: {
    fullName: string
    socialName?: string
    dateOfBirth: string
    whereLives: string
    howCameToUs: string
    phone: string
    cpf: string
    rg: string
    rgIssuer: string
  }): Promise<void> {
    await this.fillAndVerify(this.fullNameInput, data.fullName)
    if (data.socialName) {
      await this.fillAndVerify(this.socialNameInput, data.socialName)
    }
    await this.fillAndVerify(this.dateOfBirthInput, data.dateOfBirth)
    await this.fillAndVerify(this.whereLivesInput, data.whereLives)
    await this.fillAndVerify(this.howCameToUsInput, data.howCameToUs)
    await this.fillAndVerify(this.phoneInput, data.phone)
    await this.fillAndVerify(this.confirmPhoneInput, data.phone)
    await this.fillAndVerify(this.cpfInput, data.cpf)
    await this.fillAndVerify(this.rgInput, data.rg)
    await this.fillAndVerify(this.rgIssuerInput, data.rgIssuer)
  }

  async submitBasicDataForm(): Promise<void> {
    // Click submit and wait for the response
    await this.basicDataSubmitButton.click()
    
    // Wait for either a redirect response or navigation
    await Promise.race([
      // Wait for navigation to gender/pronouns page
      this.page.waitForURL('**/genero-pronomes-orientacao', { timeout: 10000 }).catch(() => null),
      // Or wait for a successful form response
      this.page.waitForResponse(response => 
        response.url().includes('dados-basicos') && 
        (response.status() === 302 || response.status() === 303 || response.status() === 200),
        { timeout: 10000 }
      )
    ])
    
    // Check if we got redirected
    const currentUrl = this.page.url()
    if (!currentUrl.includes('genero-pronomes-orientacao')) {
      // If not redirected, manually navigate
      await this.navigateTo(this.genderPronounsUrl)
    }
  }

  async selectGenderPronounsOrientation(data: {
    genders?: string[]
    orientations?: string[]
    pronouns?: string[]
    genderOther?: string
    orientationOther?: string
    pronounsOther?: string
  }): Promise<void> {
    // Select genders
    if (data.genders) {
      for (const gender of data.genders) {
        const checkbox = this.page.getByRole('checkbox', { name: gender })
        await checkbox.check()
      }
    }
    if (data.genderOther) {
      // Use semantic selector to find the "Outro" checkbox in the gender section
      const genderSection = this.page.getByRole('group').filter({ hasText: 'Gênero' })
      const genderOtherCheckbox = genderSection.getByRole('checkbox', { name: 'Outro' })
      await genderOtherCheckbox.check()
      await this.fillAndVerify(this.genderOtherInput, data.genderOther)
    }

    // Select orientations
    if (data.orientations) {
      for (const orientation of data.orientations) {
        const checkbox = this.page.getByRole('checkbox', { name: orientation })
        await checkbox.check()
      }
    }
    if (data.orientationOther) {
      // Use semantic selector to find the "Outro" checkbox in the orientation section
      const orientationSection = this.page.getByRole('group').filter({ hasText: 'Orientação' })
      const orientationOtherCheckbox = orientationSection.getByRole('checkbox', { name: 'Outro' })
      await orientationOtherCheckbox.check()
      await this.fillAndVerify(this.orientationOtherInput, data.orientationOther)
    }

    // Select pronouns
    if (data.pronouns) {
      for (const pronoun of data.pronouns) {
        const checkbox = this.page.getByRole('checkbox', { name: pronoun })
        await checkbox.check()
      }
    }
    if (data.pronounsOther) {
      // Use semantic selector to find the "Outro" checkbox in the pronouns section
      const pronounsSection = this.page.getByRole('group').filter({ hasText: 'Pronomes' })
      const pronounsOtherCheckbox = pronounsSection.getByRole('checkbox', { name: 'Outro' })
      await pronounsOtherCheckbox.check()
      await this.fillAndVerify(this.pronounsOtherInput, data.pronounsOther)
    }
  }

  async submitGenderPronounsForm(): Promise<void> {
    // Submit and wait for either navigation or response
    await this.genderPronounsSubmitButton.click()
    
    // Wait for either navigation back to account or a successful response
    await Promise.race([
      this.page.waitForURL('**/conta', { timeout: 10000 }),
      this.page.waitForResponse(response => 
        response.url().includes('profiles') && response.status() === 200,
        { timeout: 10000 }
      )
    ])
    
    await this.page.waitForLoadState('networkidle')
  }

  async changePassword(newPassword: string, confirmPassword: string): Promise<void> {
    await this.fillAndVerify(this.newPasswordInput, newPassword)
    await this.fillAndVerify(this.confirmPasswordInput, confirmPassword)
    await this.clickAndWait(this.changePasswordSubmitButton, {
      waitForNavigation: true
    })
  }

  async waitForSuccessToast(): Promise<void> {
    await this.successToast.waitFor({ state: 'visible', timeout: 10000 })
  }

  async getFieldError(fieldName: string): Promise<string | null> {
    const errorElement = this.page.locator(`#errors-for-${fieldName}`)
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }

  async hasBasicDataFilled(): Promise<boolean> {
    // Don't navigate if already on account page
    if (!this.page.url().includes('/conta')) {
      await this.gotoAccountPage()
    }
    return await this.editBasicDataButton.isVisible()
  }

  async navigateToBasicData(): Promise<void> {
    const hasBasicData = await this.hasBasicDataFilled()
    
    if (hasBasicData) {
      // Direct navigation for React Router links
      await this.navigateTo(this.basicDataUrl)
    } else {
      // When basic data is not filled, go to terms first
      await this.navigateTo('/conta/termos-e-condicoes')
      
      // From terms page, continue to basic data
      await this.page.getByRole('button', { name: /continuar|preencher/i }).click()
      await this.page.waitForURL('**/conta/dados-basicos')
    }
  }

  async getCurrentFormValues(): Promise<{
    fullName?: string
    socialName?: string
    dateOfBirth?: string
    whereLives?: string
    howCameToUs?: string
    phone?: string
    cpf?: string
    rg?: string
    rgIssuer?: string
  }> {
    const values: Record<string, string> = {}
    
    if (await this.fullNameInput.isVisible()) {
      values.fullName = await this.fullNameInput.inputValue()
    }
    if (await this.socialNameInput.isVisible()) {
      values.socialName = await this.socialNameInput.inputValue()
    }
    if (await this.dateOfBirthInput.isVisible()) {
      values.dateOfBirth = await this.dateOfBirthInput.inputValue()
    }
    if (await this.whereLivesInput.isVisible()) {
      values.whereLives = await this.whereLivesInput.inputValue()
    }
    if (await this.howCameToUsInput.isVisible()) {
      values.howCameToUs = await this.howCameToUsInput.inputValue()
    }
    if (await this.phoneInput.isVisible()) {
      values.phone = await this.phoneInput.inputValue()
    }
    if (await this.cpfInput.isVisible()) {
      values.cpf = await this.cpfInput.inputValue()
    }
    if (await this.rgInput.isVisible()) {
      values.rg = await this.rgInput.inputValue()
    }
    if (await this.rgIssuerInput.isVisible()) {
      values.rgIssuer = await this.rgIssuerInput.inputValue()
    }
    
    return values
  }

  async getSelectedCheckboxes(type: 'gender' | 'orientation' | 'pronouns'): Promise<string[]> {
    const group = type === 'gender' ? 'Gênero' : type === 'orientation' ? 'Orientação' : 'Pronomes'
    const checkboxes = this.page.getByRole('group').filter({ hasText: group }).getByRole('checkbox')
    const count = await checkboxes.count()
    const selected: string[] = []

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i)
      if (await checkbox.isChecked()) {
        const label = await checkbox.locator('..').textContent()
        if (label) {
          selected.push(label.trim())
        }
      }
    }

    return selected
  }
}