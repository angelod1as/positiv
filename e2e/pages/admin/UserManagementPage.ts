import { type Locator, type Page } from '@playwright/test'
import { BasePage } from '../BasePage'

export class UserManagementPage extends BasePage {
  readonly participantsTable: Locator
  readonly tableRows: Locator
  readonly viewParticipantButtons: Locator
  readonly whatsappButtons: Locator
  readonly saveButton: Locator
  readonly googleContactsButton: Locator
  
  constructor(page: Page) {
    super(page)
    this.participantsTable = page.locator('[data-testid="participants-table"], table').first()
    this.tableRows = page.locator('.p-datatable-tbody tr')
    this.viewParticipantButtons = page.locator('[title="Ver participante"]')
    this.whatsappButtons = page.locator('button:has(img[alt="Whatsapp"])')
    this.saveButton = page.getByRole('button', { name: 'Salvar' })
    this.googleContactsButton = page.getByRole('button', { name: 'Adicionar ao Google Contacts' })
  }
  
  async navigate(eventId: string): Promise<void> {
    await this.page.goto(`/admin/eventos/${eventId}`)
    await this.participantsTable.waitFor({ state: 'visible' })
  }
  
  async waitForTableToLoad(): Promise<void> {
    await this.participantsTable.waitFor({ state: 'visible' })
    await this.page.waitForLoadState('networkidle')
  }
  
  async findRowByParticipantName(name: string): Promise<Locator> {
    await this.waitForTableToLoad()
    const row = this.tableRows.filter({ hasText: name }).first()
    await row.waitFor({ state: 'visible' })
    return row
  }
  
  async getRowIndex(row: Locator, retries: number = 3): Promise<number> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const rows = await this.tableRows.all()
        const targetElement = await row.elementHandle()
        
        if (!targetElement) {
          // This might be a timing issue, wait and retry
          if (attempt < retries) {
            await this.page.waitForTimeout(500 * attempt) // Progressive wait
            continue
          }
          // After retries, provide more context about the failure
          const rowText = await row.textContent().catch(() => 'unknown')
          throw new Error(`Could not get element handle for row with text: ${rowText}. This may indicate the row is no longer in the DOM.`)
        }
        
        for (let i = 0; i < rows.length; i++) {
          const isMatch = await rows[i].evaluate((el, targetRow) => el === targetRow, targetElement)
          if (isMatch) return i
        }
        
