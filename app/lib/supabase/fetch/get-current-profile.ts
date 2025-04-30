import type { ProfileWithRoles } from "~types/entities.types"
import type { DBClient } from "~types/utils.types"
import { getCurrentUser } from "./get-current-user"

type GetCurrentProfile = (
  supabase: DBClient,
) => Promise<ProfileWithRoles | undefined>
export const getCurrentProfile: GetCurrentProfile = async (supabase) => {
  const user = await getCurrentUser(supabase)

  if (!user) {
    // TODO: Show error toast
    // Skip when not logged on
    return undefined
  }

  const { data, error } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: user.id })
    .single()

  // !data === no profile found === major error
  if (error || !data) {
    // TODO: Show error toast
    console.error("getCurrentProfile", error)
    return undefined
  }

  return data
}
