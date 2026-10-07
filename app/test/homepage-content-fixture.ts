import fixture from "../../e2e/fixtures/homepage-content.json"
import {
  type HomepageContent,
  homepageContentSchema,
} from "~/business/cms/content.schema"

export const homepageContentFixture: HomepageContent =
  homepageContentSchema.parse({
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
