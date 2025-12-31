/**
 * Listmonk Subscriber ID Sync Script
 *
 * Syncs listmonk_subscriber_id for existing newsletter subscribers by looking up
 * each subscriber in Listmonk by email and storing their ID.
 *
 * This is a one-time migration script to fix the bug where subscriber IDs
 * were not being saved to the database.
 *
 * Usage:
 *
 * Dry-run (first 5 records, no writes):
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/sync-listmonk-subscriber-ids.ts --dry-run
 *
 * Full sync:
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/sync-listmonk-subscriber-ids.ts
 *
 * Production database (dry-run):
 *   SUPABASE_CONNECT_URL=postgresql://postgres.PROJECT_ID:PASSWORD@HOST:5432/postgres \
 *     pnpm tsx -r dotenv/config app/scripts/temp/migration/sync-listmonk-subscriber-ids.ts --dry-run
 *
 * Required environment variables:
 *   - SUPABASE_CONNECT_URL or DATABASE_URL: Database connection string
 *   - LISTMONK_API_URL: Listmonk API URL
 *   - LISTMONK_API_USERNAME: Listmonk API username
 *   - LISTMONK_API_PASSWORD: Listmonk API password
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '~/types/database/kysely.types'

const connectionString = process.env.SUPABASE_CONNECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('SUPABASE_CONNECT_URL or DATABASE_URL must be set')
}

const listmonkApiUrl = process.env.LISTMONK_API_URL
const listmonkApiUsername = process.env.LISTMONK_API_USERNAME
const listmonkApiPassword = process.env.LISTMONK_API_PASSWORD

if (!listmonkApiUrl || !listmonkApiUsername || !listmonkApiPassword) {
  throw new Error('LISTMONK_API_URL, LISTMONK_API_USERNAME, and LISTMONK_API_PASSWORD must be set')
}

const isRemote = connectionString.includes('supabase.com')

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString,
      ssl: isRemote ? true : undefined,
    }),
  }),
})

const basicAuthHeader = `Basic ${Buffer.from(
  `${listmonkApiUsername}:${listmonkApiPassword}`
).toString("base64")}`

const headers = {
  Authorization: basicAuthHeader,
  "Content-Type": "application/json",
}

interface ListmonkSubscriber {
  id: number
  email: string
  name: string
}

interface ListmonkSearchResponse {
  data: {
    results: ListmonkSubscriber[]
  }
}

async function getSubscriberByEmail(email: string): Promise<ListmonkSubscriber | null> {
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

interface SubscriptionRow {
  id: string
  profile_id: string
  email: string
}

async function fetchSubscriptionsNeedingSync(limit?: number): Promise<SubscriptionRow[]> {
  let query = db
    .selectFrom('newsletter_subscriptions as ns')
    .innerJoin('profiles as p', 'ns.profile_id', 'p.id')
    .select([
      'ns.id',
      'ns.profile_id',
      'p.email',
    ])
    .where('ns.listmonk_subscriber_id', 'is', null)
    .where('ns.sync_status', '=', 'synced')
    .orderBy('ns.created_at', 'asc')

  if (limit) {
    query = query.limit(limit)
  }

  return await query.execute()
}

async function updateSubscriberId(subscriptionId: string, subscriberId: number): Promise<void> {
  await db
    .updateTable('newsletter_subscriptions')
    .set({
      listmonk_subscriber_id: subscriberId,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', subscriptionId)
    .execute()
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  const limit = isDryRun ? 5 : undefined

  console.info('🔍 Fetching newsletter subscriptions needing sync...')

  const subscriptions = await fetchSubscriptionsNeedingSync(limit)

  console.info(`✅ Found ${subscriptions.length} subscriptions to process${isDryRun ? ' (limited to 5 for dry-run)' : ''}\n`)

  if (subscriptions.length === 0) {
    console.info('✨ No subscriptions need syncing!')
    return
  }

  let synced = 0
  let notFound = 0
  let errors = 0

  for (const subscription of subscriptions) {
    try {
      console.info(`📧 Looking up: ${subscription.email}`)

      const subscriber = await getSubscriberByEmail(subscription.email)

      if (!subscriber) {
        console.warn(`   ⚠️  Not found in Listmonk: ${subscription.email}`)
        notFound++
        continue
      }

      console.info(`   ✅ Found subscriber ID: ${subscriber.id}`)

      if (!isDryRun) {
        await updateSubscriberId(subscription.id, subscriber.id)
        console.info(`   💾 Saved to database`)
      } else {
        console.info(`   🔍 [DRY-RUN] Would save subscriber ID ${subscriber.id}`)
      }

      synced++

      // Rate limit - wait 100ms between API calls
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`   ❌ Error processing ${subscription.email}:`, error)
      errors++
    }
  }

  console.info('\n📊 Summary:')
  console.info(`   Total processed: ${subscriptions.length}`)
  console.info(`   Successfully synced: ${synced}`)
  console.info(`   Not found in Listmonk: ${notFound}`)
  console.info(`   Errors: ${errors}`)

  if (isDryRun) {
    console.info('\n🔍 DRY RUN MODE - No changes were made to the database')

    // Show total count that would be affected
    const totalCount = await db
      .selectFrom('newsletter_subscriptions')
      .select(db.fn.count('id').as('count'))
      .where('listmonk_subscriber_id', 'is', null)
      .where('sync_status', '=', 'synced')
      .executeTakeFirst()

    console.info(`\n📈 Full run would process: ${totalCount?.count} subscriptions`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.info('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}
