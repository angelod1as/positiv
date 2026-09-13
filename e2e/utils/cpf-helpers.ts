import { createSupabaseAdminClient } from './db-cleanup'

/**
 * Writes a CPF straight onto the profile and hands back the one that was
 * there. The form refuses a number that does not check out, so a test that
 * needs a broken CPF has to put it there itself — and put the old one back,
 * or every test that runs after it meets the profile update modal.
 */
export async function setProfileCpf(
  profileId: string,
  cpf: string | null
): Promise<string | null> {
  const supabase = createSupabaseAdminClient()

  const { data: before, error: readError } = await supabase
    .from('profiles')
    .select('cpf')
    .eq('id', profileId)
    .single()

  if (readError || !before) {
    throw new Error(`Failed to read the CPF of profile ${profileId}: ${readError?.message}`)
  }

  const { error: writeError } = await supabase
    .from('profiles')
    .update({ cpf })
    .eq('id', profileId)

  if (writeError) {
    throw new Error(`Failed to set the CPF of profile ${profileId}: ${writeError.message}`)
  }

  return before.cpf
}
