import { createImageUrlBuilder } from "@sanity/image-url"
import { zod } from "~/lib/helpers/zod"
import {
  type HomepageContent,
  type HomepageDocument,
  homepageDocumentSchema,
} from "./homepage-content.schema"
import { homepageQuery } from "./homepage-query"
import { createSanityClient } from "./sanity-client.server"

const PHOTO_SIZE = 320

type HomepageClient = {
  fetch(query: string): Promise<unknown>
  config(): { projectId?: string; dataset?: string }
}

export async function getHomepageContent(
  client: HomepageClient = createSanityClient(),
): Promise<HomepageContent> {
  const response = await client.fetch(homepageQuery)
  if (response === null) {
    throw new Error("No published homepage document found in Sanity")
  }

  const result = homepageDocumentSchema.safeParse(response)
  if (!result.success) {
    throw new Error(
      `Homepage content failed validation:\n${zod.prettifyError(result.error)}`,
      { cause: result.error },
    )
  }

  return resolveImages(result.data, client)
}

function resolveImages(
  document: HomepageDocument,
  client: HomepageClient,
): HomepageContent {
  const { projectId, dataset } = client.config()
  const builder = createImageUrlBuilder({
    clientConfig: { projectId, dataset },
  })

  return {
    ...document,
    founders: {
      ...document.founders,
      people: document.founders.people.map((person) => ({
        ...person,
        photo: {
          url: builder
            .image(person.photo)
            .width(PHOTO_SIZE)
            .height(PHOTO_SIZE)
            .fit("crop")
            .auto("format")
            .url(),
          alt: person.photo.alt,
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
        },
      })),
    },
  }
}
