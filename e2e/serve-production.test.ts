import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }))

vi.mock('node:child_process', () => ({ spawn, default: { spawn } }))
const fsDouble = {
  existsSync: () => true,
  statSync: () => ({ isFile: () => true, isDirectory: () => false, mtime: new Date(0) }),
}

vi.mock('node:fs', async importOriginal => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  ...fsDouble,
  default: { ...fsDouble },
}))

function fakeServerProcess() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: vi.fn(),
  })
  spawn.mockReturnValue(child)
  return child
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.E2E_PORT = '5301'
})

afterEach(() => {
  delete process.env.E2E_PORT
})

describe('startProductionServer', () => {
  it('binds the port assigned to this run instead of the shared dev port', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(spawn.mock.calls[0][2].env.PORT).toBe('5301')
  })

  it('waits for the server to announce the run port before resolving', async () => {
    const child = fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    const started = startProductionServer()
    child.stdout.emit('data', Buffer.from('serving on http://localhost:5301'))

    await expect(started).resolves.toBeUndefined()
  })
})
