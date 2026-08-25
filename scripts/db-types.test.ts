import { spawn } from 'node:child_process'
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'scripts', 'db-types.sh')

const REAL_TYPES = `export type Json = string | number | boolean | null

export type Database = {
  public: {
    Tables: Record<string, never>
  }
}
`

const ERROR_PAYLOAD =
  '{"_tag":"Error","error":{"code":"UnknownError","message":"error running container: exit 1"}}'

let workDir: string
let outFile: string
let fakeCli: string
let argvLog: string

/**
 * Stands in for `supabase`. `status` answers with a connection string; what
 * `gen types` does is whatever the test wrote into the mode file.
 */
function writeFakeCli(mode: 'ok' | 'fails' | 'error-payload') {
  const body = `#!/bin/sh
printf '%s\\n' "$*" >> ${JSON.stringify(argvLog)}
case "$1" in
  status)
    echo '{ "DB_URL": "postgresql://user:pass@127.0.0.1:54322/postgres" }'
    exit 0
    ;;
esac
case "${mode}" in
  ok)
    cat <<'TYPES'
${REAL_TYPES}TYPES
    exit 0
    ;;
  fails)
    echo ${JSON.stringify(ERROR_PAYLOAD)}
    exit 1
    ;;
  error-payload)
    echo ${JSON.stringify(ERROR_PAYLOAD)}
    exit 0
    ;;
esac
`
  writeFileSync(fakeCli, body)
  chmodSync(fakeCli, 0o755)
}

function runScript(args: string[] = ['--local']) {
  return new Promise<{ code: number; stdout: string; stderr: string }>(
    resolve => {
      const child = spawn(SCRIPT, args, {
        cwd: workDir,
        env: {
          ...process.env,
          SUPABASE_BIN: fakeCli,
          DB_TYPES_OUT: outFile,
        },
      })

      let stdout = ''
      let stderr = ''
      child.stdout.on('data', chunk => (stdout += chunk))
      child.stderr.on('data', chunk => (stderr += chunk))
      child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }))
    },
  )
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'db-types-'))
  outFile = join(workDir, 'database.types.ts')
  fakeCli = join(workDir, 'fake-supabase')
  argvLog = join(workDir, 'argv.log')
  writeFileSync(outFile, REAL_TYPES)
  // The remote path reads SUPABASE_PROJECT_ID from here; the local one must not
  // need it, but the file has to exist for the script to be runnable at all.
  writeFileSync(join(workDir, '.env'), 'SUPABASE_PROJECT_ID=fake-project\n')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('db-types', () => {
  it('writes the types it was given', async () => {
    writeFakeCli('ok')

    const result = await runScript()

    expect(result.code).toBe(0)
    expect(readFileSync(outFile, 'utf8')).toContain('export type Database')
  })

  it('leaves the checked-in types alone when generation fails', async () => {
    writeFakeCli('fails')

    const result = await runScript()

    expect(result.code).not.toBe(0)
    expect(readFileSync(outFile, 'utf8')).toBe(REAL_TYPES)
  })

  it('leaves them alone when the CLI answers with an error payload and exits zero', async () => {
    writeFakeCli('error-payload')

    const result = await runScript()

    expect(result.code).not.toBe(0)
    expect(readFileSync(outFile, 'utf8')).toBe(REAL_TYPES)
  })

  it('asks the running stack for its connection string rather than letting the CLI guess one', async () => {
    writeFakeCli('ok')

    await runScript()

    const argv = readFileSync(argvLog, 'utf8')
    expect(argv).toContain('status')
    expect(argv).toContain('--db-url')
    expect(argv).not.toContain('gen types typescript --local')
  })
})
