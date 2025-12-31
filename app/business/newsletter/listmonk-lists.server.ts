import { composable } from "composable-functions"
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
    if (process.env.E2E_MODE === "true") {
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
    if (!options?.force && process.env.E2E_MODE === "true") {
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
    if (process.env.E2E_MODE === "true") {
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
