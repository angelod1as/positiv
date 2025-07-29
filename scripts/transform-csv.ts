import { parse } from 'csv-parse'
import fs from 'fs'
import path from 'path'
import { GENDERS, ORIENTATIONS, PRONOUNS } from '../app/lib/constants/constants'

interface CSVRow {
  full_name: string
  social_name: string
  gender: string
  orientation: string
  pronoums: string
  email: string
  phone: string
  rg: string
  flag: string
  approved_to_attend: string
  skip_this_column: string
  general_notes: string
  [eventId: string]: string
}

const approvedToAttendMap: Record<string, string> = {
  'Sim': 'approved',
  'TRUE': 'approved',
  'Ainda não': 'pending',
  'Não sei ainda': 'pending',
  'FALSE': 'rejected',
  'Não': 'rejected',
  'Não sei': 'rejected',
  '': 'rejected'
}

const flagMap: Record<string, string> = {
  '': 'none',
  '🚨': 'red',
  '🤔': 'yellow',
  '⚠️': 'yellow'
}

const genderMap: Record<string, string> = {
  'NB': 'Pessoa não binária'
}

function cleanPhone(phone: string): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  return cleaned || null
}

function parseArrayField(value: string, validValues: readonly string[], fieldName: string): string[] {
  if (!value || value.trim() === '') return []
  
  const items = value.split(',').map(v => v.trim()).filter(Boolean)
  const mapped: string[] = []
  const unknown: string[] = []
  
  items.forEach(item => {
    // Check if it's a valid value (case-insensitive)
    const valid = validValues.find(v => v.toLowerCase() === item.toLowerCase())
    if (valid) {
      mapped.push(valid)
    } else if (fieldName === 'gender' && genderMap[item]) {
      mapped.push(genderMap[item])
    } else {
      unknown.push(item)
    }
  })
  
  if (unknown.length > 0) {
    console.warn(`Unknown ${fieldName} values: ${unknown.join(', ')}`)
  }
  
  return mapped
}

function parsePronounsField(value: string): string[] {
  if (!value || value.trim() === '') return []
  
  const items = value.split(',').map(v => v.trim()).filter(Boolean)
  const mapped: string[] = []
  
  items.forEach(item => {
    // Normalize pronouns (e.g., "Ele/Dele" → "Ele/dele")
    const normalized = item.split('/').map((part, i) => 
      i === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase()
    ).join('/')
    
    const valid = PRONOUNS.find(p => p.toLowerCase() === normalized.toLowerCase())
    if (valid) {
      mapped.push(valid)
    } else {
      console.warn(`Unknown pronoun: ${item}`)
    }
  })
  
  return mapped
}

function escapeString(str: string | null): string {
  if (str === null || str === undefined) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

function arrayToPostgres(arr: string[]): string {
  if (arr.length === 0) return 'NULL'
  return `ARRAY[${arr.map(item => escapeString(item)).join(', ')}]`
}

async function transformCSV() {
  const csvPath = path.resolve('../../mailing.csv')
  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  
  const records: CSVRow[] = []
  const parser = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })
  
  for await (const record of parser) {
    records.push(record)
  }
  
  console.log(`Processing ${records.length} records...`)
  
  const profilesSQL: string[] = []
  const eventParticipantsSQL: string[] = []
  const skippedRecords: { name: string; reason: string }[] = []
  let validProfiles = 0
  
  // Get event column IDs
  const eventIds = Object.keys(records[0] || {}).filter(key => {
    return key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
  
  records.forEach((record, index) => {
    // Skip records without email or phone
    if (!record.email && !record.phone) {
      skippedRecords.push({
        name: record.full_name || record.social_name || `Row ${index + 2}`,
        reason: 'Missing both email and phone'
      })
      return
    }
    
    const phone = cleanPhone(record.phone)
    const approvedStatus = approvedToAttendMap[record.approved_to_attend] || 'rejected'
    const flagStatus = flagMap[record.flag] || 'none'
    const genderArray = parseArrayField(record.gender, GENDERS, 'gender')
    const orientationArray = parseArrayField(record.orientation, ORIENTATIONS, 'orientation')
    const pronounsArray = parsePronounsField(record.pronoums)
    
    // Generate profile INSERT
    const profileId = `gen_random_uuid()`
    validProfiles++
    
    const profileSQL = `INSERT INTO public.profiles (
  id,
  user_id,
  email,
  created_at,
  basic_data_filled,
  full_name,
  social_name,
  rg,
  pronouns,
  phone,
  gender,
  orientation,
  approved_to_attend,
  flag,
  allow_marketing_email
) VALUES (
  ${profileId},
  NULL,
  ${escapeString(record.email || null)},
  NOW(),
  false,
  ${escapeString(record.full_name || null)},
  ${escapeString(record.social_name || null)},
  ${escapeString(record.rg || null)},
  ${arrayToPostgres(pronounsArray)},
  ${phone || 'NULL'},
  ${arrayToPostgres(genderArray)},
  ${arrayToPostgres(orientationArray)},
  '${approvedStatus}'::approved_to_attend_enum,
  '${flagStatus}'::profile_flag_enum,
  false
);`
    
    profilesSQL.push(profileSQL)
    
    // Generate event_participants INSERTs
    eventIds.forEach(eventId => {
      if (record[eventId] === 'TRUE') {
        const eventParticipantSQL = `INSERT INTO public.event_participants (
  id,
  profile_id,
  event_id,
  user_applied_status,
  process_status,
  application_date,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.profiles WHERE ${record.email ? `email = ${escapeString(record.email)}` : `phone = ${phone}`} LIMIT 1),
  '${eventId}'::uuid,
  false,
  'applied',
  NOW(),
  NOW()
);`
        eventParticipantsSQL.push(eventParticipantSQL)
      }
    })
  })
  
  // Write SQL files
  const profilesFile = path.resolve('./migration-profiles.sql')
  const eventParticipantsFile = path.resolve('./migration-event-participants.sql')
  
  // Add transaction wrapper and header
  const profilesContent = `-- CSV Migration: Profiles
-- Generated: ${new Date().toISOString()}
-- Total records: ${validProfiles}

BEGIN;

${profilesSQL.join('\n\n')}

COMMIT;
`
  
  const eventParticipantsContent = `-- CSV Migration: Event Participants
-- Generated: ${new Date().toISOString()}
-- Total records: ${eventParticipantsSQL.length}
-- NOTE: Run this AFTER migration-profiles.sql

BEGIN;

${eventParticipantsSQL.join('\n\n')}

COMMIT;
`
  
  fs.writeFileSync(profilesFile, profilesContent)
  fs.writeFileSync(eventParticipantsFile, eventParticipantsContent)
  
  // Summary
  console.log('\n✅ Migration files generated!')
  console.log(`📁 Profiles SQL: ${profilesFile}`)
  console.log(`📁 Event Participants SQL: ${eventParticipantsFile}`)
  console.log(`\n📊 Summary:`)
  console.log(`  - Valid profiles: ${validProfiles}`)
  console.log(`  - Event participants: ${eventParticipantsSQL.length}`)
  console.log(`  - Skipped records: ${skippedRecords.length}`)
  
  if (skippedRecords.length > 0) {
    console.log('\n⚠️  Skipped records:')
    skippedRecords.forEach(({ name, reason }) => {
      console.log(`  - ${name}: ${reason}`)
    })
  }
}

transformCSV().catch(console.error)