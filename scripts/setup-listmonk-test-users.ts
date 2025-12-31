/**
 * One-time setup script to add seed users to Listmonk's TEST_LIST
 *
 * This ensures test users exist in Listmonk before testing event list creation.
 * Run once with: pnpm tsx scripts/setup-listmonk-test-users.ts
 *
 * Requirements:
 * - LISTMONK_API_URL, LISTMONK_API_USERNAME, LISTMONK_API_PASSWORD in .env
 */

import "dotenv/config"

const TEST_LIST_ID = 5

const SEED_USERS = [
  { email: "admin@example.com", name: "Master User Full Name" },
  { email: "user1@example.com", name: "User One Full Name" },
  { email: "user2@example.com", name: "User Two Full Name" },
  { email: "user3@example.com", name: "User Three Full Name" },
  { email: "user4@example.com", name: "User Four Full Name" },
  { email: "user5@example.com", name: "User Five Full Name" },
  { email: "user6@example.com", name: "User Six Full Name" },
  { email: "user7@example.com", name: "User Seven Full Name" },
  { email: "user8@example.com", name: "User Eight Full Name" },
  { email: "user9@example.com", name: "User Nine Full Name" },
  { email: "test-history@example.com", name: "Test History User" },
]

function getListmonkConfig() {
  const listmonkApiUrl = process.env.LISTMONK_API_URL
  const username = process.env.LISTMONK_API_USERNAME
  const password = process.env.LISTMONK_API_PASSWORD

  if (!listmonkApiUrl || !username || !password) {
    throw new Error(
      "Missing LISTMONK_API_URL, LISTMONK_API_USERNAME, or LISTMONK_API_PASSWORD"
    )
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64")

  return {
    listmonkApiUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
  }
}

async function getSubscriberByEmail(email: string) {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const response = await fetch(
    `${listmonkApiUrl}/api/subscribers?query=subscribers.email='${encodeURIComponent(email)}'`,
    { headers }
  )

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    data: { results: Array<{ id: number; email: string }> }
  }
  return data.data.results?.[0] || null
}

async function createSubscriber(email: string, name: string, listIds: number[]) {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const response = await fetch(`${listmonkApiUrl}/api/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      name,
      lists: listIds,
      status: "enabled",
      attribs: {
        source: "seed_setup_script",
        created_at: new Date().toISOString(),
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(`Failed to create subscriber: ${response.status} ${errorBody}`)
  }

  return response.json()
}

async function addSubscriberToList(subscriberId: number, listIds: number[]) {
  const { listmonkApiUrl, headers } = getListmonkConfig()

  const response = await fetch(`${listmonkApiUrl}/api/subscribers/lists`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ids: [subscriberId],
      action: "add",
      target_list_ids: listIds,
      status: "confirmed",
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(`Failed to add subscriber to list: ${response.status} ${errorBody}`)
  }
}

async function main() {
  console.info("🚀 Setting up Listmonk test users...\n")

  const { listmonkApiUrl } = getListmonkConfig()
  console.info(`📡 Listmonk URL: ${listmonkApiUrl}`)
  console.info(`📋 Target list ID: ${TEST_LIST_ID}\n`)

  let created = 0
  let updated = 0
  let errors = 0

  for (const user of SEED_USERS) {
    try {
      const existing = await getSubscriberByEmail(user.email)

      if (existing) {
        // Add to TEST_LIST if not already
        await addSubscriberToList(existing.id, [TEST_LIST_ID])
        console.info(`✅ ${user.email} - added to TEST_LIST (already existed)`)
        updated++
      } else {
        // Create new subscriber with TEST_LIST
        await createSubscriber(user.email, user.name, [TEST_LIST_ID])
        console.info(`✅ ${user.email} - created and added to TEST_LIST`)
        created++
      }
    } catch (error) {
      console.error(`❌ ${user.email} - ${error instanceof Error ? error.message : error}`)
      errors++
    }
  }

  console.info("\n📊 Summary:")
  console.info(`   Created: ${created}`)
  console.info(`   Updated: ${updated}`)
  console.info(`   Errors: ${errors}`)

  if (errors > 0) {
    process.exit(1)
  }

  console.info("\n✅ Done! Test users are ready in Listmonk.")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
