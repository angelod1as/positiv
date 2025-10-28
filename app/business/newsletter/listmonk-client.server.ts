import { composable } from "composable-functions"
import { env } from "~/env.server"

interface AddSubscriberParams {
  email: string
  name: string
  lists: number[]
  attributes: Record<string, unknown>
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

export const addSubscriber = composable(
  async (params: AddSubscriberParams): Promise<void> => {
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
      console.error(
        `Failed to add subscriber: ${response.status} ${response.statusText}`
      )
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
