import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { spawn, asaasMock, sanityMock } = vi.hoisted(() => ({
  spawn: vi.fn(),
  sanityMock: {
    E2E_SANITY_PROJECT_ID: 'e2e-project',
    E2E_SANITY_DATASET: 'e2e-dataset',
    startSanityMockServer: vi.fn(async (port: number) => `http://127.0.0.1:${port}`),
    stopSanityMockServer: vi.fn(async () => {}),
  },
  asaasMock: {
    E2E_ASAAS_API_KEY: 'e2e-key',
    E2E_ASAAS_WEBHOOK_TOKEN: 'e2e-webhook-token',
    startAsaasMockServer: vi.fn(async (port: number) => `http://127.0.0.1:${port}`),
    stopAsaasMockServer: vi.fn(async () => {}),
  },
}))

vi.mock('node:child_process', () => ({ spawn, default: { spawn } }))
vi.mock('./mocks/asaas-mock-server', () => asaasMock)
vi.mock('./mocks/sanity-mock-server', () => sanityMock)
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
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.mocked(console.info).mockRestore()
  delete process.env.E2E_PORT
  delete process.env.ASAAS_API_KEY
  delete process.env.SANITY_DATASET
  delete process.env.SANITY_PROJECT_ID
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
  // Whether online payments are on is the admin switch in the database now;
  // the server is only told where Asaas is.
  it('is the mock on the port after the server', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(asaasMock.startAsaasMockServer).toHaveBeenCalledWith(5302)
    expect(spawn.mock.calls[0][2].env).not.toHaveProperty('PAYMENTS_ENABLED')
    expect(spawn.mock.calls[0][2].env).toMatchObject({
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

  it('is listening before the suite is told the server is up', async () => {
    asaasMock.startAsaasMockServer.mockImplementationOnce(() => new Promise<string>(() => {}))
    const child = fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    let started = false
    void startProductionServer().then(() => (started = true))
    child.stdout.emit('data', Buffer.from('serving on http://localhost:5301'))
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(started).toBe(false)
  })

  it('links emails to itself, since a payment email is built with no request to take a host from', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(spawn.mock.calls[0][2].env.APP_URL).toBe('http://localhost:5301')
  })

  it('takes the server down with it when the mock cannot start, so nothing is left holding the port', async () => {
    asaasMock.startAsaasMockServer.mockImplementationOnce(() => Promise.reject(new Error('EADDRINUSE')))
    const child = fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    await expect(startProductionServer()).rejects.toThrow('EADDRINUSE')
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
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

describe('the Sanity the server under test talks to', () => {
  it('is the mock on the port after the Asaas one', async () => {
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(sanityMock.startSanityMockServer).toHaveBeenCalledWith(5303)
    expect(spawn.mock.calls[0][2].env).toMatchObject({
      SANITY_API_HOST: 'http://127.0.0.1:5303',
      SANITY_PROJECT_ID: 'e2e-project',
      SANITY_DATASET: 'e2e-dataset',
    })
  })

  it("never is a real dataset, whatever .env holds", async () => {
    process.env.SANITY_PROJECT_ID = '8ojkallk'
    process.env.SANITY_DATASET = 'production'
    fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    void startProductionServer()

    expect(spawn.mock.calls[0][2].env).toMatchObject({
      SANITY_PROJECT_ID: 'e2e-project',
      SANITY_DATASET: 'e2e-dataset',
    })
  })

  it('is listening before the suite is told the server is up', async () => {
    sanityMock.startSanityMockServer.mockImplementationOnce(() => new Promise<string>(() => {}))
    const child = fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    let started = false
    void startProductionServer().then(() => (started = true))
    child.stdout.emit('data', Buffer.from('serving on http://localhost:5301'))
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(started).toBe(false)
  })

  it('takes the server down with it when the mock cannot start, so nothing is left holding the port', async () => {
    sanityMock.startSanityMockServer.mockImplementationOnce(() => Promise.reject(new Error('EADDRINUSE')))
    const child = fakeServerProcess()
    const { startProductionServer } = await import('./serve-production')

    await expect(startProductionServer()).rejects.toThrow('EADDRINUSE')
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('stops with the server', async () => {
    const child = fakeServerProcess()
    const { startProductionServer, stopProductionServer } = await import('./serve-production')
    void startProductionServer()

    const stopped = stopProductionServer()
    child.emit('exit', 0)
    await stopped

    expect(sanityMock.stopSanityMockServer).toHaveBeenCalled()
  })
})
