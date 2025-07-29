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
  
  // First, generate a CTE to check existing profiles
  const checkExistingSQL = `-- Check for existing profiles before migration
WITH existing_profiles AS (
  SELECT id, email, phone FROM public.profiles 
  WHERE email IN (${records.filter(r => r.email).map(r => escapeString(r.email)).join(', ')})
     OR phone IN (${records.filter(r => r.phone).map(r => cleanPhone(r.phone)).filter(p => p).join(', ')})
)
SELECT * FROM existing_profiles;
`
  
  records.forEach((record, index) => {
    // Skip records without email (email is required in profiles table)
    if (!record.email) {
      skippedRecords.push({
        name: record.full_name || record.social_name || `Row ${index + 2}`,
        reason: 'Missing email (required field)'
      })
      return
    }
    
    const phone = cleanPhone(record.phone)
    const approvedStatus = approvedToAttendMap[record.approved_to_attend] || 'rejected'
    const flagStatus = flagMap[record.flag] || 'none'
    const genderArray = parseArrayField(record.gender, GENDERS, 'gender')
    const orientationArray = parseArrayField(record.orientation, ORIENTATIONS, 'orientation')
    const pronounsArray = parsePronounsField(record.pronoums)
    
    validProfiles++
    
    // Generate UPSERT for profiles
    // We'll use a DO block to handle the logic
    const profileSQL = `
-- Process profile: ${record.full_name || record.social_name || 'Unknown'}
DO $$
DECLARE
  v_profile_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if profile exists by email or phone
  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE ${record.email ? `email = ${escapeString(record.email)}` : 'FALSE'}
     OR ${phone ? `phone = ${phone}` : 'FALSE'}
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing profile
    UPDATE public.profiles
    SET 
      ${record.email ? `email = ${escapeString(record.email)},` : ''}
      ${record.full_name ? `full_name = ${escapeString(record.full_name)},` : ''}
      ${record.social_name ? `social_name = ${escapeString(record.social_name)},` : ''}
      ${record.rg ? `rg = ${escapeString(record.rg)},` : ''}
      ${pronounsArray.length > 0 ? `pronouns = ${arrayToPostgres(pronounsArray)},` : ''}
      ${phone ? `phone = ${phone},` : ''}
      ${genderArray.length > 0 ? `gender = ${arrayToPostgres(genderArray)},` : ''}
      ${orientationArray.length > 0 ? `orientation = ${arrayToPostgres(orientationArray)},` : ''}
      approved_to_attend = '${approvedStatus}'::approved_to_attend_enum,
      flag = '${flagStatus}'::profile_flag_enum
    WHERE id = v_existing_id;
    
    v_profile_id := v_existing_id;
    RAISE NOTICE 'Updated existing profile %', v_existing_id;
  ELSE
    -- Insert new profile
    INSERT INTO public.profiles (
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
      gen_random_uuid(),
      NULL,
      ${escapeString(record.email || null)},
      NOW(),
      true,
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
    ) RETURNING id INTO v_profile_id;
    
    RAISE NOTICE 'Created new profile %', v_profile_id;
  END IF;
  
  -- Store the profile_id for event participants
  INSERT INTO temp_profile_mapping (email, phone, profile_id)
  VALUES (${escapeString(record.email || null)}, ${phone || 'NULL'}, v_profile_id);
END $$;`
    
    profilesSQL.push(profileSQL)
    
    // Generate event_participants INSERTs (these will use the temp mapping table)
    eventIds.forEach(eventId => {
      if (record[eventId] === 'TRUE') {
        const eventParticipantSQL = `
-- Add event participant for ${record.full_name || record.social_name || 'Unknown'}
INSERT INTO public.event_participants (
  id,
  profile_id,
  event_id,
  is_user_applied,
  application_date,
  created_at,
  application_status,
  attendance_status,
  has_paid,
  payment
) 
SELECT
  gen_random_uuid(),
  profile_id,
  '${eventId}'::uuid,
  true,
  NOW(),
  NOW(),
  'pending'::application_status_enum,
  'pending'::attendance_status_enum,
  true,
  0
FROM temp_profile_mapping
WHERE ${record.email ? `email = ${escapeString(record.email)}` : `phone = ${phone}`}
  AND NOT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.profile_id = temp_profile_mapping.profile_id
      AND ep.event_id = '${eventId}'::uuid
  );`
        eventParticipantsSQL.push(eventParticipantSQL)
      }
    })
  })
  
  // Write SQL files
  const profilesFile = path.resolve('./migration-profiles-upsert.sql')
  const eventParticipantsFile = path.resolve('./migration-event-participants-upsert.sql')
  
  // Add transaction wrapper and header
  const profilesContent = `-- CSV Migration: Profiles (with UPSERT logic)
-- Generated: ${new Date().toISOString()}
-- Total records: ${validProfiles}
-- This script handles existing profiles by updating them instead of creating duplicates

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE temp_profile_mapping (
  email text,
  phone bigint,
  profile_id uuid
);

${checkExistingSQL}

${profilesSQL.join('\n')}

-- Show summary
SELECT 
  COUNT(*) as total_mappings,
  COUNT(DISTINCT profile_id) as unique_profiles
FROM temp_profile_mapping;

COMMIT;
`
  
  const eventParticipantsContent = `-- CSV Migration: Event Participants (with duplicate check)
-- Generated: ${new Date().toISOString()}
-- Total records: ${eventParticipantsSQL.length}
-- NOTE: Run this AFTER migration-profiles-upsert.sql IN THE SAME SESSION

BEGIN;

-- Ensure temp_profile_mapping exists
-- (It should have been created by the profiles script)
SELECT COUNT(*) as mapped_profiles FROM temp_profile_mapping;

${eventParticipantsSQL.join('\n')}

-- Show summary
SELECT 
  event_id,
  COUNT(*) as participants_added
FROM public.event_participants
WHERE created_at >= NOW() - INTERVAL '5 minutes'
GROUP BY event_id
ORDER BY event_id;

-- Clean up
DROP TABLE IF EXISTS temp_profile_mapping;

COMMIT;
`
  
  fs.writeFileSync(profilesFile, profilesContent)
  fs.writeFileSync(eventParticipantsFile, eventParticipantsContent)
  
  // Summary
  console.log('\n✅ Migration files generated with UPSERT logic!')
  console.log(`📁 Profiles SQL: ${profilesFile}`)
  console.log(`📁 Event Participants SQL: ${eventParticipantsFile}`)
  console.log(`\n📊 Summary:`)
  console.log(`  - Valid profiles: ${validProfiles}`)
  console.log(`  - Event participants: ${eventParticipantsSQL.length}`)
  console.log(`  - Skipped records: ${skippedRecords.length}`)
  console.log('\n⚠️  IMPORTANT: Run both SQL files in the SAME database session!')
  console.log('The profiles script creates a temporary table used by the event participants script.')
  
  if (skippedRecords.length > 0) {
    console.log('\n⚠️  Skipped records:')
    skippedRecords.forEach(({ name, reason }) => {
      console.log(`  - ${name}: ${reason}`)
    })
  }
}

transformCSV().catch(console.error)