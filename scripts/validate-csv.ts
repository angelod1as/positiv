import { parse } from 'csv-parse'
import fs from 'fs'
import path from 'path'

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

async function validateCSV() {
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
  
  console.log(`Total records: ${records.length}`)
  
  // Check for duplicate phones
  const phoneMap = new Map<string, string[]>()
  const duplicatePhones: { phone: string; names: string[] }[] = []
  
  records.forEach((record) => {
    if (record.phone) {
      const names = phoneMap.get(record.phone) || []
      names.push(record.full_name || record.social_name || 'Unknown')
      phoneMap.set(record.phone, names)
    }
  })
  
  phoneMap.forEach((names, phone) => {
    if (names.length > 1) {
      duplicatePhones.push({ phone, names })
    }
  })
  
  if (duplicatePhones.length > 0) {
    console.log('\n❌ DUPLICATE PHONES FOUND:')
    duplicatePhones.forEach(({ phone, names }) => {
      console.log(`  Phone: ${phone}`)
      names.forEach(name => console.log(`    - ${name}`))
    })
  } else {
    console.log('\n✅ No duplicate phones found')
  }
  
  // Check for missing required fields
  const missingRequired: { row: number; name: string; missing: string[] }[] = []
  
  records.forEach((record, index) => {
    const missing: string[] = []
    
    if (!record.email) missing.push('email')
    if (!record.phone) missing.push('phone')
    if (!record.full_name && !record.social_name) missing.push('name (full_name or social_name)')
    
    if (missing.length > 0) {
      missingRequired.push({
        row: index + 2, // +2 because CSV is 1-indexed and has header
        name: record.full_name || record.social_name || 'Unknown',
        missing
      })
    }
  })
  
  if (missingRequired.length > 0) {
    console.log('\n⚠️  MISSING REQUIRED FIELDS:')
    missingRequired.forEach(({ row, name, missing }) => {
      console.log(`  Row ${row} (${name}): Missing ${missing.join(', ')}`)
    })
  } else {
    console.log('✅ All required fields present')
  }
  
  // Analyze approved_to_attend values
  const approvalValues = new Map<string, number>()
  records.forEach(record => {
    const value = record.approved_to_attend || 'EMPTY'
    approvalValues.set(value, (approvalValues.get(value) || 0) + 1)
  })
  
  console.log('\n📊 APPROVED_TO_ATTEND VALUES:')
  approvalValues.forEach((count, value) => {
    console.log(`  "${value}": ${count} occurrences`)
  })
  
  // Analyze flag values
  const flagValues = new Map<string, number>()
  records.forEach(record => {
    const value = record.flag || 'EMPTY'
    flagValues.set(value, (flagValues.get(value) || 0) + 1)
  })
  
  console.log('\n🚩 FLAG VALUES:')
  flagValues.forEach((count, value) => {
    console.log(`  "${value}": ${count} occurrences`)
  })
  
  // Get event column IDs
  const eventIds = Object.keys(records[0] || {}).filter(key => {
    return key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
  
  console.log(`\n🎯 FOUND ${eventIds.length} EVENT IDS`)
  
  // Count participants per event
  const eventParticipants = new Map<string, number>()
  eventIds.forEach(eventId => {
    let count = 0
    records.forEach(record => {
      if (record[eventId] === 'TRUE') count++
    })
    eventParticipants.set(eventId, count)
  })
  
  console.log('\n📅 PARTICIPANTS PER EVENT:')
  eventParticipants.forEach((count, eventId) => {
    console.log(`  ${eventId}: ${count} participants`)
  })
  
  // Analyze gender values
  const genderValues = new Map<string, number>()
  records.forEach(record => {
    const value = record.gender || 'EMPTY'
    genderValues.set(value, (genderValues.get(value) || 0) + 1)
  })
  
  console.log('\n👤 GENDER VALUES:')
  const genderArray = Array.from(genderValues.entries()).sort((a, b) => b[1] - a[1])
  genderArray.slice(0, 10).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} occurrences`)
  })
  if (genderArray.length > 10) {
    console.log(`  ... and ${genderArray.length - 10} more unique values`)
  }
  
  // Analyze orientation values
  const orientationValues = new Map<string, number>()
  records.forEach(record => {
    const value = record.orientation || 'EMPTY'
    orientationValues.set(value, (orientationValues.get(value) || 0) + 1)
  })
  
  console.log('\n💕 ORIENTATION VALUES:')
  const orientationArray = Array.from(orientationValues.entries()).sort((a, b) => b[1] - a[1])
  orientationArray.slice(0, 10).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} occurrences`)
  })
  if (orientationArray.length > 10) {
    console.log(`  ... and ${orientationArray.length - 10} more unique values`)
  }
}

validateCSV().catch(console.error)