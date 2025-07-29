import { parse } from "csv-parse"
import fs from "fs"
import path from "path"
import { GENDERS, ORIENTATIONS, PRONOUNS } from "../app/lib/constants/constants"

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
  Sim: "approved",
  TRUE: "approved",
  "Ainda não": "pending",
  "Não sei ainda": "pending",
  FALSE: "pending",
  Não: "rejected",
  "Não sei": "pending",
  "": "pending",
}

const flagMap: Record<string, string> = {
  "": "none",
  "🚨": "red",
  "🤔": "yellow",
  "⚠️": "yellow",
}

const genderMap: Record<string, string> = {
  NB: "Pessoa não binária",
  "Não binário": "Pessoa não binária",
  "Não binárie": "Pessoa não binária",
  "Não-binário": "Pessoa não binária",
  "Não-binárie": "Pessoa não binária",
  "Pessoa não-binária": "Pessoa não binária",
  Transmasculino: "Homem trans",
  "Transmasculino NB": "Pessoa não binária",
  "Trans masc": "Homem trans",
  "Trans masc nao binarie": "Pessoa não binária",
  Transmasculine: "Homem trans",
  Boyceta: "Homem trans",
  "transmasculino boyceta": "Homem trans",
  "Mulher Trans": "Mulher trans",
  "Mulher Trans / Travesti": "Mulher trans",
  "Gênero fluido": "Pessoa não binária",
  "Gênero fluide": "Pessoa não binária",
  "Gênero Fluído": "Pessoa não binária",
  Bigênero: "Pessoa não binária",
  Agênero: "Pessoa agênera",
  queer: "Pessoa não binária",
  "Homem cis Queer": "Homem cis",
  "Sapatão masculino": "Pessoa não binária",
  "Hétero flexível": "Pessoa não binária",
  "Eu nasci em 22/08/1985 (não consegui responder acima) / sou uma pessoa trans NB":
    "Pessoa não binária",
  "Tô começando a me sentir um pouco gênero fluido em breves momentos":
    "Pessoa não binária",
  transmasculine: "Homem trans",
  "Gênero Fluído mais voltada ao feminino": "Pessoa não binária",
  "Mulher cis (mas que no coração é não-binárie mesmo, em construção 💜)":
    "Mulher cis",
  "Boyceta / transmasc nb": "Homem trans",
  "Sempre acho essa pergunta difícil.  Eu sou lida como mulher cis e acho ok desde que não me tratem diferente por isso (mas isso é um problema da sociedade). Sinceramente não me identifico com nenhum dos gêneros, mas coloco mulher cis pra maior parte das coisas porque é mais fácil":
    "Mulher cis",
  "#N/A": "",
}

const orientationMap: Record<string, string> = {
  Lésbica: "Sapatão",
  Lesbica: "Sapatão",
  Pansexual: "Pan",
  Panssexual: "Pan",
  Bissexual: "Bi",
  Heterossexual: "Hétero",
  Hetero: "Hétero",
  Assexual: "Ace",
  Demissexual: "Demi",
  Poli: "Pan",
  curioso: "Bi",
  "Não-hetero": "Bi",
  Akoi: "Ace",
  "Ace-Fluido": "Ace",
  Demirromantica: "Demi",
}

const pronounMap: Record<string, string> = {
  Ele: "Ele/dele",
  ele: "Ele/dele",
  Ela: "Ela/dela",
  ela: "Ela/dela",
  "Ela / dela": "Ela/dela",
  "Ela dela": "Ela/dela",
  "Ele / Dele": "Ele/dele",
  "Ele/Dele": "Ele/dele",
  "Ela/Dela": "Ela/dela",
  "Elu/Delu": "Elu/delu",
  "Ile/Dile": "Ile/dile",
  "ile/dile": "Ile/dile",
  "Ela / elu": "Ela/dela",
  "Ela/Elu": "Ela/dela",
  Todos: "Ele/dele",
  qualquer: "Ele/dele",
  "Qualquer pronome": "Ele/dele",
  "qualquer um": "Ele/dele",
  "Qualquer um": "Ele/dele",
  Todes: "Elu/delu",
  Mary: "Ela/dela",
  "Ela/Del": "Ela/dela",
  "Ela/delq": "Ela/dela",
  "Ela/ dela": "Ela/dela",
  "Ele/dle": "Ele/dele",
  "Ela/ele": "Ela/dela",
  "ela/dela": "Ela/dela",
  "ele/dele": "Ele/dele",
  "elu/delu": "Elu/delu",
  "Elu/Delu (mas atendo por todos)": "Elu/delu",
  "Ela/Dela/ Elu/Delu": "Elu/delu",
}

