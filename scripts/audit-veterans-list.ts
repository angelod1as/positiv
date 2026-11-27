import "varlock/auto-load"
import { ENV } from "varlock/env"
import {
  getBlocklistedSubscribers,
  getListSubscribers,
  type ListSubscriber,
} from "~/business/newsletter/listmonk-lists.server"
import {
  auditVeteransList,
  type AuditProfile,
} from "~/business/newsletter/veterans-audit"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_REGISTRATION_ALERTS_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"

const PROFILES_QUERY = `
  SELECT p.id, p.email, p.is_veteran, ns.consent_given, ns.listmonk_subscriber_id
    FROM profiles p
    LEFT JOIN newsletter_subscriptions ns ON ns.profile_id = p.id
`

interface ProfileRow {
  id: string
  email: string
  is_veteran: boolean | null
  consent_given: boolean | null
  listmonk_subscriber_id: number | null
}

async function readProfiles(projectRef: string): Promise<AuditProfile[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: PROFILES_QUERY }),
    },
  )
  if (!response.ok) {
    throw new Error(
      `Failed to read profiles: ${response.status} ${response.statusText}`,
    )
  }
  const rows = (await response.json()) as ProfileRow[]
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    isVeteran: row.is_veteran === true,
    newsletter: row.consent_given,
    listmonkSubscriberId: row.listmonk_subscriber_id,
  }))
}

async function readSubscribers() {
  const reads = await Promise.all([
    getListSubscribers(LISTMONK_REGISTERED_LIST_ID),
    getListSubscribers(LISTMONK_REGISTERED_LIST_ID, "unsubscribed"),
    getListSubscribers(LISTMONK_VETERANS_LIST_ID),
    getListSubscribers(LISTMONK_VETERANS_LIST_ID, "unsubscribed"),
    getListSubscribers(LISTMONK_REGISTRATION_ALERTS_LIST_ID),
    getListSubscribers(LISTMONK_REGISTRATION_ALERTS_LIST_ID, "unsubscribed"),
    getBlocklistedSubscribers(),
  ])

  const byId = new Map<number, ListSubscriber>()
  for (const read of reads) {
    if (!read.success) {
      throw new Error(read.errors[0]?.message ?? "Failed to read Listmonk")
    }
    for (const subscriber of read.data) {
      byId.set(subscriber.id, subscriber)
    }
  }

  return [...byId.values()].map((subscriber) => ({
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    profileId:
      typeof subscriber.attribs?.profile_id === "string"
        ? subscriber.attribs.profile_id
        : null,
    lists: subscriber.lists,
  }))
}

async function main() {
  const projectRef = process.argv[2]
  if (!projectRef) {
    console.error(
      "Usage: pnpm audit:veterans <production-project-ref>\n\nRead-only: SELECTs through the Supabase read-only query endpoint and GETs to Listmonk. Prints counts only.",
    )
    process.exit(1)
  }

  if (ENV.E2E_MODE) {
    console.error("E2E_MODE is on: the Listmonk reads would return nothing.")
    process.exit(1)
  }
  if (!ENV.SUPABASE_ACCESS_TOKEN) {
    console.error("SUPABASE_ACCESS_TOKEN is not set.")
    process.exit(1)
  }

  const [profiles, subscribers] = await Promise.all([
    readProfiles(projectRef),
    readSubscribers(),
  ])

  console.info(
    JSON.stringify(auditVeteransList({ profiles, subscribers }), null, 2),
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
