import { createSupabaseTestClient } from "./create-supabase-client"

export async function createMockUser(
  email: string,
  password: string,
  options?: { admin?: boolean },
): Promise<string> {
  const { admin } = options || {}
  const supabaseAdmin = await createSupabaseTestClient()

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_mock_user: true,
      },
    })

    if (error) {
      throw error
    }

    const newUser = data.user

    if (admin) {
      const { error: roleError } = await supabaseAdmin.rpc("add_user_role", {
        user_id: newUser.id,
        role_name: "admin",
      })

      if (roleError) {
        console.error(
          `Error assigning admin role to user ${newUser.email}:`,
          roleError,
        )
        throw roleError
      }
    }

    return newUser.id
  } catch (error) {
    console.error(`Caught exception in createMockUser for ${email}:`, error)
    throw error
  }
}
