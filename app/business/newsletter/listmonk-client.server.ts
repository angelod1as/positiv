import { env } from "~/env.server"

interface AddSubscriberParams {
  email: string
  name: string
  lists: number[]
  attributes: Record<string, unknown>
}

interface ListmonkClient {
  testConnection(): Promise<void>
  addSubscriber(params: AddSubscriberParams): Promise<void>
}

export function createListmonkClient(): ListmonkClient {
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

  return {
    async testConnection(): Promise<void> {
      await fetch(`${listmonkApiUrl}/api/subscribers`, {
        headers,
      })
    },

    async addSubscriber(params: AddSubscriberParams): Promise<void> {
      try {
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
      } catch (error) {
        console.error("Failed to add subscriber", error)
      }
    },
  }
}
