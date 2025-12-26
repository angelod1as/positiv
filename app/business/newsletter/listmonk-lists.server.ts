import { composable } from "composable-functions"
import { env } from "~/env.server"

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

function getListmonkConfig() {
  const { listmonkApiUrl, listmonkApiUsername, listmonkApiPassword } = env()

  if (!listmonkApiUrl || !listmonkApiUsername || !listmonkApiPassword) {
    throw new Error("Listmonk API credentials not configured")
  }

  const basicAuthHeader = `Basic ${Buffer.from(
    `${listmonkApiUsername}:${listmonkApiPassword}`
  ).toString("base64")}`

  const headers = {
    Authorization: basicAuthHeader,
    "Content-Type": "application/json",
  }

  return { listmonkApiUrl, headers }
}

export const createList = composable(
  async (params: CreateListParams): Promise<ListmonkList> => {
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

export const deleteList = composable(async (listId: number): Promise<void> => {
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
