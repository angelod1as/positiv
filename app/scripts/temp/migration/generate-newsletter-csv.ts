/**
 * Newsletter Subscriber Backfill Script
 *
 * Generates CSV and SQL files for backfilling newsletter subscribers to Listmonk.
 *
 * Usage:
 *
 * Local database (dry-run):
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/generate-newsletter-csv.ts --dry-run
 *
 * Local database (generate files):
 *   pnpm tsx -r dotenv/config app/scripts/temp/migration/generate-newsletter-csv.ts
 *
 * Production database (dry-run):
 *   SUPABASE_CONNECT_URL=postgresql://postgres.PROJECT_ID:PASSWORD@HOST:5432/postgres \
 *     pnpm tsx -r dotenv/config app/scripts/temp/migration/generate-newsletter-csv.ts --dry-run
 *
 * Production database (generate files):
 *   SUPABASE_CONNECT_URL=postgresql://postgres.PROJECT_ID:PASSWORD@HOST:5432/postgres \
 *     pnpm tsx -r dotenv/config app/scripts/temp/migration/generate-newsletter-csv.ts
 *
 * Output files:
 *   - scripts/temp/migration/output/newsletter-subscribers.csv
 *   - scripts/temp/migration/output/update-newsletter-sync.sql
 */

import { db } from '~/lib/supabase/db.server'
import fs from 'fs/promises'
import path from 'path'

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
    return profile.full_name.split(' ')[0]
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
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
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

function generateSQL(profileIds: string[]): string {
  const idsFormatted = profileIds.map((id) => `  '${id}'`).join(',\n')

  return `UPDATE newsletter_subscriptions
SET
  sync_status = 'synced',
  subscribed_at = NOW(),
  subscription_source = 'backfill'
WHERE profile_id IN (
${idsFormatted}
);`
}

export async function fetchProfiles(): Promise<ProfileData[]> {
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
    .where('ns.sync_status', '!=', 'synced')
    .execute()

  return result as ProfileData[]
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.info('🔍 Fetching profiles with newsletter consent...')

  const profiles = await fetchProfiles()

  console.info(`✅ Found ${profiles.length} profiles to backfill\n`)

  // Transform profiles into subscriber rows
  const syncedAt = new Date().toISOString()
  const subscribers: SubscriberRow[] = []
  const profileIds: string[] = []

  for (const profile of profiles) {
    // Validate email
    if (!validateEmail(profile.email)) {
      continue
    }

    const computedName = computeName(profile)

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

    profileIds.push(profile.id)
  }

  const csvContent = generateCSV(subscribers)
  const sqlContent = generateSQL(profileIds)

  if (isDryRun) {
    console.info('🔍 DRY RUN MODE - No files will be written\n')
    console.info('📄 CSV Preview (first 5 rows):')
    console.info(csvContent.split('\n').slice(0, 6).join('\n'))
    console.info('\n📄 SQL Preview:')
    console.info(sqlContent)
    console.info(`\n✅ Would generate ${subscribers.length} subscribers`)
    return
  }

  // Write files
  const outputDir = path.join(process.cwd(), 'scripts', 'temp', 'migration', 'output')
  await fs.mkdir(outputDir, { recursive: true })

  const csvPath = path.join(outputDir, 'newsletter-subscribers.csv')
  const sqlPath = path.join(outputDir, 'update-newsletter-sync.sql')

  await fs.writeFile(csvPath, csvContent, 'utf-8')
  await fs.writeFile(sqlPath, sqlContent, 'utf-8')

  console.info(`✅ Generated ${subscribers.length} subscribers`)
  console.info(`📄 CSV file: ${csvPath}`)
  console.info(`📄 SQL file: ${sqlPath}`)
  console.info('\n🎯 Next steps:')
  console.info('1. Upload CSV to Listmonk UI (List ID: 4, Status: confirmed)')
  console.info('2. Verify import success in Listmonk')
  console.info('3. Run SQL file on production database')
}

// Run main function if this file is executed directly
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
