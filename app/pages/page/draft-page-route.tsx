import type { QueryResponseInitial } from "@sanity/react-loader"
import { useEffect, useMemo } from "react"
import { type LiveClientConfig, useQuery } from "~/business/cms/live-loader"
import type { Page } from "~/business/cms/page.schema"
import {
  draftPagesSchema,
  findPage,
  resolvePagesSnapshot,
} from "~/business/cms/resolve-snapshot"

type DraftPageRouteProps = {
  initial: QueryResponseInitial<unknown>
  query: string
  params: Record<string, never>
  clientConfig: LiveClientConfig
  address: string
  onPage: (page: Page | null) => void
}

export function DraftPageRoute({
  initial,
  query,
  params,
  clientConfig,
  address,
  onPage,
}: DraftPageRouteProps) {
  const { data } = useQuery<unknown>(query, params, { initial })

  const page = useMemo(() => {
    try {
      const { pages } = draftPagesSchema.parse(data)
      const snapshot = resolvePagesSnapshot(pages, clientConfig, "draft")
      return findPage(snapshot, address) ?? null
    } catch {
      return null
    }
  }, [data, clientConfig, address])

  useEffect(() => {
    onPage(page)
  }, [page, onPage])

  return null
}
