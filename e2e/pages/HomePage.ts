import { type Page, type Locator } from '@playwright/test'
import { whatsAppButtonCopy } from '../../app/copy/layout'
import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  private readonly url = '/'

  readonly heroTitle: Locator
  readonly whatsAppButton: Locator
  readonly description: Locator
  readonly canonical: Locator

  constructor(page: Page) {
    super(page)

    this.heroTitle = page.getByRole('heading', { level: 1 })
    this.whatsAppButton = page.getByRole('link', { name: whatsAppButtonCopy.ariaLabel })
    this.description = page.locator('meta[name="description"]')
    this.canonical = page.locator('link[rel="canonical"]')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForPageLoad()
  }

  testimonialAuthor(author: string): Locator {
    return this.page.getByText(author, { exact: true })
  }

  founderName(name: string): Locator {
    return this.page.getByRole('heading', { level: 3, name })
  }

  founderPhoto(alt: string): Locator {
    return this.page.getByRole('img', { name: alt })
  }
}