function cleanPhone(phone: string): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, "")
  return cleaned || null
}

function parseArrayField(
  value: string,
  validValues: readonly string[],
  fieldName: string,
): string[] {
  if (!value || value.trim() === "" || value === "#N/A") return []

  const items = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((item) => item !== "#N/A")
  const mapped: string[] = []
  const unknown: string[] = []

  items.forEach((item) => {
    // Skip very long text entries
    if (item.length > 100) {
      return
    }

    // Check if it's a valid value (case-insensitive)
    const valid = validValues.find(
      (v) => v.toLowerCase() === item.toLowerCase(),
    )
    if (valid) {
      mapped.push(valid)
    } else if (fieldName === "gender" && genderMap[item]) {
      const mappedValue = genderMap[item]
      if (mappedValue) mapped.push(mappedValue)
    } else if (fieldName === "orientation" && orientationMap[item]) {
      mapped.push(orientationMap[item])
    } else {
      unknown.push(item)
    }
  })

  if (unknown.length > 0) {
    console.warn(`Unknown ${fieldName} values: ${unknown.join(", ")}`)
  }

  return mapped
}

function parsePronounsField(value: string): string[] {
  if (!value || value.trim() === "" || value === "#N/A") return []

  // Split by comma AND semicolon to handle both separators
  const items = value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((item) => item !== "#N/A")
  const mapped: string[] = []
  const seenPronouns = new Set<string>()
  const unknown: string[] = []

  items.forEach((item) => {
    // Skip very long text that's clearly not a pronoun
    if (item.length > 50 || item.includes("...")) {
      return
    }

    // First check if there's a direct mapping
    if (pronounMap[item]) {
      const mappedPronoun = pronounMap[item]
      if (!seenPronouns.has(mappedPronoun)) {
        mapped.push(mappedPronoun)
        seenPronouns.add(mappedPronoun)
      }
      return
    }

    // Normalize pronouns (e.g., "Ele/Dele" → "Ele/dele")
    const normalized = item
      .split("/")
      .map((part, i) =>
        i === 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : part.toLowerCase(),
      )
      .join("/")

    const valid = PRONOUNS.find(
      (p) => p.toLowerCase() === normalized.toLowerCase(),
    )
    if (valid && !seenPronouns.has(valid)) {
      mapped.push(valid)
      seenPronouns.add(valid)
    } else {
      // Try to handle variations like "ela/dela" -> "Ela/dela"
      const lowerItem = item.toLowerCase()
      const matchingPronoun = PRONOUNS.find(
        (p) => p.toLowerCase() === lowerItem,
      )
      if (matchingPronoun && !seenPronouns.has(matchingPronoun)) {
        mapped.push(matchingPronoun)
        seenPronouns.add(matchingPronoun)
      } else {
        unknown.push(item)
      }
    }
  })

  if (unknown.length > 0) {
    console.warn(`Unknown pronoun: ${unknown.join(", ")}`)
  }

  return mapped
}

function escapeString(str: string | null): string {
  if (str === null || str === undefined) return "NULL"
  return `'${str.replace(/'/g, "''")}'`
}

function arrayToPostgres(arr: string[]): string {
  if (arr.length === 0) return `'{}'`
  return `ARRAY[${arr.map((item) => escapeString(item)).join(", ")}]`
}

