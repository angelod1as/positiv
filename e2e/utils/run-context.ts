import { randomBytes } from 'node:crypto'

export const DEFAULT_E2E_PORT = 5273

export const ABANDONED_TEST_EVENT_PATTERN = '[E2E:%'

const ABANDONED_AFTER_HOURS = 1

// Mirrors the admin event form: `eventFormSchema.title` in app/business/admin/common.ts
const MAX_EVENT_TITLE_LENGTH = 50

export function generateRunId(): string {
  // Short on purpose: the id is spent from the event title's 50 character
  // budget, and the longest title in the suite would sit exactly on the cap
  // with four random bytes. Three rather than the two it had: two is 65536
  // values inside a millisecond, which collides about one time in fifty across
  // fifty draws — what the test next door kept catching — where three is one
  // in fourteen thousand, and leaves the longest title two characters spare.
  return `${(Date.now() % 1_000_000).toString(36)}${randomBytes(3).toString('hex')}`
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

export function runEmailPrefix(): string {
  return `test-${getRunId()}-`
}

/**
 * Whether an address is one the suite handed out. Needed because an account
 * signed up through the form carries no metadata to be marked with — the app
 * created it, not the fixtures — so the address is all there is to go on.
 */
export function isRunScopedEmail(email: string | undefined | null): boolean {
  return !!email && email.startsWith('test-') && email.endsWith('@example.com')
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
