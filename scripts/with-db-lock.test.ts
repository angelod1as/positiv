import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'scripts', 'with-db-lock.sh')

let workDir: string
let lockDir: string

function runLocked(command: string, extraEnv: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>(resolve => {
    const child = spawn(SCRIPT, ['sh', '-c', command], {
      env: { ...process.env, DB_LOCK_DIR: lockDir, ...extraEnv },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => (stdout += chunk))
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'db-lock-'))
  lockDir = join(workDir, 'lock')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('with-db-lock', () => {
  it('runs the command it was given', async () => {
    const result = await runLocked('echo ran')

    expect(result.stdout).toContain('ran')
  })

  it('forwards the exit code so a failing suite still fails', async () => {
    const result = await runLocked('exit 3')

    expect(result.code).toBe(3)
  })

  it('hands the command a run id and a port', async () => {
    const result = await runLocked('echo "id=$E2E_RUN_ID port=$E2E_PORT"')

    expect(result.stdout).toMatch(/id=[a-z0-9]+ port=\d+/)
  })

  it('keeps a run id and port the caller already chose', async () => {
    const result = await runLocked('echo "id=$E2E_RUN_ID port=$E2E_PORT"', {
      E2E_RUN_ID: 'chosen',
      E2E_PORT: '5399',
    })

    expect(result.stdout).toContain('id=chosen port=5399')
  })

  it('never lets two runs overlap', async () => {
    const trace = join(workDir, 'trace')
    const command = `echo start >> ${trace}; sleep 0.4; echo end >> ${trace}`

    await Promise.all([runLocked(command), runLocked(command)])

    expect(readFileSync(trace, 'utf8')).toBe('start\nend\nstart\nend\n')
  })

  it('releases the lock when the command fails', async () => {
    await runLocked('exit 1')
    const result = await runLocked('echo second-run')

    expect(result.stdout).toContain('second-run')
  })

  it('takes over a lock whose owner is gone', async () => {
    mkdirSync(lockDir, { recursive: true })
    writeFileSync(join(lockDir, 'owner'), 'pid=999999\nworktree=/gone\nstarted=1\n')

    const result = await runLocked('echo took-over', { DB_LOCK_WAIT_TIMEOUT: '10' })

    expect(result.stdout).toContain('took-over')
  })

  it('gives up rather than waiting forever on a live holder', async () => {
    const blocker = runLocked('sleep 3')
    await new Promise(resolve => setTimeout(resolve, 300))

    const result = await runLocked('echo never', { DB_LOCK_WAIT_TIMEOUT: '1' })
    await blocker

    expect(result.code).not.toBe(0)
    expect(result.stdout).not.toContain('never')
  }, 10000)
})

describe('the scripts that reach the shared database', () => {
  const scripts = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).scripts as Record<
    string,
    string
  >

  it.each(['test:e2e', 'test:e2e:ui', 'test:integration', 'test:integration:changed'])(
    '%s waits for its turn',
    name => {
      expect(scripts[name]).toContain('scripts/with-db-lock.sh')
    }
  )
})
