import { parse } from 'csv-parse/sync'
import { randomUUID } from 'crypto'

export interface CSVRow {
  title: string
  description: string
  emoji: string
  location: string
  ticket_price: string
  total_spots: string
  time_event_start: string
  event_type: string
}

export interface ProcessedEvent {
  id: string
  title: string
  description: string
  emoji: string
  location: string
  ticket_price: number
  total_spots: number
  time_event_start: string
  time_event_end: string
  time_application_start: string
  time_application_end: string
  time_interviews_start: string
  time_interviews_end: string
  time_group_start: string
  time_group_end: string
  time_payment_start: string
  time_payment_end: string
  event_status: string
  event_type: string
  created_at: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface ProcessResult {
  valid: ProcessedEvent[]
  errors: Array<{ row: number; error: string }>
}

const REQUIRED_COLUMNS = [
  'title',
  'description',
  'emoji',
  'location',
  'ticket_price',
  'total_spots',
  'time_event_start',
  'event_type'
]

export async function processCSV(csvContent: string): Promise<ProcessResult> {
  const result: ProcessResult = {
    valid: [],
    errors: []
  }

  if (!csvContent || csvContent.trim() === '') {
    result.errors.push({ row: 0, error: 'Empty CSV file' })
    return result
  }

  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVRow[]

    if (records.length === 0) {
      result.errors.push({ row: 0, error: 'No data rows found' })
      return result
    }

    // Check for required columns
    const headers = Object.keys(records[0])
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      result.errors.push({ 
        row: 0, 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      })
      return result
    }

    // Process each row
    records.forEach((row, index) => {
      const validation = validateRow(row, index + 2) // +2 because row 1 is headers
      
      if (!validation.isValid) {
        result.errors.push({
          row: index + 2,
          error: validation.errors.join('; ')
        })
      } else {
        // Process valid row
        const processedEvent = processRow(row)
        if (processedEvent) {
          result.valid.push(processedEvent)
        }
      }
    })
  } catch (error) {
    result.errors.push({ 
      row: 0, 
      error: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    })
  }

  return result
}

export function validateRow(row: CSVRow, _rowNumber: number): ValidationResult {
  const errors: string[] = []

  // Title validation (2-50 characters)
  if (!row.title || row.title.length < 2 || row.title.length > 50) {
    errors.push('Title must be between 2 and 50 characters')
  }

  // Description validation (2-255 characters)
  if (!row.description || row.description.length < 2 || row.description.length > 255) {
    errors.push('Description must be between 2 and 255 characters')
  }

  // Emoji validation
  if (!isValidEmoji(row.emoji)) {
    errors.push('Invalid emoji')
  }

  // Location validation (2-255 characters)
  if (!row.location || row.location.length < 2 || row.location.length > 255) {
    errors.push('Location must be between 2 and 255 characters')
  }

  // Ticket price validation
  const ticketPrice = parseFloat(row.ticket_price)
  if (isNaN(ticketPrice)) {
    errors.push('Ticket price must be a valid number')
  } else if (ticketPrice < 1) {
    errors.push('Ticket price must be at least 1')
  }

  // Total spots validation
  const totalSpots = parseInt(row.total_spots, 10)
  if (isNaN(totalSpots)) {
    errors.push('Total spots must be a valid number')
  } else if (totalSpots < 1) {
    errors.push('Total spots must be at least 1')
  } else if (!Number.isInteger(parseFloat(row.total_spots))) {
    errors.push('Total spots must be a whole number')
  }

  // Date validation
  if (!isValidDate(row.time_event_start)) {
    errors.push('Invalid date format for time_event_start')
  }

  // Event type validation
  if (row.event_type !== 'regular' && row.event_type !== 'bdsm') {
    errors.push("Event type must be 'regular' or 'bdsm'")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

function isValidEmoji(str: string): boolean {
  // Simple emoji validation - checks if string contains emoji characters
  const emojiRegex = /[\p{Emoji}]/u
  return emojiRegex.test(str) && str.length <= 4
}

function isValidDate(dateStr: string): boolean {
  // Expected format: YYYY-MM-DD HH:MM:SS
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  if (!regex.test(dateStr)) {
    return false
  }
  
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function processRow(row: CSVRow): ProcessedEvent | null {
  try {
    // Calculate derived dates
    const derivedDates = calculateDerivedDates(row.time_event_start)
    
    return {
      id: randomUUID(),
      title: row.title,
      description: row.description,
      emoji: row.emoji,
      location: row.location,
      ticket_price: parseFloat(row.ticket_price),
      total_spots: parseInt(row.total_spots, 10),
      ...derivedDates,
      event_status: 'Completed',
      event_type: row.event_type,
      created_at: derivedDates.time_application_start // Use application start as created_at
    }
  } catch (error) {
    console.error('Error processing row:', error)
    return null
  }
}

function calculateDerivedDates(eventStartStr: string): {
  time_event_start: string
  time_event_end: string
  time_application_start: string
  time_application_end: string
  time_interviews_start: string
  time_interviews_end: string
  time_group_start: string
  time_group_end: string
  time_payment_start: string
  time_payment_end: string
} {
  const eventStart = new Date(eventStartStr)
  
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }
  
  const setTime = (date: Date, hours: number, minutes: number = 0): Date => {
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }
  
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  return {
    time_event_start: eventStartStr,
    time_event_end: formatDate(setTime(eventStart, 23, 59)),
    time_application_start: formatDate(setTime(addDays(eventStart, -30), 8, 0)),
    time_application_end: formatDate(setTime(addDays(eventStart, -23), 22, 0)),
    time_interviews_start: formatDate(setTime(addDays(eventStart, -21), 8, 0)),
    time_interviews_end: formatDate(setTime(addDays(eventStart, -9), 22, 0)),
    time_group_start: formatDate(setTime(addDays(eventStart, -7), 8, 0)),
    time_group_end: formatDate(setTime(addDays(eventStart, 30), 22, 0)),
    time_payment_start: formatDate(setTime(addDays(eventStart, -21), 8, 0)),
    time_payment_end: formatDate(setTime(addDays(eventStart, -9), 22, 0))
  }
}

export function generateSQL(events: ProcessedEvent[]): string {
  if (events.length === 0) {
    return ''
  }
  
  const escapeString = (str: string): string => {
    return str.replace(/'/g, "''")
  }
  
  let sql = 'BEGIN;\n\n'
  
  events.forEach(event => {
    const eventDate = event.time_event_start.split(' ')[0]
    sql += `-- Evento: ${event.title} (${eventDate})\n`
    sql += `INSERT INTO events (
  id, title, description, emoji, location, ticket_price, total_spots,
  time_event_start, time_event_end, time_application_start, time_application_end,
  time_interviews_start, time_interviews_end, time_group_start, time_group_end,
  time_payment_start, time_payment_end, event_status, event_type, created_at
) VALUES (
  gen_random_uuid(), 
  '${escapeString(event.title)}',
  '${escapeString(event.description)}',
  '${escapeString(event.emoji)}',
  '${escapeString(event.location)}',
  ${event.ticket_price},
  ${event.total_spots},
  '${event.time_event_start}',
  '${event.time_event_end}',
  '${event.time_application_start}',
  '${event.time_application_end}',
  '${event.time_interviews_start}',
  '${event.time_interviews_end}',
  '${event.time_group_start}',
  '${event.time_group_end}',
  '${event.time_payment_start}',
  '${event.time_payment_end}',
  '${event.event_status}',
  '${event.event_type}',
  '${event.created_at}'
);\n\n`
  })
  
  sql += 'COMMIT;'
  
  return sql
}