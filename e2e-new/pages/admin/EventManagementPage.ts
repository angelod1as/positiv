import { type Locator, type Page } from '@playwright/test'
import { BasePage } from '../BasePage'

export class EventManagementPage extends BasePage {
  // Form fields
  readonly titleInput: Locator
  readonly emojiInput: Locator
  readonly descriptionInput: Locator
  readonly locationInput: Locator
  readonly priceInput: Locator
  readonly capacityInput: Locator
  readonly eventTypeSelect: Locator
  readonly eventStartInput: Locator
  readonly eventEndInput: Locator
  readonly applicationStartInput: Locator
  readonly applicationEndInput: Locator
  readonly interviewsStartInput: Locator
  readonly interviewsEndInput: Locator
  readonly groupStartInput: Locator
  readonly groupEndInput: Locator
  readonly paymentStartInput: Locator
  readonly paymentEndInput: Locator
  
  // Buttons
  readonly calculateDatesButton: Locator
  readonly saveButton: Locator
  readonly editButton: Locator
  
  // Status dropdown
  readonly statusDropdown: Locator
  
  // Page titles
  readonly createTitle: Locator
  readonly editTitle: Locator
  readonly eventHeading: Locator

  constructor(page: Page) {
    super(page)
    
    // Form fields
    this.titleInput = page.getByLabel('Nome da festa')
    this.emojiInput = page.getByLabel('Emoji')
    this.descriptionInput = page.getByLabel('Descrição')
    this.locationInput = page.getByLabel('Local')
    this.priceInput = page.getByLabel('Valor')
    this.capacityInput = page.getByLabel('Lotação')
    this.eventTypeSelect = page.getByLabel('Tipo de evento')
    this.eventStartInput = page.getByLabel('Início do evento')
    this.eventEndInput = page.getByLabel('Fim do evento')
    
    // Application period
    this.applicationStartInput = page.getByLabel('Abertura', { exact: true }).first()
    this.applicationEndInput = page.getByLabel('Encerramento').first()
    
    // Interviews period
    this.interviewsStartInput = page.getByLabel('Abertura', { exact: true }).nth(1)
    this.interviewsEndInput = page.getByLabel('Encerramento').nth(1)
    
    // Group period
    this.groupStartInput = page.locator('#time_group_start')
    this.groupEndInput = page.getByLabel('Encerramento').nth(2)
    
    // Payment period
    this.paymentStartInput = page.locator('#time_payment_start')
    this.paymentEndInput = page.getByLabel('Encerramento').nth(3)
    
    // Buttons
    this.calculateDatesButton = page.getByRole('button', { name: 'Calcular datas automaticamente' })
    this.saveButton = page.getByRole('button', { name: 'Salvar' })
    this.editButton = page.getByRole('link', { name: 'Editar' })
    
    // Status dropdown on view page
    this.statusDropdown = page.getByLabel('Status do evento')
    
    // Page titles
    this.createTitle = page.getByRole('heading', { name: 'Criar novo evento' })
    this.editTitle = page.getByRole('heading', { name: 'Editar evento' })
    this.eventHeading = page.getByRole('heading', { level: 1 })
  }

  async fillBasicEventInfo(data: {
    title: string
    emoji: string
    description: string
    location: string
    price: string
    capacity: string
    type?: 'regular' | 'bdsm'
  }): Promise<void> {
    await this.titleInput.fill(data.title)
    await this.emojiInput.fill(data.emoji)
    await this.descriptionInput.fill(data.description)
    await this.locationInput.fill(data.location)
    await this.priceInput.fill(data.price)
    await this.capacityInput.fill(data.capacity)
    
    if (data.type) {
      await this.eventTypeSelect.selectOption(data.type)
    }
  }

  async setEventStartDate(date: Date): Promise<void> {
    const formattedDate = date.toISOString().slice(0, 16)
    await this.eventStartInput.fill(formattedDate)
  }

  async clickCalculateDates(): Promise<void> {
    await this.calculateDatesButton.click()
  }

  async verifyAllDatesAreFilled(): Promise<boolean> {
    const dateInputs = [
      this.eventEndInput,
      this.applicationStartInput,
      this.applicationEndInput,
      this.interviewsStartInput,
      this.interviewsEndInput,
      this.groupStartInput,
      this.groupEndInput,
      this.paymentStartInput,
      this.paymentEndInput
    ]
    
    for (const input of dateInputs) {
      const value = await input.inputValue()
      if (!value) {
        return false
      }
    }
    
    return true
  }

  async saveEvent(): Promise<void> {
    await this.saveButton.click()
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click()
  }

  async clearField(field: Locator): Promise<void> {
    await field.clear()
  }

  async updateTitle(newTitle: string): Promise<void> {
    await this.clearField(this.titleInput)
    await this.titleInput.fill(newTitle)
  }

  async updatePrice(newPrice: string): Promise<void> {
    await this.clearField(this.priceInput)
    await this.priceInput.fill(newPrice)
  }

  async changeStatus(status: string): Promise<void> {
    await this.statusDropdown.selectOption(status)
    // Wait for auto-submit
    await this.page.waitForTimeout(1000)
  }

  async getEventTitle(): Promise<string> {
    return await this.eventHeading.textContent() || ''
  }

  async getCurrentStatus(): Promise<string> {
    return await this.statusDropdown.inputValue()
  }
}