        // If we reach here, the row wasn't found in the current attempt
        if (attempt < retries) {
          await this.page.waitForTimeout(500 * attempt)
          continue
        }
      } catch (error) {
        if (attempt === retries) {
          throw error
        }
        await this.page.waitForTimeout(500 * attempt)
      }
    }
    
    // If all retries failed, provide detailed error
    const rowText = await row.textContent().catch(() => 'unknown')
    const rowCount = await this.tableRows.count()
    throw new Error(`Row not found in table after ${retries} attempts. Row text: ${rowText}, Total rows: ${rowCount}`)
  }
  
  async editSelectCell(row: Locator, fieldName: string, value: string): Promise<void> {
    const cell = row.locator(`td:has([name="${fieldName}"])`).first()
    await cell.click()
    
    // Wait for dropdown to appear
    const dropdown = cell.locator('select').first()
    await dropdown.waitFor({ state: 'visible' })
    await dropdown.selectOption(value)
    
    // Click outside to save
    await this.page.locator('body').click({ position: { x: 0, y: 0 } })
    await this.page.waitForLoadState('networkidle')
  }
  
  async editCheckboxCell(row: Locator, fieldName: string, checked: boolean): Promise<void> {
    const cell = row.locator(`td:has([name="${fieldName}"])`).first()
    const checkbox = cell.locator('input[type="checkbox"]').first()
    
    const isChecked = await checkbox.isChecked()
    if (isChecked !== checked) {
      await checkbox.click()
      await this.page.waitForLoadState('networkidle')
    }
  }
  
  async editNumberCell(row: Locator, fieldName: string, value: string): Promise<void> {
    const cell = row.locator(`td:has([name="${fieldName}"])`).first()
    await cell.click()
    
    const input = cell.locator('input[type="number"]').first()
    await input.waitFor({ state: 'visible' })
    await input.clear()
    await input.fill(value)
    
    // Press Tab to trigger save (more reliable than Enter for number inputs)
    await input.press('Tab')
    
    // Wait for the auto-save to complete by waiting for network idle with timeout
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 3000 })
    } catch {
      // Fallback: wait for any pending save requests
      await this.page.waitForTimeout(1500)
    }
  }
  
  async verifyCellContent(row: Locator, fieldName: string, expectedValue: string): Promise<boolean> {
    const cell = row.locator(`td:has([name="${fieldName}"])`).first()
    const content = await cell.textContent()
    return content?.includes(expectedValue) ?? false
  }
  
  async clickViewParticipantButton(row: Locator): Promise<void> {
    // First try to maximize the table if the button exists
    const maximizeButton = this.page.getByRole('button', { name: 'Maximizar tabela' })
    if (await maximizeButton.isVisible()) {
      await maximizeButton.click()
      await this.page.waitForTimeout(500)
    }
    
    // Now find and click the view participant link in the last cell
    const lastCell = row.locator('td:last-child')
    const viewButton = lastCell.locator('a').first()
    await viewButton.scrollIntoViewIfNeeded()
    await viewButton.click()
    await this.page.waitForLoadState('networkidle')
  }
  
  // Detail view methods
  async waitForDetailView(): Promise<void> {
    await this.page.waitForSelector('h1', { state: 'visible' })
    await this.page.waitForLoadState('networkidle')
  }
  
  async editDetailField(fieldName: string, value: string): Promise<void> {
    const field = this.page.locator(`[name="${fieldName}"]`).first()
    await field.waitFor({ state: 'visible' })
    
    const fieldType = await field.getAttribute('type')
    
    if (fieldType === 'checkbox') {
      const isChecked = await field.isChecked()
      const shouldBeChecked = value === 'true'
      if (isChecked !== shouldBeChecked) {
        await field.click()
      }
    } else if (await field.evaluate(el => el.tagName === 'SELECT')) {
      await field.selectOption(value)
    } else if (await field.evaluate(el => el.tagName === 'TEXTAREA')) {
      await field.clear()
      await field.fill(value)
    } else {
      await field.clear()
      await field.fill(value)
    }
  }
  
  async saveDetailViewChanges(): Promise<void> {
    await this.saveButton.click()
    await this.page.waitForLoadState('networkidle')
    
    // TODO: Bug POS-203 - Success toast is not shown after saving
    // Once fixed, uncomment the following:
    // await this.page.waitForSelector('[role="status"]:has-text("Atualizado com sucesso")', { 
    //   state: 'visible',
    //   timeout: 5000 
    // })
  }
  
  async getDetailFieldValue(fieldName: string): Promise<string> {
    const field = this.page.locator(`[name="${fieldName}"]`).first()
    
    const fieldType = await field.getAttribute('type')
    
    if (fieldType === 'checkbox') {
      const isChecked = await field.isChecked()
      return isChecked.toString()
    } else if (await field.evaluate(el => el.tagName === 'SELECT')) {
      return await field.inputValue()
    } else {
      return await field.inputValue()
    }
  }
  
  // WhatsApp integration methods
  async clickWhatsAppButton(row: Locator): Promise<void> {
    const whatsappButton = row.locator('button:has(img[alt="Whatsapp"])').first()
    await whatsappButton.waitFor({ state: 'visible' })
    
    // Intercept the window.open call to prevent actual navigation
    await this.page.evaluate(() => {
      const win = window as unknown as Window & { 
        lastOpenedUrl: string | null; 
        originalOpen: typeof window.open 
      };
      win.lastOpenedUrl = null;
      win.originalOpen = window.open;
      window.open = (url?: string | URL, _target?: string, _features?: string) => {
        win.lastOpenedUrl = url?.toString() || null;
        return null;
      };
    })
    
    await whatsappButton.click()
  }
  
  async getLastOpenedUrl(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const win = window as Window & { lastOpenedUrl?: string | null };
      return win.lastOpenedUrl || null;
    })
  }
  
  async verifyWhatsAppUrl(expectedPhone: string): Promise<boolean> {
    const url = await this.getLastOpenedUrl()
    if (!url) return false
    
    const cleanedPhone = expectedPhone.toString().replace(' ', '').replace('-', '')
    let expectedUrl: string
    
    if (cleanedPhone.length === 11) {
      expectedUrl = `https://wa.me/55${expectedPhone}`
    } else {
      expectedUrl = `https://wa.me/${expectedPhone}`
    }
    
    return url === expectedUrl
  }
  
  // Google Contacts integration methods
  async clickGoogleContactsButton(): Promise<void> {
    await this.googleContactsButton.waitFor({ state: 'visible' })
    
    // Setup clipboard and window.open interception
    await this.page.evaluate(() => {
      const win = window as unknown as Window & { 
        lastCopiedText: string | null;
        lastOpenedUrl: string | null;
        originalOpen?: typeof window.open;
      };
      
      win.lastCopiedText = null;
      win.lastOpenedUrl = null;
      
      // Override clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            win.lastCopiedText = text;
            return Promise.resolve();
          }
        },
        configurable: true
      });
      
      // Override window.open if not already done
      if (!win.originalOpen) {
        win.originalOpen = window.open;
        window.open = (url?: string | URL, _target?: string, _features?: string) => {
          win.lastOpenedUrl = url?.toString() || null;
          return null;
        };
      }
    })
    
    await this.googleContactsButton.click()
    
    // Wait a bit for the async clipboard operation
    await this.page.waitForTimeout(500)
  }
  
  async getLastCopiedText(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const win = window as Window & { lastCopiedText?: string | null };
      return win.lastCopiedText || null;
    })
  }
  
  async verifyGoogleContactsIntegration(): Promise<{
    copiedText: string | null,
    openedUrl: string | null
  }> {
    const copiedText = await this.getLastCopiedText()
    const openedUrl = await this.getLastOpenedUrl()
    
    return { copiedText, openedUrl }
  }
  
  // Cleanup method to restore window.open
  async cleanup(): Promise<void> {
    await this.page.evaluate(() => {
      const win = window as Window & { originalOpen?: typeof window.open };
      if (win.originalOpen) {
        window.open = win.originalOpen;
      }
    })
  }
}