import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSupabaseAdminClient } from './db-cleanup'

export type LikertStatement = { key: string; text: string }

// The scale the Sanity mock serves, read rather than imported for the same
// reason the mock reads it: Playwright loads specs as native ESM.
export function readLikertStatements(): LikertStatement[] {
  const fixture = JSON.parse(
    readFileSync(join(process.cwd(), 'e2e', 'fixtures', 'likert-scale.json'), 'utf8'),
  ) as { statements: LikertStatement[] }
  return fixture.statements
}

export async function setLikertSettings({
  enabled,
  required,
}: {
  enabled: boolean
  required: boolean
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert({ id: true, likert_enabled: enabled, likert_required: required })
  if (error) throw new Error(`Could not switch the Likert scale: ${error.message}`)
}

export async function getProfileId(userId: string): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (error || !data) throw new Error(`No profile for user ${userId}: ${error?.message}`)
  return data.id
}
