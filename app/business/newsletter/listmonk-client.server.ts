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
  const escapedEmail = email.replace(/'/g, "''")

  const url = `${listmonkApiUrl}/api/subscribers?query=subscribers.email='${escapedEmail}'`

  console.info("[Listmonk Debug] Request URL:", url)
  console.info("[Listmonk Debug] Request Headers:", JSON.stringify(headers, null, 2))

  const response = await fetch(url, {
    method: "GET",
    headers,
  })

  console.info("[Listmonk Debug] Response Status:", response.status, response.statusText)

  if (!response.ok) {
    const responseText = await response.text()
    console.error("[Listmonk Debug] Error Response Body:", responseText)
    throw new Error(
      `Failed to query subscriber: ${response.status} ${response.statusText}. Response: ${responseText}`
    )
  }

  const data = (await response.json()) as ListmonkSearchResponse
  const subscribers = data.data.results

  console.info("[Listmonk Debug] Found subscribers:", subscribers.length)

  return subscribers.length > 0 ? subscribers[0] : null
}

async function updateSubscriberAttributes(
  id: number,
  name: string,
  attributes: Record<string, unknown>,
  existingLists: number[],
  existingAttribs?: Record<string, unknown>
): Promise<void> {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const mergedAttribs = { ...(existingAttribs ?? {}), ...attributes }

  const response = await fetch(`${listmonkApiUrl}/api/subscribers/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name,
      attribs: mergedAttribs,
      lists: existingLists,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to update subscriber: ${response.status} ${response.statusText}`
    )
  }
}

export const addSubscriber = composable(
  async (params: AddSubscriberParams): Promise<void> => {
    const existingSubscriber = await getSubscriberByEmail(params.email)

    if (existingSubscriber) {
      const existingListIds = existingSubscriber.lists.map((list) => list.id)
      const allListIds = [...new Set([...existingListIds, ...params.lists])]

      await updateSubscriberAttributes(
        existingSubscriber.id,
        params.name,
        params.attributes,
        allListIds,
        existingSubscriber.attribs
      )
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
        throw new Error(
          `Failed to add subscriber: ${response.status} ${response.statusText}`
        )
      }
    }
  }
)

export const removeSubscriber = composable(async (id: number): Promise<void> => {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const response = await fetch(
    `${listmonkApiUrl}/api/subscribers/${id}/blocklist`,
    {
      method: "PUT",
      headers,
    }
  )

  if (!response.ok) {
    console.error(
      `Failed to remove subscriber: ${response.status} ${response.statusText}`
    )
  }
})

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
