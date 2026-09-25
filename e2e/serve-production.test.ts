import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { spawn, asaasMock } = vi.hoisted(() => ({
  spawn: vi.fn(),
  asaasMock: {
    E2E_ASAAS_API_KEY: 'e2e-key',
    E2E_ASAAS_WEBHOOK_TOKEN: 'e2e-webhook-token',
    startAsaasMockServer: vi.fn(async (port: number) => `http://127.0.0.1:${port}`),
    stopAsaasMockServer: vi.fn(async () => {}),
  },
}))

vi.mock('node:child_process', () => ({ spawn, default: { spawn } }))
vi.mock('./mocks/asaas-mock-server', () => asaasMock)
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
  delete process.env.ASAAS_API_KEY
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

describe('the Asaas the server under test talks to', () => {
  it('is the mock on the port after the server, with payments on', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(asaasMock.startAsaasMockServer).toHaveBeenCalledWith(5302)
    expect(spawn.mock.calls[0][2].env).toMatchObject({
      PAYMENTS_ENABLED: 'true',
      ASAAS_API_URL: 'http://127.0.0.1:5302/v3',
      ASAAS_API_KEY: 'e2e-key',
      ASAAS_WEBHOOK_TOKEN: 'e2e-webhook-token',
    })
  })

  it("never is the developer's own sandbox, whatever .env holds", async () => {
    process.env.ASAAS_API_KEY = 'a-real-sandbox-key'
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(spawn.mock.calls[0][2].env.ASAAS_API_KEY).toBe('e2e-key')
  })

  it('prices with the fees the mock reports, not a local anticipation override', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    const { env } = spawn.mock.calls[0][2]
    expect(env.ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE).toBe('')
    expect(env.ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE).toBe('')
  })

  it('reaches the server, which resolves its own environment instead of inheriting the one resolved before the overrides', async () => {
    // `pnpm test:e2e` runs under `varlock run`, which hands its children the
    // environment it resolved as one serialized blob. A server that reads the
    // blob never sees the variables set above.
    process.env.__VARLOCK_ENV = '{"config":{}}'
    process.env._VARLOCK_ENV_KEY = 'blob-key'
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    const [command, args, { env }] = spawn.mock.calls[0]
    expect([command, ...args.slice(0, 4)]).toEqual(['pnpm', 'exec', 'varlock', 'run', '--'])
    expect(env.__VARLOCK_ENV).toBeUndefined()
    expect(env._VARLOCK_ENV_KEY).toBeUndefined()

    delete process.env.__VARLOCK_ENV
    delete process.env._VARLOCK_ENV_KEY
  })

  it('stops with the server', async () => {
    const child = fakeServerProcess()
    const { startProductionServer, stopProductionServer } = await import('./serve-production')
    void startProductionServer()

    const stopped = stopProductionServer()
    child.emit('exit', 0)
    await stopped

    expect(asaasMock.stopAsaasMockServer).toHaveBeenCalled()
  })
})
