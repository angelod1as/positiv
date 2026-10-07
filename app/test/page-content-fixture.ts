import fixture from "../../e2e/fixtures/page-content.json"
import {
  type PageContent,
  pageContentSchema,
} from "~/business/cms/content.schema"

export const pageContentFixture: PageContent =
  pageContentSchema.parse({
    ...fixture,
    founders: {
      ...fixture.founders,
      people: fixture.founders.people.map((person) => ({
        ...person,
        photo: {
          url: `https://cdn.sanity.io/images/test/development/${person._id}.jpg`,
          alt: person.photo.alt,
          width: 320,
          height: 320,
        },
      })),
    },
  })
