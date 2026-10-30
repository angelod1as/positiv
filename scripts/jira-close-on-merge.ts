import { fileURLToPath } from "node:url"

const DONE_STATUS = "Done"

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

type Transition = { id: string; to: { name: string } }

type Connection = {
  apiBase: string | undefined
  authorization: string | undefined
  fetcher?: Fetcher
}

export function keysIn(title: string) {
  return [...new Set(title.match(/\bWEB-\d+\b/g) ?? [])]
}

async function closeTicket(
  key: string,
  { apiBase, authorization, fetcher = fetch }: Connection,
) {
  const url = `${apiBase}/rest/api/3/issue/${key}/transitions`
  const headers = { Authorization: authorization ?? "" }

  const list = await fetcher(url, { headers })
  if (list.status !== 200) {
    throw new Error(`Listing transitions for ${key} returned HTTP ${list.status}`)
  }

  const { transitions } = (await list.json()) as { transitions: Transition[] }
  const done = transitions.find(({ to }) => to.name === DONE_STATUS)
  if (!done) {
    throw new Error(`No transition to ${DONE_STATUS} for ${key}`)
  }

  const move = await fetcher(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ transition: { id: done.id } }),
  })
  if (move.status !== 204) {
    throw new Error(`Moving ${key} to ${DONE_STATUS} returned HTTP ${move.status}`)
  }

  console.info(`Moved ${key} to ${DONE_STATUS}`)
}

export async function closeTickets({
  title,
  ...connection
}: Connection & { title: string }) {
  const failures: string[] = []

  for (const key of keysIn(title)) {
    try {
      await closeTicket(key, connection)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"))
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { PR_TITLE, JIRA_API_BASE, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env
  const credentials = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`)

  await closeTickets({
    title: PR_TITLE ?? "",
    apiBase: JIRA_API_BASE,
    authorization: `Basic ${credentials.toString("base64")}`,
  })
}
