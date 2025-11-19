import { composable } from "composable-functions"
import { env } from "~/env.server"

interface AddSubscriberParams {
  email: string
  name: string
  lists: number[]
  attributes: Record<string, unknown>
}

interface ListmonkSubscriber {
  id: number
  email: string
  name: string
  lists: Array<{ id: number }>
  attribs: Record<string, unknown>
}

interface ListmonkSearchResponse {
  data: {
    results: ListmonkSubscriber[]
  }
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

export const testConnection = composable(async (): Promise<void> => {
  const { listmonkApiUrl, headers } = getListmonkConfig()
  await fetch(`${listmonkApiUrl}/api/subscribers`, { headers })
})

async function getSubscriberByEmail(
  email: string
): Promise<ListmonkSubscriber | null> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const sanitizedEmail = email
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")

  const queryParam = `subscribers.email ILIKE '${sanitizedEmail}' ESCAPE '\\'`
  const encodedQuery = encodeURIComponent(queryParam)

  const response = await fetch(
    `${listmonkApiUrl}/api/subscribers?query=${encodedQuery}`,
    {
      method: "GET",
      headers,
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to query subscriber: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }

  const data = (await response.json()) as ListmonkSearchResponse
  const subscribers = data.data.results

  return subscribers.length > 0 ? subscribers[0] : null
}

async function addSubscriberToLists(
  subscriberId: number,
  listIds: number[]
): Promise<void> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const uniqueIds = Array.from(
    new Set(listIds.filter((id) => Number.isInteger(id) && id > 0))
  )

  if (uniqueIds.length === 0) {
    return
  }

  const response = await fetch(`${listmonkApiUrl}/api/subscribers/lists`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ids: [subscriberId],
      action: "add",
      target_list_ids: uniqueIds,
      status: "confirmed",
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to add subscriber to lists: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }
}

async function updateSubscriberAttributes(
  id: number,
  email: string,
  name: string,
  attributes: Record<string, unknown>,
  existingAttribs?: Record<string, unknown>
): Promise<void> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const mergedAttribs = { ...(existingAttribs ?? {}), ...attributes }

  const response = await fetch(`${listmonkApiUrl}/api/subscribers/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      email,
      name,
      attribs: mergedAttribs,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to update subscriber: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }
}

export const addSubscriber = composable(
  async (params: AddSubscriberParams): Promise<void> => {
    if (process.env.E2E_MODE === "true") {
      return
    }

    const existingSubscriber = await getSubscriberByEmail(params.email)

    if (existingSubscriber) {
      await updateSubscriberAttributes(
        existingSubscriber.id,
        params.email,
        params.name,
        params.attributes,
        existingSubscriber.attribs
      )

      const existingListIds = existingSubscriber.lists.map((list) => list.id)
      const allListIds = [...new Set([...existingListIds, ...params.lists])]

      await addSubscriberToLists(existingSubscriber.id, allListIds)
    } else {
      const { listmonkApiUrl, headers } = getListmonkConfig()

      const response = await fetch(`${listmonkApiUrl}/api/subscribers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: params.email,
          name: params.name,
          lists: params.lists,
          attribs: params.attributes,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unable to read error body")
        throw new Error(
          `Failed to add subscriber: ${response.status} ${response.statusText}. Response: ${errorBody}`
        )
      }
    }
  }
)

export const removeSubscriber = composable(
  async (email: string): Promise<void> => {
    if (process.env.E2E_MODE === "true") {
      return
    }

    const existingSubscriber = await getSubscriberByEmail(email)

    if (!existingSubscriber) {
      return
    }

    const listIds = existingSubscriber.lists.map((list) => list.id)

    if (listIds.length === 0) {
      return
    }

    const { listmonkApiUrl, headers } = getListmonkConfig()

    const response = await fetch(`${listmonkApiUrl}/api/subscribers/lists`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        ids: [existingSubscriber.id],
        action: "remove",
        target_list_ids: listIds,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unable to read error body")
      throw new Error(
        `Failed to remove subscriber from lists: ${response.status} ${response.statusText}. Response: ${errorBody}`
      )
    }
  }
)

export const createCampaign = composable(
  async (data: Record<string, unknown>): Promise<void> => {
    const { listmonkApiUrl, headers } = getListmonkConfig()

    const response = await fetch(`${listmonkApiUrl}/api/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.error(
        `Failed to create campaign: ${response.status} ${response.statusText}`
      )
    }
  }
)

export const updateCampaignStatus = composable(
  async (id: number, status: string): Promise<void> => {
    const { listmonkApiUrl, headers } = getListmonkConfig()

    const response = await fetch(
      `${listmonkApiUrl}/api/campaigns/${id}/status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      }
    )

    if (!response.ok) {
      console.error(
        `Failed to update campaign status: ${response.status} ${response.statusText}`
      )
    }
  }
)
