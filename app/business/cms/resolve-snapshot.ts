import { createImageUrlBuilder } from "@sanity/image-url"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import type { PageImage } from "./content.schema"
import {
  type Page,
  type PageDocument,
  type PageHeader,
  type PageSection,
  draftPageShellSchema,
  pageDocumentSchema,
  pageHeaderSchema,
  pageSectionDocumentSchema,
} from "./page.schema"
import { type SiteSettings, siteSettingsSchema } from "./site-settings.schema"

const PHOTO_SIZE = 320
const IMAGE_MAX_WIDTH = 1600
const SHARING_IMAGE = { width: 1200, height: 630 }

export type PagesSnapshot = ReadonlyMap<string, Page>

export type ClientConfig = { projectId?: string; dataset?: string }

export type SnapshotMode = "published" | "draft"

type ImageUrlBuilder = ReturnType<typeof createImageUrlBuilder>
type SectionDocument = PageDocument["sections"][number]
type ImageDocument = Extract<
  SectionDocument,
  { _type: "imageSection" }
>["image"]

export function resolvePagesSnapshot(
  documents: unknown,
  { projectId, dataset }: ClientConfig,
  mode: SnapshotMode = "published",
): PagesSnapshot {
  const response = zod.array(zod.unknown()).parse(documents)
  const builder = createImageUrlBuilder({
    clientConfig: { projectId, dataset },
  })

  const snapshot = new Map<string, Page>()
  const failures: string[] = []

  for (const document of response) {
    if (mode === "draft") {
      const resolved = resolveDraftPage(document, builder)
      if (!resolved) {
        console.warn(
          `Draft Page dropped, its address is unusable: ${describe(document)}`,
        )
      } else if (snapshot.has(resolved.address)) {
        console.warn(
          `Draft Page dropped, another Page has its address: ${describe(document)}`,
        )
      } else {
        snapshot.set(resolved.address, resolved)
      }
      continue
    }

    const result = pageDocumentSchema.safeParse(document)
    if (!result.success) {
      failures.push(
        `${describe(document)}:\n${zod.prettifyError(result.error)}`,
      )
      continue
    }
    if (snapshot.has(result.data.address)) {
      failures.push(`${describe(document)}: another Page has this address`)
      continue
    }
    snapshot.set(result.data.address, resolvePage(result.data, builder))
  }

  if (failures.length > 0) {
    throw new Error(
      `Pages failed validation, so none are served:\n${failures.join("\n")}`,
    )
  }

  return snapshot
}

export function findPage(
  snapshot: PagesSnapshot,
  address: string,
): Page | undefined {
  return snapshot.get(address.length > 1 ? address.replace(/\/$/, "") : address)
}

export function resolveSiteSettings(document: unknown): SiteSettings | null {
  if (document === null || document === undefined) return null

  const result = siteSettingsSchema.safeParse(document)
  if (!result.success) {
    throw new Error(
      `Site Settings failed validation, so the snapshot is not served:\n${zod.prettifyError(result.error)}`,
    )
  }
  return result.data
}

function describe(document: unknown) {
  const { _id, address } = zod
    .object({ _id: zod.unknown(), address: zod.unknown() })
    .partial()
    .parse(document ?? {})
  return `${String(_id)} (${String(address)})`
}

function resolvePage(document: PageDocument, builder: ImageUrlBuilder): Page {
  return {
    ...document,
    header: document.header[0],
    sections: document.sections.map((section) =>
      resolveSection(section, builder),
    ),
    seo: resolveSeo(document.seo, builder),
  }
}

function resolveDraftPage(
  document: unknown,
  builder: ImageUrlBuilder,
): Page | null {
  const shell = draftPageShellSchema.safeParse(document)
  if (!shell.success) return null

  const { header, sections, seo, ...rest } = shell.data
  return {
    ...rest,
    header: resolveDraftHeader(header),
    sections: sections.map((section, index) =>
      resolveDraftSection(section, index, builder),
    ),
    seo: resolveSeo(seo, builder),
  }
}

function resolveDraftHeader(header: unknown[]): PageHeader {
  const result = pageHeaderSchema.safeParse(header[0])
  if (result.success) return result.data
  return { _type: "placeholder", missing: missingFields(result.error) }
}

function resolveDraftSection(
  section: unknown,
  index: number,
  builder: ImageUrlBuilder,
): PageSection {
  const result = pageSectionDocumentSchema.safeParse(section)
  if (result.success) return resolveSection(result.data, builder)
  return {
    _type: "placeholder",
    _key: keyOf(section, index),
    missing: missingFields(result.error),
  }
}

function keyOf(section: unknown, index: number): string {
  const result = zod.object({ _key: zod.string() }).safeParse(section)
  return result.success ? result.data._key : `placeholder-${index}`
}

function missingFields(error: z.ZodError): string[] {
  const fields = new Set<string>()
  for (const issue of error.issues) {
    const [first] = issue.path
    if (typeof first === "string") fields.add(first)
  }
  return [...fields]
}

function resolveSeo(
  seo: PageDocument["seo"],
  builder: ImageUrlBuilder,
): Page["seo"] {
  const { image, ...rest } = seo

  return {
    ...rest,
    image: image
      ? {
          url: builder
            .image(image)
            .width(SHARING_IMAGE.width)
            .height(SHARING_IMAGE.height)
            .fit("crop")
            .auto("format")
            .url(),
          alt: image.alt,
          ...SHARING_IMAGE,
        }
      : image,
  }
}

function resolveSection(
  section: SectionDocument,
  builder: ImageUrlBuilder,
): Page["sections"][number] {
  switch (section._type) {
    case "founders":
      return {
        ...section,
        people: section.people.map((person) => ({
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
      }
    case "imageSection":
      return { ...section, image: resolveImage(section.image, builder) }
    default:
      return section
  }
}

function resolveImage(
  image: ImageDocument,
  builder: ImageUrlBuilder,
): PageImage {
  const crop = image.crop ?? { top: 0, bottom: 0, left: 0, right: 0 }
  const croppedWidth = image.dimensions.width * (1 - crop.left - crop.right)
  const croppedHeight = image.dimensions.height * (1 - crop.top - crop.bottom)
  const width = Math.round(Math.min(IMAGE_MAX_WIDTH, croppedWidth))

  return {
    url: builder.image(image).width(width).fit("max").auto("format").url(),
    alt: image.alt,
    width,
    height: Math.round((width * croppedHeight) / croppedWidth),
  }
}
