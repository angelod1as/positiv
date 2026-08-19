import { randomBytes } from 'node:crypto'

export const DEFAULT_E2E_PORT = 5273

export const ABANDONED_TEST_EVENT_PATTERN = '[E2E:%'

const ABANDONED_AFTER_HOURS = 1

// Mirrors the admin event form: `eventFormSchema.title` in app/business/admin/common.ts
const MAX_EVENT_TITLE_LENGTH = 50

export function generateRunId(): string {
  // Short on purpose: the id is spent from the event title's 50 character
  // budget. Four random bytes rather than two, because two is 65536 values
  // inside a millisecond — enough for two runs starting together to collide,
  // and enough for fifty ids drawn in one tick to collide about one time in
  // fifty, which is what the test next door kept catching.
  return `${(Date.now() % 1_000_000).toString(36)}${randomBytes(4).toString('hex')}`
}

export function getRunId(): string {
  if (!process.env.E2E_RUN_ID) {
    process.env.E2E_RUN_ID = generateRunId()
  }

  return process.env.E2E_RUN_ID
}

export function runEventTitlePrefix(): string {
  return `[E2E:${getRunId()}]`
}

export function runEventTitle(label: string): string {
  const title = `${runEventTitlePrefix()} ${label}`

  if (title.length > MAX_EVENT_TITLE_LENGTH) {
    throw new Error(
      `Event title "${title}" is ${title.length} characters; the admin form accepts at most ${MAX_EVENT_TITLE_LENGTH}. Shorten the label.`
    )
  }

  return title
}

export function runEventTitlePattern(): string {
  return `${runEventTitlePrefix()}%`
}

export function runEmail(label: string): string {
  return `test-${getRunId()}-${label}@example.com`
}

export function runEmailPattern(): string {
  return `test-${getRunId()}-%@example.com`
}

export function getServerPort(): number {
  const configured = process.env.E2E_PORT

  if (!configured) {
    return DEFAULT_E2E_PORT
  }

  const port = Number(configured)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`E2E_PORT must be a port number between 1 and 65535, got "${configured}"`)
  }

  return port
}

export function getBaseUrl(): string {
  return `http://localhost:${getServerPort()}`
}

/**
 * A run takes at most a few minutes and the lock keeps runs from overlapping,
 * so test data older than this belongs to a run that never reached its
 * teardown.
 */
export function abandonedBefore(now: Date = new Date()): string {
  return new Date(now.getTime() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000).toISOString()
}
