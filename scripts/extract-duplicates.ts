import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'fs'
import path from 'path'

async function extractDuplicates() {
  const csvPath = path.resolve('../../mailing.csv')
  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })
  
  // Find duplicate phones
  const phoneMap = new Map<string, any[]>()
  
  records.forEach((record: any) => {
    if (record.phone) {
      const existing = phoneMap.get(record.phone) || []
      existing.push(record)
      phoneMap.set(record.phone, existing)
    }
  })
  
  // Extract only duplicate entries
  const duplicateRows: any[] = []
  
  phoneMap.forEach((rows, phone) => {
    if (rows.length > 1) {
      // Add a separator row for clarity
      duplicateRows.push({
        full_name: `--- PHONE: ${phone} ---`,
        social_name: '---',
        gender: '---',
        orientation: '---',
        pronoums: '---',
        email: '---',
        phone: '---',
        rg: '---',
        flag: '---',
        approved_to_attend: '---',
        skip_this_column: '---',
        general_notes: `${rows.length} DUPLICATES`
      })
      
      rows.forEach(row => duplicateRows.push(row))
      
      // Add empty row for spacing
      duplicateRows.push({})
    }
  })
  
  // Get column headers from first record
  const columns = Object.keys(records[0])
  
  // Convert to CSV
  const csvOutput = stringify(duplicateRows, {
    header: true,
    columns: columns
  })
  
  // Save to file
  const outputPath = path.resolve('./duplicates.csv')
  fs.writeFileSync(outputPath, csvOutput)
  
  console.log(`✅ Extracted ${duplicateRows.length} rows to duplicates.csv`)
  console.log(`📁 File location: ${outputPath}`)
  console.log('\nEdit this file to keep only the rows you want (remove separators and duplicates)')
  console.log('Then save it and I\'ll merge the changes back')
}

extractDuplicates().catch(console.error)