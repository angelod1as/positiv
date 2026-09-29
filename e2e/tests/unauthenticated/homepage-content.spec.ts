import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HomePage } from '../../pages/HomePage'

// Read rather than imported, for the reason given in mocks/sanity-mock-server.ts.
const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'homepage-content.json'), 'utf8'),
) as {
  hero: { title: string }
  testimonials: { quotes: { author: string }[] }
  founders: { people: { name: string; photo: { alt: string } }[] }
}

test.describe('Homepage content from Sanity', () => {
  test('renders the Editor content served by the Sanity mock', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(homePage.heroTitle).toHaveText(fixture.hero.title)

    const [firstQuote] = fixture.testimonials.quotes
    await expect(homePage.testimonialAuthor(firstQuote.author)).toBeVisible()

    expect(fixture.founders.people).toHaveLength(2)
    for (const person of fixture.founders.people) {
      await expect(homePage.founderName(person.name)).toBeVisible()
      await expect(homePage.founderPhoto(person.photo.alt)).toHaveAttribute(
        'src',
        /^https:\/\/cdn\.sanity\.io\/images\//,
      )
    }
  })
})
