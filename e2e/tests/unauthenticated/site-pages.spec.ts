import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { errorsCopy } from '../../../app/copy/errors'
import { SitePage } from '../../pages/SitePage'

type FixturePage = {
  title: string
  address: string
  header: { title: string; intro?: string }[]
  sections: { _type: string; title?: string; people?: { name: string }[] }[]
  seo: { description: string }
}

// Read rather than imported, for the reason given in mocks/sanity-mock-server.ts.
const pages = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'pages-snapshot.json'), 'utf8'),
) as FixturePage[]

function fixturePage(address: string): FixturePage {
  const page = pages.find((candidate) => candidate.address === address)
  if (!page) throw new Error(`The fixture has no Page at ${address}`)
  return page
}

test.describe('Pages from Sanity', () => {
  test('a nested Page renders its Page Header and its Sections', async ({ page }) => {
    const team = fixturePage('/sobre/equipe')
    const [founders] = team.sections
    const sitePage = new SitePage(page)

    const response = await sitePage.goto(team.address)

    expect(response?.status()).toBe(200)
    await expect(sitePage.title).toHaveText(team.header[0].title)
    await expect(sitePage.sectionTitle(founders.title ?? '')).toBeVisible()
    for (const person of founders.people ?? []) {
      await expect(sitePage.personName(person.name)).toBeVisible()
    }
  })

  test('a Page with a Title renders its introduction', async ({ page }) => {
    const about = fixturePage('/sobre')
    const sitePage = new SitePage(page)

    await sitePage.goto(about.address)

    await expect(sitePage.title).toHaveText(about.header[0].title)
    await expect(page.getByText(about.header[0].intro ?? '')).toBeVisible()
  })

  test('a Page carries its SEO meta', async ({ page }) => {
    const team = fixturePage('/sobre/equipe')
    const sitePage = new SitePage(page)

    await sitePage.goto(team.address)

    await expect(page).toHaveTitle(`${team.title} | Positiv Party`)
    await expect(sitePage.meta('description')).toHaveAttribute('content', team.seo.description)
    await expect(sitePage.metaProperty('og:description')).toHaveAttribute(
      'content',
      team.seo.description,
    )
    await expect(sitePage.canonical()).toHaveAttribute(
      'href',
      'https://www.positivparty.com/sobre/equipe',
    )
    await expect(sitePage.metaProperty('og:url')).toHaveAttribute(
      'content',
      'https://www.positivparty.com/sobre/equipe',
    )
    await expect(sitePage.meta('robots')).toHaveCount(0)
  })

  test('an address no Page has returns 404', async ({ page }) => {
    const sitePage = new SitePage(page)

    const response = await sitePage.goto('/sobre/ninguem')

    expect(response?.status()).toBe(404)
    await expect(sitePage.title).toHaveText(errorsCopy.boundary.notFoundTitle)
    await expect(page.getByText(errorsCopy.boundary.notFound)).toBeVisible()
  })

  test('a missing bundle under /assets returns 404', async ({ request }) => {
    const response = await request.get('/assets/nao-existe.js')

    expect(response.status()).toBe(404)
  })
})
