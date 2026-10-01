import { createSupabaseAdminClient } from './db-cleanup'

type StoredPhone = { phone: number | null; phone_is_international: boolean }

/**
 * Writes a phone straight onto the profile and hands back the one that was
 * there. The form refuses a phone that is not a mobile, so a test that needs
 * one has to put it there itself — and put the old one back, or every test
 * that runs after it meets the profile update modal.
 */
export async function setProfilePhone(
  profileId: string,
  phone: StoredPhone
): Promise<StoredPhone> {
  const supabase = createSupabaseAdminClient()

  const { data: before, error: readError } = await supabase
    .from('profiles')
    .select('phone, phone_is_international')
    .eq('id', profileId)
    .single()

  if (readError || !before) {
    throw new Error(`Failed to read the phone of profile ${profileId}: ${readError?.message}`)
  }

  const { error: writeError } = await supabase
    .from('profiles')
    .update(phone)
    .eq('id', profileId)

  if (writeError) {
    throw new Error(`Failed to set the phone of profile ${profileId}: ${writeError.message}`)
  }

  return before
}