async function transformCSV() {
  const csvPath = path.resolve("../../mailing.csv")
  const fileContent = fs.readFileSync(csvPath, "utf-8")

  const records: CSVRow[] = []
  const parser = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
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
  const eventIds = Object.keys(records[0] || {}).filter((key) => {
    return key.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  // First, generate a CTE to check existing profiles
  const checkExistingSQL = `-- Check for existing profiles before migration
WITH existing_profiles AS (
  SELECT id, email, phone FROM public.profiles
  WHERE email IN (${records
    .filter((r) => r.email)
    .map((r) => escapeString(r.email))
    .join(", ")})
     OR phone IN (${records
       .filter((r) => r.phone)
       .map((r) => cleanPhone(r.phone))
       .filter((p) => p)
       .join(", ")})
)
SELECT * FROM existing_profiles;
`

  records.forEach((record, index) => {
    // Skip records without email (email is required in profiles table)
    if (!record.email) {
      skippedRecords.push({
        name: record.full_name || record.social_name || `Row ${index + 2}`,
        reason: "Missing email (required field)",
      })
      return
    }

    const phone = cleanPhone(record.phone)
    const approvedStatus =
      approvedToAttendMap[record.approved_to_attend] || "rejected"
    const flagStatus = flagMap[record.flag] || "none"
    const genderArray = parseArrayField(record.gender, GENDERS, "gender")
    const orientationArray = parseArrayField(
      record.orientation,
      ORIENTATIONS,
      "orientation",
    )
    const pronounsArray = parsePronounsField(record.pronoums)

    validProfiles++

    // Generate UPSERT for profiles
    // We'll use a DO block to handle the logic
    const profileSQL = `
-- Process profile: ${record.full_name || record.social_name || "Unknown"}
DO $$
DECLARE
  v_profile_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if profile exists by email or phone
  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE ${record.email ? `email = ${escapeString(record.email)}` : "FALSE"}
     OR ${phone ? `phone = ${phone}` : "FALSE"}
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing profile
    UPDATE public.profiles
    SET
      ${record.email ? `email = ${escapeString(record.email)},` : ""}
      ${record.full_name ? `full_name = ${escapeString(record.full_name)},` : ""}
      ${record.social_name ? `social_name = ${escapeString(record.social_name)},` : ""}
      ${record.rg ? `rg = ${escapeString(record.rg)},` : ""}
      ${pronounsArray.length > 0 ? `pronouns = ${arrayToPostgres(pronounsArray)},` : ""}
      ${phone ? `phone = ${phone},` : ""}
      ${genderArray.length > 0 ? `gender = ${arrayToPostgres(genderArray)},` : ""}
      ${orientationArray.length > 0 ? `orientation = ${arrayToPostgres(orientationArray)},` : ""}
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
      ${phone || "NULL"},
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
  VALUES (${escapeString(record.email || null)}, ${phone || "NULL"}, v_profile_id);
END $$;`

    profilesSQL.push(profileSQL)

    // Generate event_participants INSERTs (these will use the temp mapping table)
    eventIds.forEach((eventId) => {
      if (record[eventId] === "TRUE") {
        const eventParticipantSQL = `
-- Add event participant for ${record.full_name || record.social_name || "Unknown"}
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
  const profilesFile = path.resolve("./migration-profiles-upsert.sql")
  const eventParticipantsFile = path.resolve(
    "./migration-event-participants-upsert.sql",
  )

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

${profilesSQL.join("\n")}

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

${eventParticipantsSQL.join("\n")}

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
  console.log("\n✅ Migration files generated with UPSERT logic!")
  console.log(`📁 Profiles SQL: ${profilesFile}`)
  console.log(`📁 Event Participants SQL: ${eventParticipantsFile}`)
  console.log(`\n📊 Summary:`)
  console.log(`  - Valid profiles: ${validProfiles}`)
  console.log(`  - Event participants: ${eventParticipantsSQL.length}`)
  console.log(`  - Skipped records: ${skippedRecords.length}`)
  console.log(
    "\n⚠️  IMPORTANT: Run both SQL files in the SAME database session!",
  )
  console.log(
    "The profiles script creates a temporary table used by the event participants script.",
  )

  if (skippedRecords.length > 0) {
    console.log("\n⚠️  Skipped records:")
    skippedRecords.forEach(({ name, reason }) => {
      console.log(`  - ${name}: ${reason}`)
    })
  }
}

transformCSV().catch(console.error)
