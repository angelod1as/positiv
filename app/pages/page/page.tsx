import { lazy, Suspense } from "react"
import { getContext } from "~/business/auth/auth.server"
import { isDraftModeEnabled } from "~/business/cms/draft-mode.server"
import { loadDraftSnapshotQuery } from "~/business/cms/live-loader.server"
import { isReservedAddress } from "~/business/cms/page.schema"
import type { Page } from "~/business/cms/page.schema"
import { findPage, resolvePagesSnapshot } from "~/business/cms/resolve-snapshot"
import { loadSiteSnapshot } from "~/business/cms/site-snapshot-source.server"
import { metaCopy } from "~/copy/meta"
import { POSITIV_URL } from "~/lib/constants/constants"
import { createMetaArray, createPageTitle } from "~/lib/helpers/meta"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { getNextEvents } from "~/pages/page/fetch/get-next-events"
import { PageContent } from "./page-content"
import type { Route } from "./+types/page"

const DraftPageRoute = lazy(() =>
  import("./draft-page-route").then((module) => ({
    default: module.DraftPageRoute,
  })),
)

const SITE_URL = POSITIV_URL.replace(/\/$/, "")
const HOMEPAGE_ADDRESS = "/"

const draftPagesSchema = zod.object({ pages: zod.unknown() })

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

async function loadSnapshot(request: Request) {
  try {
    return (await loadSiteSnapshot(request)).pages
  } catch (error) {
    logger.error("Could not load the Pages", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Response(null, { status: 503 })
  }
}

function pageOr5xx(page: Page | undefined, address: string): Page {
  if (!page && address === HOMEPAGE_ADDRESS) {
    logger.error("There is no Page at /, so the Homepage is down")
    throw new Response(null, { status: 503 })
  }
  if (!page) {
    throw notFound()
  }
  return page
}

function eventsFor(page: Page, profileId: string | undefined) {
  const nextEvents = page.sections.find(
    (section) => section._type === "nextEvents",
  )
  return nextEvents ? loadEvents(profileId, nextEvents.count) : undefined
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const address = `/${params["*"] ?? ""}`
  if (isReservedAddress(address)) {
    throw notFound()
  }

  if (await isDraftModeEnabled(request)) {
    const [{ currentUser, currentProfile }, draft] = await Promise.all([
      getContext(request, params),
      loadDraftSnapshotQuery(request),
    ])

    const { pages } = draftPagesSchema.parse(draft.initial.data)
    const snapshot = resolvePagesSnapshot(pages, draft.clientConfig, "draft")
    const page = pageOr5xx(findPage(snapshot, address), address)

    return {
      draftMode: true as const,
      page,
      initial: draft.initial,
      query: draft.query,
      params: draft.params,
      clientConfig: draft.clientConfig,
      address,
      events: eventsFor(page, currentProfile?.id),
      isLoggedIn: !!currentUser?.id,
    }
  }

  const [{ currentUser, currentProfile }, snapshot] = await Promise.all([
    getContext(request, params),
    loadSnapshot(request),
  ])

  const page = pageOr5xx(findPage(snapshot, address), address)

  return {
    draftMode: false as const,
    page,
    events: eventsFor(page, currentProfile?.id),
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

  if (loaderData.draftMode) {
    return (
      <Suspense
        fallback={
          <PageContent page={page} events={events} isLoggedIn={isLoggedIn} />
        }
      >
        <DraftPageRoute
          initial={loaderData.initial}
          query={loaderData.query}
          params={loaderData.params}
          clientConfig={loaderData.clientConfig}
          address={loaderData.address}
          events={events}
          isLoggedIn={isLoggedIn}
        />
      </Suspense>
    )
  }

  return <PageContent page={page} events={events} isLoggedIn={isLoggedIn} />
}
