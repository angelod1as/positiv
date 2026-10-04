import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HomePage } from '../../pages/HomePage'

type FixturePage = {
  address: string
  header: { title: string }[]
  sections: {
    _type: string
    quotes?: { author: string }[]
    people?: { name: string; photo: { alt: string } }[]
  }[]
  seo: { description: string }
}

// Read rather than imported, for the reason given in mocks/sanity-mock-server.ts.
const pages = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'pages-snapshot.json'), 'utf8'),
) as FixturePage[]

function homepageSection(type: string) {
  const homepage = pages.find((page) => page.address === '/')
  const section = homepage?.sections.find((candidate) => candidate._type === type)
  if (!homepage || !section) throw new Error(`The fixture's Page at / has no ${type}`)
  return { homepage, section }
}

test.describe('Homepage content from Sanity', () => {
  test('renders the Page at / served by the Sanity mock', async ({ page }) => {
    const { homepage, section: testimonials } = homepageSection('testimonials')
    const { section: founders } = homepageSection('founders')
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(homePage.heroTitle).toHaveText(homepage.header[0].title)

    const [firstQuote] = testimonials.quotes ?? []
    await expect(homePage.testimonialAuthor(firstQuote.author)).toBeVisible()

    expect(founders.people).toHaveLength(2)
    for (const person of founders.people ?? []) {
      await expect(homePage.founderName(person.name)).toBeVisible()
      await expect(homePage.founderPhoto(person.photo.alt)).toHaveAttribute(
        'src',
        /^https:\/\/cdn\.sanity\.io\/images\//,
      )
    }
    await expect(homePage.whatsAppButton).toBeVisible()
  })

  test('takes its SEO meta from the Page at /', async ({ page }) => {
    const { homepage } = homepageSection('testimonials')
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(page).toHaveTitle('Positiv Party')
    await expect(homePage.description).toHaveAttribute('content', homepage.seo.description)
    await expect(homePage.canonical).toHaveAttribute('href', 'https://www.positivparty.com/')
  })
})
