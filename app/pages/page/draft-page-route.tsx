import type { QueryResponseInitial } from "@sanity/react-loader"
import { type LiveClientConfig, useQuery } from "~/business/cms/live-loader"
import { findPage, resolvePagesSnapshot } from "~/business/cms/resolve-snapshot"
import { zod } from "~/lib/helpers/zod"
import type { Event } from "~types/database/entities.types"
import { PageContent } from "./page-content"

const draftPagesSchema = zod.object({ pages: zod.unknown() })

type DraftPageRouteProps = {
  initial: QueryResponseInitial<unknown>
  query: string
  params: Record<string, never>
  clientConfig: LiveClientConfig
  address: string
  events: Promise<Event[] | undefined> | undefined
  isLoggedIn: boolean
}

export function DraftPageRoute({
  initial,
  query,
  params,
  clientConfig,
  address,
  events,
  isLoggedIn,
}: DraftPageRouteProps) {
  const { data } = useQuery<unknown>(query, params, { initial })

  const { pages } = draftPagesSchema.parse(data)
  const snapshot = resolvePagesSnapshot(pages, clientConfig, "draft")
  const page = findPage(snapshot, address)

  if (!page) return null

  return <PageContent page={page} events={events} isLoggedIn={isLoggedIn} />
}
