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

/**
 * Grants or lifts the CPF exemption the way an admin would, clearing the CPF
 * when granting -- an exempt profile holds none. Restoring a test profile lifts
 * the exemption before putting its CPF back.
 */
export async function setProfileCpfExempt(
  profileId: string,
  cpfExempt: boolean
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update(cpfExempt ? { cpf_exempt: true, cpf: null } : { cpf_exempt: false })
    .eq('id', profileId)

  if (error) {
    throw new Error(`Failed to set the CPF exemption of profile ${profileId}: ${error.message}`)
  }
}
