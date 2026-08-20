import fs from 'fs/promises'
import path from 'path'

export type SetupUser = {
  /** The auth user's id, which is what a profile is linked to. */
  userId: string
  email: string
}

const defaultFile = path.join(import.meta.dirname, '..', '.auth', 'user.setup.json')

export async function writeSetupUser(user: SetupUser, file = defaultFile): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(user), 'utf8')
}

/**
 * Who the suite logged in as, by identity rather than by recency. The profile
 * lookup used to take whatever had been created in the last five minutes,
 * which stopped being the setup user the moment the earlier projects took
 * longer than that to run — and picked up accounts the registration specs had
 * signed up in the meantime.
 */
export async function readSetupUser(file = defaultFile): Promise<SetupUser> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as SetupUser
  } catch {
    throw new Error(
      `No setup user was recorded at ${file}. The setup project writes it, so run the suite with pnpm test:e2e.`,
    )
  }
}
