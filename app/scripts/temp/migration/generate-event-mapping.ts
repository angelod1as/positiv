import { db } from "~/lib/supabase/db.server"
import * as fs from "fs/promises"
import { join } from "path"

export interface Event {
  id: string
  title: string | null
  time_event_start: string | null
}

export interface EventMapping {
  eventId: string | null
  comment?: string
}

export interface MappingProgress {
  mappings: Record<string, EventMapping>
  currentIndex: number
  totalColumns: number
}

export interface DateParseResult {
  hasDate: boolean
  date?: Date
  originalFormat?: string
  eventName?: string
}

export interface EventMatch {
  event: Event
  matchType: "exact_date" | "name_and_date" | "fuzzy_name" | "partial_name"
  score: number
}

const PROGRESS_FILE = join(process.cwd(), "scripts/temp/migration/mapping-progress.json")

export async function fetchAllEvents(): Promise<Event[]> {
  const events = await db
    .selectFrom("events")
    .select(["id", "title", "time_event_start"])
    .orderBy("time_event_start", "desc")
    .execute()
  
  return events
}

export function parseEventDate(columnName: string): DateParseResult {
  // Match DD/MM/YY format
  const dateOnlyMatch = columnName.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
    const date = new Date(`${fullYear}-${month}-${day}`)
    
    return {
      hasDate: true,
      date,
      originalFormat: columnName,
    }
  }

  // Match event name with date in parentheses
  const nameWithDateMatch = columnName.match(/^(.+?)\s*\((\d{2})\/(\d{2})\/(\d{2})\)$/)
  if (nameWithDateMatch) {
    const [, eventName, day, month, year] = nameWithDateMatch
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
    const date = new Date(`${fullYear}-${month}-${day}`)
    
    return {
      hasDate: true,
      date,
      originalFormat: `${day}/${month}/${year}`,
      eventName: eventName.trim(),
    }
  }

  // No date found
  return {
    hasDate: false,
    eventName: columnName,
  }
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "") // Keep only alphanumeric
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1)
  const norm2 = normalizeString(str2)
  
  if (norm1 === norm2) return 1
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8
  
  // Simple character overlap score
  const chars1 = new Set(norm1.split(''))
  const chars2 = new Set(norm2.split(''))
  const intersection = new Set([...chars1].filter(x => chars2.has(x)))
  const union = new Set([...chars1, ...chars2])
  
  return intersection.size / union.size
}

export function findEventMatches(columnName: string, events: Event[]): EventMatch[] {
  const parsedDate = parseEventDate(columnName)
  const matches: EventMatch[] = []

  for (const event of events) {
    if (!event.time_event_start) continue

    const eventDate = new Date(event.time_event_start)
    const eventDateStr = eventDate.toISOString().split('T')[0]

    // Check exact date match
    if (parsedDate.hasDate && parsedDate.date) {
      const columnDateStr = parsedDate.date.toISOString().split('T')[0]
      if (columnDateStr === eventDateStr) {
        let matchType: "exact_date" | "name_and_date" = "exact_date"
        
        if (parsedDate.eventName && event.title) {
          const eventNameNorm = normalizeString(event.title)
          const searchNameNorm = normalizeString(parsedDate.eventName)
          if (eventNameNorm.includes(searchNameNorm) || searchNameNorm.includes(eventNameNorm)) {
            matchType = "name_and_date"
          }
        }
        
        matches.push({
          event,
          matchType,
          score: matchType === "name_and_date" ? 1 : 0.9,
        })
        continue
      }
    }

    // Check name similarity if no date or date doesn't match
    if (event.title) {
      const searchTerm = parsedDate.eventName || columnName
      const similarity = calculateSimilarity(searchTerm, event.title)
      
      if (similarity > 0.5) {
        matches.push({
          event,
          matchType: similarity > 0.8 ? "partial_name" : "fuzzy_name",
          score: similarity,
        })
      }
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}

export async function saveProgress(progress: MappingProgress): Promise<void> {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

export async function loadProgress(): Promise<MappingProgress | null> {
  try {
    const content = await fs.readFile(PROGRESS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}