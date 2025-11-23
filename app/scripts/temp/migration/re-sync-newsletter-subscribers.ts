/**
 * Newsletter Subscriber Re-sync Script
 *
 * Re-exports ALL newsletter subscribers to fix names in Listmonk.
 * This includes profiles that were previously synced with email as name.
 *
 * Usage:
 *
 * Local database (dry-run):
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/re-sync-newsletter-subscribers.ts --dry-run
 *
 * Local database (generate files):
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/re-sync-newsletter-subscribers.ts
 *
 * Production database (dry-run):
 *   SUPABASE_CONNECT_URL=postgresql://postgres.PROJECT_ID:PASSWORD@HOST:5432/postgres \
 *     pnpm tsx -r dotenv/config app/scripts/temp/migration/re-sync-newsletter-subscribers.ts --dry-run
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '~/types/database/kysely.types'
import fs from 'fs/promises'
import path from 'path'

const connectionString = process.env.SUPABASE_CONNECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('SUPABASE_CONNECT_URL or DATABASE_URL must be set')
}

const isRemote = connectionString.includes('supabase.com')

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    }),
  }),
})

interface ProfileData {
  id: string
  email: string
  user_id: string | null
  social_name: string | null
  full_name: string | null
  is_veteran: boolean
  approved_to_attend: 'approved' | 'not_approved' | 'pending'
}

interface SubscriberRow {
  email: string
  name: string
  attributes: {
    profile_id: string
    user_id: string | null
    social_name: string | null
    full_name: string | null
    name: string
    is_veteran: boolean
    approved_to_attend: string
    synced_at: string
  }
}

export function computeName(profile: {
  social_name: string | null
  full_name: string | null
  email: string
}): string {
  if (profile.social_name) {
    return profile.social_name
  }
  if (profile.full_name) {
    return profile.full_name.trim().split(/\s+/)[0]
  }
  return profile.email
}

function validateEmail(email: string): boolean {
  if (!email) {
    console.warn('⚠️  Profile with missing email detected')
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.warn(`⚠️  Profile with invalid email detected: ${email}`)
    return false
  }

  return true
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('\n') || field.includes('"') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function generateCSV(subscribers: SubscriberRow[]): string {
  const header = 'email,name,attributes\n'
  const rows = subscribers.map((sub) => {
    const attributesJSON = JSON.stringify(sub.attributes)
    const escapedEmail = escapeCSVField(sub.email)
    const escapedName = escapeCSVField(sub.name)
    const escapedAttributes = `"${attributesJSON.replace(/"/g, '""')}"`
    return `${escapedEmail},${escapedName},${escapedAttributes}`
  })
  return header + rows.join('\n')
}

export async function fetchAllSubscribers(): Promise<ProfileData[]> {
  const result = await db
    .selectFrom('profiles as p')
    .innerJoin('newsletter_subscriptions as ns', 'p.id', 'ns.profile_id')
    .select([
      'p.id',
      'p.email',
      'p.user_id',
      'p.social_name',
      'p.full_name',
      'p.is_veteran',
      'p.approved_to_attend',
    ])
    .where('ns.consent_given', '=', true)
    .execute()

  return result as ProfileData[]
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.info('🔍 Fetching ALL profiles with newsletter consent...')

  const profiles = await fetchAllSubscribers()

  console.info(`✅ Found ${profiles.length} profiles to re-sync\n`)

  const syncedAt = new Date().toISOString()
  const subscribers: SubscriberRow[] = []
  let profilesWithEmailAsName = 0

  for (const profile of profiles) {
    if (!validateEmail(profile.email)) {
      continue
    }

    const computedName = computeName(profile)

    if (computedName === profile.email) {
      profilesWithEmailAsName++
    }

    subscribers.push({
      email: profile.email,
      name: computedName,
      attributes: {
        profile_id: profile.id,
        user_id: profile.user_id,
        social_name: profile.social_name,
        full_name: profile.full_name,
        name: computedName,
        is_veteran: profile.is_veteran,
        approved_to_attend: profile.approved_to_attend,
        synced_at: syncedAt,
      },
    })
  }

  const csvContent = generateCSV(subscribers)

  console.info(`📊 Statistics:`)
  console.info(`   Total subscribers: ${subscribers.length}`)
  console.info(`   With proper names: ${subscribers.length - profilesWithEmailAsName}`)
  console.info(`   Using email as name: ${profilesWithEmailAsName}\n`)

  if (isDryRun) {
    console.info('🔍 DRY RUN MODE - No files will be written\n')
    console.info('📄 CSV Preview (first 10 rows):')
    console.info(csvContent.split('\n').slice(0, 11).join('\n'))
    console.info(`\n✅ Would generate ${subscribers.length} subscribers`)
    return
  }

  const outputDir = path.join(process.cwd(), 'scripts', 'temp', 'migration', 'output')
  await fs.mkdir(outputDir, { recursive: true })

  const csvPath = path.join(outputDir, 'newsletter-subscribers-resync.csv')

  await fs.writeFile(csvPath, csvContent, 'utf-8')

  console.info(`✅ Generated ${subscribers.length} subscribers`)
  console.info(`📄 CSV file: ${csvPath}`)
  console.info('\n🎯 Next steps:')
  console.info('1. Backup current Listmonk subscribers (export from UI)')
  console.info('2. Upload CSV to Listmonk UI (List ID: 4, Mode: Upsert)')
  console.info('3. Verify updated names in Listmonk')
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
