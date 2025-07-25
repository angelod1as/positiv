#!/usr/bin/env tsx

import { select, confirm, input } from "@inquirer/prompts"
import { config } from "dotenv"
import * as fs from "fs/promises"
import { join } from "path"
import {
  fetchAllEvents,
  findEventMatches,
  loadProgress,
  saveProgress,
  type Event,
  type EventMapping,
} from "../../../app/scripts/temp/migration/generate-event-mapping"

// Load environment variables
config()

// CSV columns from the Linear ticket
const CSV_COLUMNS = [
  "04/02/23",
  "01/07/23",
  "26/08/23",
  "11/11/23",
  "27/01/24",
  "Sáfica (24/02/24)",
  "Águas de março (16/03/24)",
  "Amarradona (18/05/24)",
  "Julina (20/07/24)",
  "Fim de ânus",
  "Renovadah",
  "Carnavrau",
  "Segurando Velas 19/04/25",
  "Rapa do Tacho",
  "MaiOral 17/05/25",
  "Corpus peladus",
]

const OUTPUT_FILE = join(process.cwd(), "scripts/temp/migration/event-mapping.ts")

async function promptForEventMapping(
  columnName: string,
  matches: Event[],
  events: Event[],
): Promise<EventMapping> {
  console.info(`\n🔍 Mapeando: '${columnName}'`)

  if (matches.length === 0) {
    console.info("❌ Nenhum evento encontrado")
    const action = await select({
      message: "Opções:",
      choices: [
        { value: "search", name: "Buscar manualmente (digitar parte do nome)" },
        { value: "list", name: "Listar todos os eventos" },
        { value: "skip", name: "Marcar como não encontrado" },
      ],
    })

    if (action === "search") {
      const searchTerm = await input({
        message: "Digite parte do nome do evento:",
      })
      const searchMatches = events.filter(
        (e) =>
          e.title &&
          e.title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (searchMatches.length > 0) {
        return promptForEventMapping(columnName, searchMatches, events)
      } else {
        console.info("Nenhum evento encontrado com esse termo")
        return { eventId: null, comment: "Não encontrado após busca manual" }
      }
    } else if (action === "list") {
      const selectedEvent = await select({
        message: "Selecione o evento:",
        choices: [
          { value: null, name: "Nenhum dos listados" },
          ...events
            .filter((e) => e.title)
            .map((e) => ({
              value: e.id,
              name: `${e.title} - ${
                e.time_event_start
                  ? new Date(e.time_event_start).toLocaleDateString("pt-BR")
                  : "Sem data"
              } (id: ${e.id})`,
            })),
        ],
      })
      return {
        eventId: selectedEvent,
        comment: selectedEvent ? "Selecionado manualmente" : "Não encontrado",
      }
    } else {
      return { eventId: null, comment: "Marcado como não encontrado" }
    }
  } else if (matches.length === 1) {
    console.info("✅ Match encontrado:")
    const event = matches[0]
    console.info(
      `→ "${event.title}" em ${
        event.time_event_start
          ? new Date(event.time_event_start).toLocaleDateString("pt-BR")
          : "Sem data"
      } (id: ${event.id})`,
    )

    const confirmed = await confirm({
      message: "Confirmar?",
      default: true,
    })

    if (confirmed) {
      return { eventId: event.id, comment: "Confirmado" }
    } else {
      return promptForEventMapping(columnName, [], events)
    }
  } else {
    console.info("⚠️  Múltiplos eventos encontrados:")
    const choices = [
      ...matches.map((e, index) => ({
        value: e.id,
        name: `${index + 1}. "${e.title}" - ${
          e.time_event_start
            ? new Date(e.time_event_start).toLocaleDateString("pt-BR")
            : "Sem data"
        } (id: ${e.id})`,
      })),
      { value: "search", name: "Buscar outros" },
      { value: "skip", name: "Marcar como ambíguo" },
    ]

    const selected = await select({
      message: "Escolha:",
      choices,
    })

    if (selected === "search") {
      return promptForEventMapping(columnName, [], events)
    } else if (selected === "skip") {
      return { eventId: null, comment: "Múltiplos matches - ambíguo" }
    } else {
      return { eventId: selected, comment: "Selecionado entre múltiplos" }
    }
  }
}

async function generateMappingFile(mappings: Record<string, EventMapping>) {
  const content = `// Generated event mapping from CSV columns to event IDs
// Generated at: ${new Date().toISOString()}

export const eventMapping: Record<string, string | null> = {
${Object.entries(mappings)
  .map(([column, mapping]) => {
    const comment = mapping.comment ? ` // ${mapping.comment}` : ""
    const value = mapping.eventId ? `"${mapping.eventId}"` : "null"
    return `  "${column}": ${value},${comment}`
  })
  .join("\n")}
}
`

  await fs.writeFile(OUTPUT_FILE, content)
  console.info(`\n📝 Arquivo de mapeamento salvo em: ${OUTPUT_FILE}`)
}

async function main() {
  console.info("🚀 Iniciando geração de mapeamento de eventos...\n")

  // Load existing progress if any
  let progress = await loadProgress()
  let startIndex = 0

  if (progress) {
    console.info("📂 Progresso anterior encontrado")
    const resume = await confirm({
      message: `Continuar de onde parou? (${progress.currentIndex}/${progress.totalColumns})`,
      default: true,
    })

    if (!resume) {
      progress = null
    } else {
      startIndex = progress.currentIndex
    }
  }

  // Initialize progress if not resuming
  if (!progress) {
    progress = {
      mappings: {},
      currentIndex: 0,
      totalColumns: CSV_COLUMNS.length,
    }
  }

  // Fetch all events from database
  console.info("📊 Buscando eventos do banco de dados...")
  const events = await fetchAllEvents()
  console.info(`✅ ${events.length} eventos encontrados\n`)

  // Process each column
  for (let i = startIndex; i < CSV_COLUMNS.length; i++) {
    const column = CSV_COLUMNS[i]
    console.info(`\n[${i + 1}/${CSV_COLUMNS.length}]`)

    // Skip if already mapped
    if (progress.mappings[column]) {
      console.info(`✓ '${column}' já mapeado`)
      continue
    }

    // Find potential matches
    const matches = findEventMatches(column, events)
    const matchedEvents = matches.map((m) => m.event)

    // Get user input for mapping
    const mapping = await promptForEventMapping(column, matchedEvents, events)

    // Save mapping
    progress.mappings[column] = mapping
    progress.currentIndex = i + 1

    // Save progress after each mapping
    await saveProgress(progress)
  }

  // Generate final mapping file
  await generateMappingFile(progress.mappings)

  // Clean up progress file
  try {
    await fs.unlink(
      join(process.cwd(), "scripts/temp/migration/mapping-progress.json"),
    )
  } catch {
    // Ignore if file doesn't exist
  }

  console.info("\n✨ Mapeamento concluído!")
}

// Run the script
main().catch((error) => {
  console.error("❌ Erro:", error)
  process.exit(1)
})