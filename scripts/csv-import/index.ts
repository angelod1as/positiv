#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs'
import { basename } from 'path'
import { processCSV, generateSQL } from './import-events'

interface CLIArgs {
  csvFile?: string
  outputFile?: string
  dryRun: boolean
  help: boolean
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  const result: CLIArgs = {
    dryRun: false,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        result.dryRun = true
        break
      case '--help':
      case '-h':
        result.help = true
        break
      case '--output':
      case '-o':
        if (i + 1 < args.length) {
          result.outputFile = args[++i]
        }
        break
      default:
        if (!args[i].startsWith('-') && !result.csvFile) {
          result.csvFile = args[i]
        }
    }
  }

  return result
}

function printHelp() {
  console.log(`
CSV Event Import Script

Usage: tsx scripts/csv-import/index.ts [options] <csv-file>

Options:
  --dry-run          Run validation only, don't generate SQL
  --output, -o       Output SQL to file (default: stdout)
  --help, -h         Show this help message

CSV Format:
  Required columns:
  - title (2-50 characters)
  - description (2-255 characters)
  - emoji (valid emoji)
  - location (2-255 characters)
  - ticket_price (numeric, min 1)
  - total_spots (integer, min 1)
  - time_event_start (YYYY-MM-DD HH:MM:SS)
  - event_type (regular or bdsm)

Example:
  tsx scripts/csv-import/index.ts events.csv --output events.sql
  tsx scripts/csv-import/index.ts events.csv --dry-run
`)
}

function printReport(
  result: Awaited<ReturnType<typeof processCSV>>,
  csvFile: string,
  dryRun: boolean
) {
  console.log('\n=== IMPORT REPORT ===')
  console.log(`CSV File: ${csvFile}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (validation only)' : 'FULL'}`)
  console.log(`Valid events: ${result.valid.length}`)
  console.log(`Errors: ${result.errors.length}`)
  
  if (result.errors.length > 0) {
    console.log('\n=== VALIDATION ERRORS ===')
    result.errors.forEach(error => {
      console.log(`Row ${error.row}: ${error.error}`)
    })
  }
  
  if (result.valid.length > 0) {
    console.log('\n=== VALID EVENTS ===')
    result.valid.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} - ${event.time_event_start} (${event.event_type})`)
    })
  }
}

async function main() {
  const args = parseArgs()
  
  if (args.help) {
    printHelp()
    process.exit(0)
  }
  
  if (!args.csvFile) {
    console.error('Error: CSV file path is required')
    printHelp()
    process.exit(1)
  }
  
  try {
    // Read CSV file
    const csvContent = readFileSync(args.csvFile, 'utf-8')
    
    // Process CSV
    const result = await processCSV(csvContent)
    
    // Print report
    printReport(result, basename(args.csvFile), args.dryRun)
    
    if (!args.dryRun && result.valid.length > 0) {
      // Generate SQL
      const sql = generateSQL(result.valid)
      
      if (args.outputFile) {
        writeFileSync(args.outputFile, sql)
        console.log(`\nSQL written to: ${args.outputFile}`)
      } else {
        console.log('\n=== GENERATED SQL ===')
        console.log(sql)
      }
    }
    
    // Exit with error code if there were errors
    if (result.errors.length > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})