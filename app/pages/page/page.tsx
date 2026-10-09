import { lazy, Suspense, useCallback, useState } from "react"
import { getContext } from "~/business/auth/auth.server"
import { isDraftModeEnabled } from "~/business/cms/draft-mode.server"
import { loadDraftSnapshotQuery } from "~/business/cms/live-loader.server"
import { isReservedAddress } from "~/business/cms/page.schema"
import type { Page } from "~/business/cms/page.schema"
import {
  draftPagesSchema,
  findPage,
  resolvePagesSnapshot,
} from "~/business/cms/resolve-snapshot"
import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import { metaCopy } from "~/copy/meta"
import { POSITIV_URL } from "~/lib/constants/constants"
import { createMetaArray, createPageTitle } from "~/lib/helpers/meta"
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

async function loadPublishedSnapshot() {
  try {
    return (await siteSnapshotCache.get()).pages
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
      loadDraftSnapshotQuery(request).catch((error) => {
        logger.error("Could not load the draft snapshot", {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }),
    ])

    let draftPages: ReturnType<typeof resolvePagesSnapshot> | null = null
    if (draft) {
      try {
        const { pages } = draftPagesSchema.parse(draft.initial.data)
        draftPages = resolvePagesSnapshot(pages, draft.clientConfig, "draft")
      } catch (error) {
        logger.error("Could not resolve the draft Pages", {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (draft && draftPages) {
      const page = pageOr5xx(findPage(draftPages, address), address)

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

    // The draft read failed (e.g. over quota) or its data would not resolve —
    // degrade to the published snapshot rather than turning the route into a
    // 500.
    const snapshot = await loadPublishedSnapshot()
    const page = pageOr5xx(findPage(snapshot, address), address)

    return {
      draftMode: false as const,
      page,
      events: eventsFor(page, currentProfile?.id),
      isLoggedIn: !!currentUser?.id,
    }
  }

  const [{ currentUser, currentProfile }, snapshot] = await Promise.all([
    getContext(request, params),
    loadPublishedSnapshot(),
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
  const address = loaderData.draftMode ? loaderData.address : undefined

  // Live Page held per address: a null result keeps the last good one, and a
  // value from another address is ignored, so navigating never shows a stale
  // Page. Fixed tree position keeps loading the live chunk from remounting it.
  const [live, setLive] = useState<{ address: string; page: Page } | null>(null)

  // Stable so DraftPageRoute's effect fires when the live Page changes, not on
  // every commit — a fresh onPage each render would spin setLive endlessly.
  const onPage = useCallback(
    (next: Page | null) => {
      if (next && address) setLive({ address, page: next })
    },
    [address],
  )

  if (!loaderData.draftMode) {
    return <PageContent page={page} events={events} isLoggedIn={isLoggedIn} />
  }

  const activePage =
    live && live.address === loaderData.address ? live.page : page

  return (
    <>
      <PageContent page={activePage} events={events} isLoggedIn={isLoggedIn} />
      <Suspense fallback={null}>
        <DraftPageRoute
          initial={loaderData.initial}
          query={loaderData.query}
          params={loaderData.params}
          clientConfig={loaderData.clientConfig}
          address={loaderData.address}
          onPage={onPage}
        />
      </Suspense>
    </>
  )
}
