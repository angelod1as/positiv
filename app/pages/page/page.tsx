import { getContext } from "~/business/auth/auth.server"
import { isReservedAddress } from "~/business/cms/page.schema"
import { pagesSnapshotCache } from "~/business/cms/pages-snapshot-cache.server"
import { findPage } from "~/business/cms/pages-snapshot.server"
import { FloatingWhatsAppButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { PageHeader } from "~/components/pages/page/header/page-header"
import { PageSections } from "~/components/pages/page/sections/page-sections"
import { metaCopy } from "~/copy/meta"
import { POSITIV_URL } from "~/lib/constants/constants"
import { createMetaArray, createPageTitle } from "~/lib/helpers/meta"
import { logger } from "~/lib/logger/logger.server"
import { getNextEvents } from "~/pages/homepage/fetch/get-next-events"
import type { Route } from "./+types/page"

const SITE_URL = POSITIV_URL.replace(/\/$/, "")
const HOMEPAGE_ADDRESS = "/"

function notFound() {
  return new Response(null, { status: 404 })
}

async function loadEvents(profileId: string | undefined, count: number) {
  const result = await getNextEvents(profileId, count, true)

  if (!result.success) {
    return undefined
  }

  return result.data
}

async function loadSnapshot() {
  try {
    return await pagesSnapshotCache.get()
  } catch (error) {
    logger.error("Could not load the Pages", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Response(null, { status: 503 })
  }
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const address = `/${params["*"] ?? ""}`
  if (isReservedAddress(address)) {
    throw notFound()
  }

  const [{ currentUser, currentProfile }, snapshot] = await Promise.all([
    getContext(request, params),
    loadSnapshot(),
  ])

  const page = findPage(snapshot, address)
  if (!page && address === HOMEPAGE_ADDRESS) {
    logger.error("There is no Page at /, so the Homepage is down")
    throw new Response(null, { status: 503 })
  }
  if (!page) {
    throw notFound()
  }

  const nextEvents = page.sections.find(
    (section) => section._type === "nextEvents",
  )

  return {
    page,
    events: nextEvents
      ? loadEvents(currentProfile?.id, nextEvents.count)
      : undefined,
    isLoggedIn: !!currentUser?.id,
  }
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [
      ...createMetaArray(metaCopy.root.title),
      { name: "description", content: metaCopy.root.description },
    ]
  }

  const { seo, address } = data.page
  const title = createPageTitle(
    seo.title ??
      (address === HOMEPAGE_ADDRESS ? metaCopy.root.title : data.page.title),
  )
  const url = `${SITE_URL}${address}`

  return [
    { title },
    { name: "description", content: seo.description },
    { property: "og:title", content: title },
    { property: "og:description", content: seo.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    {
      property: "og:image",
      content: seo.image?.url ?? `${SITE_URL}/social.jpg`,
    },
    ...(seo.image
      ? [{ property: "og:image:alt", content: seo.image.alt }]
      : []),
    { tagName: "link", rel: "canonical", href: url },
    ...(seo.noIndex ? [{ name: "robots", content: "noindex" }] : []),
  ]
}

export default function PageRoute({ loaderData }: Route.ComponentProps) {
  const { page, events, isLoggedIn } = loaderData

  return (
    <>
      <div>
        <PageHeader header={page.header} />
        <PageSections
          sections={page.sections}
          events={events}
          isLoggedIn={isLoggedIn}
        />
      </div>
      {page.address === HOMEPAGE_ADDRESS && <FloatingWhatsAppButton />}
    </>
  )
}
