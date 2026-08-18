import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  delete process.env.E2E_RUN_ID
  process.env.E2E_PORT = '5301'
})

afterEach(() => {
  delete process.env.E2E_RUN_ID
  delete process.env.E2E_PORT
})

describe('playwright config', () => {
  it('publishes a run id so every worker process inherits the same one', async () => {
    await import('../playwright.config')

    expect(process.env.E2E_RUN_ID).toMatch(/^[a-z0-9]+$/)
  })

  it('keeps a run id the caller already assigned', async () => {
    process.env.E2E_RUN_ID = 'assigned'

    await import('../playwright.config')

    expect(process.env.E2E_RUN_ID).toBe('assigned')
  })

  it('sends the browser to the port the server was told to bind', async () => {
    const config = await import('../playwright.config')

    expect(config.default.use?.baseURL).toBe('http://localhost:5301')
  })
})
