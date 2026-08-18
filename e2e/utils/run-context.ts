import { randomBytes } from 'node:crypto'

export const DEFAULT_E2E_PORT = 5273

export function generateRunId(): string {
  return `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`
}

export function getRunId(): string {
  if (!process.env.E2E_RUN_ID) {
    process.env.E2E_RUN_ID = generateRunId()
  }

  return process.env.E2E_RUN_ID
}

export function runEventTitlePrefix(): string {
  return `[E2E-TEST:${getRunId()}]`
}

export function runEventTitle(label: string): string {
  return `${runEventTitlePrefix()} ${label}`
}

export function runEventTitlePattern(): string {
  return `${runEventTitlePrefix()}%`
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
