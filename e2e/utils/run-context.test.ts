import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_E2E_PORT,
  generateRunId,
  getBaseUrl,
  getRunId,
  getServerPort,
  runEmailPattern,
  runEventTitle,
  runEventTitlePattern,
  runEventTitlePrefix,
} from './run-context'

const ORIGINAL_RUN_ID = process.env.E2E_RUN_ID
const ORIGINAL_PORT = process.env.E2E_PORT

beforeEach(() => {
  delete process.env.E2E_RUN_ID
  delete process.env.E2E_PORT
})

afterEach(() => {
  if (ORIGINAL_RUN_ID === undefined) delete process.env.E2E_RUN_ID
  else process.env.E2E_RUN_ID = ORIGINAL_RUN_ID

  if (ORIGINAL_PORT === undefined) delete process.env.E2E_PORT
  else process.env.E2E_PORT = ORIGINAL_PORT
})

describe('generateRunId', () => {
  it('produces a distinct id on every call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRunId()))

    expect(ids.size).toBe(50)
  })

  it('only uses characters that are safe inside emails and SQL like patterns', () => {
    expect(generateRunId()).toMatch(/^[a-z0-9]+$/)
  })
})

describe('getRunId', () => {
  it('reuses the id provided by the environment', () => {
    process.env.E2E_RUN_ID = 'abc123'

    expect(getRunId()).toBe('abc123')
  })

  it('generates an id once and keeps returning the same one', () => {
    const first = getRunId()

    expect(getRunId()).toBe(first)
  })

  it('publishes the generated id so child processes inherit it', () => {
    const runId = getRunId()

    expect(process.env.E2E_RUN_ID).toBe(runId)
  })
})

describe('event titles', () => {
  it('scopes the prefix to the current run', () => {
    process.env.E2E_RUN_ID = 'abc123'

    expect(runEventTitlePrefix()).toBe('[E2E-TEST:abc123]')
  })

  it('builds a title from the scoped prefix and a label', () => {
    process.env.E2E_RUN_ID = 'abc123'

    expect(runEventTitle('Closed Event')).toBe('[E2E-TEST:abc123] Closed Event')
  })

  it('matches only titles belonging to the current run', () => {
    process.env.E2E_RUN_ID = 'abc123'

    expect(runEventTitlePattern()).toBe('[E2E-TEST:abc123]%')
  })

  it('does not match a title created by another run', () => {
    process.env.E2E_RUN_ID = 'abc123'
    const pattern = runEventTitlePattern()

    expect('[E2E-TEST:zzz999] Event 1'.startsWith(pattern.slice(0, -1))).toBe(false)
  })
})

describe('runEmailPattern', () => {
  it('scopes the like pattern to the current run', () => {
    process.env.E2E_RUN_ID = 'abc123'

    expect(runEmailPattern()).toBe('test-abc123-%@example.com')
  })
})

describe('getServerPort', () => {
  it('falls back to a port away from the dev server default', () => {
    expect(getServerPort()).toBe(DEFAULT_E2E_PORT)
    expect(DEFAULT_E2E_PORT).not.toBe(5173)
  })

  it('uses the port assigned to this run', () => {
    process.env.E2E_PORT = '5301'

    expect(getServerPort()).toBe(5301)
  })

  it('rejects a port that is not a usable number instead of silently sharing the default', () => {
    process.env.E2E_PORT = 'not-a-port'

    expect(() => getServerPort()).toThrow(/E2E_PORT/)
  })
})

describe('getBaseUrl', () => {
  it('points at the port assigned to this run', () => {
    process.env.E2E_PORT = '5301'

    expect(getBaseUrl()).toBe('http://localhost:5301')
  })
})
