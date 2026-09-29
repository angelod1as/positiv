import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  private readonly url = '/'

  readonly heroTitle: Locator

  constructor(page: Page) {
    super(page)

    this.heroTitle = page.getByRole('heading', { level: 1 })
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
