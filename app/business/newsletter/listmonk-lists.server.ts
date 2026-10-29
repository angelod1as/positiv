import { composable } from "composable-functions"
import { ENV } from "varlock/env"
import { getListmonkConfig } from "./listmonk-client.server"

export interface ListmonkList {
  id: number
  uuid: string
  name: string
  type: "private" | "public"
  optin: "single" | "double"
  tags: string[]
  subscriber_count: number
  created_at: string
  updated_at: string
}

export interface CreateListParams {
  name: string
  type: "private" | "public"
  optin: "single" | "double"
  description?: string
  tags?: string[]
}

export const createList = composable(
  async (params: CreateListParams): Promise<ListmonkList> => {
    if (ENV.E2E_MODE) {
      return {
        id: -1,
        uuid: "e2e-mock-uuid",
        name: params.name,
        type: params.type,
        optin: params.optin,
        tags: params.tags || [],
        subscriber_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    const { listmonkApiUrl, headers } = getListmonkConfig()

    const body: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      optin: params.optin,
    }

    if (params.description) {
      body.description = params.description
    }

    if (params.tags) {
      body.tags = params.tags
    }

    const response = await fetch(`${listmonkApiUrl}/api/lists`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(
        `Failed to create list: ${response.status} ${response.statusText}. Response: ${errorBody}`
      )
    }

    const data = (await response.json()) as { data: ListmonkList }
    return data.data
  }
)

export const deleteList = composable(
  async (listId: number, options?: { force?: boolean }): Promise<void> => {
    if (!options?.force && ENV.E2E_MODE) {
      return
    }

    const { listmonkApiUrl, headers } = getListmonkConfig()

  const response = await fetch(`${listmonkApiUrl}/api/lists/${listId}`, {
    method: "DELETE",
    headers,
  })

  if (response.status === 404) {
    return
  }

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => "Unable to read error body")
    throw new Error(
      `Failed to delete list: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }
})

export const getListById = composable(
  async (listId: number): Promise<ListmonkList | null> => {
    if (ENV.E2E_MODE) {
      return null
    }

    const { listmonkApiUrl, headers } = getListmonkConfig()

    const response = await fetch(`${listmonkApiUrl}/api/lists/${listId}`, {
      method: "GET",
      headers,
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(
        `Failed to get list: ${response.status} ${response.statusText}. Response: ${errorBody}`
      )
    }

    const data = (await response.json()) as { data: ListmonkList }
    return data.data
  }
)

export interface ListSubscriber {
  id: number
  email: string
  name: string
  status: string
  updated_at: string
  lists: Array<{
    id: number
    subscription_status: string
    subscription_updated_at: string
  }>
}

interface ListSubscribersResponse {
  data: {
    results: ListSubscriber[]
    total: number
    page: number
    per_page: number
  }
}

async function readSubscribers(
  sqlQuery: string,
  description: string,
): Promise<ListSubscriber[]> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const allSubscribers: ListSubscriber[] = []
  let page = 1
  const perPage = 100
  let hasMore = true
  let reportedTotal = 0
  const query = encodeURIComponent(sqlQuery)

  while (hasMore) {
    const response = await fetch(
      `${listmonkApiUrl}/api/subscribers?query=${query}&page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers,
      }
    )

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body")
      throw new Error(
        `Failed to get ${description}: ${response.status} ${response.statusText}. Response: ${errorBody}`
      )
    }

    const data = (await response.json()) as ListSubscribersResponse
    const results = data.data.results || []
    allSubscribers.push(...results)
    reportedTotal = data.data.total ?? 0

    hasMore = results.length === perPage
    page++
  }

  if (allSubscribers.length < reportedTotal) {
    throw new Error(
      `Incomplete read of ${description}: got ${allSubscribers.length} of ${reportedTotal} subscribers`,
    )
  }

  return allSubscribers
}

export const getListSubscribers = composable(
  async (
    listId: number,
    membership: "active" | "unsubscribed" = "active",
  ): Promise<ListSubscriber[]> => {
    if (ENV.E2E_MODE) {
      return []
    }

    const statusCondition =
      membership === "unsubscribed"
        ? "status = 'unsubscribed'"
        : "status != 'unsubscribed'"

    return await readSubscribers(
      `subscribers.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id = ${listId} AND ${statusCondition})`,
      `list ${listId}`,
    )
  }
)

export const getBlocklistedSubscribers = composable(
  async (): Promise<ListSubscriber[]> => {
    if (ENV.E2E_MODE) {
      return []
    }

    return await readSubscribers(
      "subscribers.status = 'blocklisted'",
      "blocklisted subscribers",
    )
  }
)
