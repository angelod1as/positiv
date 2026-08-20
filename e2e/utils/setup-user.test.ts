import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readSetupUser, writeSetupUser } from './setup-user'

describe('the user the setup project logged in as', () => {
  let file: string

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-user-'))
    file = path.join(dir, 'nested', 'user.setup.json')
  })

  afterEach(async () => {
    await fs.rm(path.dirname(path.dirname(file)), { recursive: true, force: true })
  })

  it('reads back what setup wrote down', async () => {
    await writeSetupUser({ userId: 'abc-123', email: 'test-run-1@example.com' }, file)

    expect(await readSetupUser(file)).toEqual({
      userId: 'abc-123',
      email: 'test-run-1@example.com',
    })
  })

  it('says who was meant to write it when nobody did', async () => {
    await expect(readSetupUser(file)).rejects.toThrow(/pnpm test:e2e/)
  })
})
