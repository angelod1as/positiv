import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

// A Page of the Public Site, served from the CMS at its own address.
export class SitePage extends BasePage {
  readonly title: Locator

  constructor(page: Page) {
    super(page)

    this.title = page.getByRole('heading', { level: 1 })
  }

  async goto(address: string) {
    const response = await this.page.goto(address)
    await this.waitForPageLoad()
    return response
  }

  sectionTitle(name: string): Locator {
    return this.page.getByRole('heading', { level: 2, name })
  }

  personName(name: string): Locator {
    return this.page.getByRole('heading', { level: 3, name })
  }

  meta(name: string): Locator {
    return this.page.locator(`meta[name="${name}"]`)
  }

  metaProperty(property: string): Locator {
    return this.page.locator(`meta[property="${property}"]`)
  }

  canonical(): Locator {
    return this.page.locator('link[rel="canonical"]')
  }
}
