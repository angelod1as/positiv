import { env } from "~/env.server"

interface ListmonkClient {
  testConnection(): Promise<void>
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
  }
}
