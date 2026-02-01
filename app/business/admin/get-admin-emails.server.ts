import { db } from "~/lib/supabase/db.server"

/**
 * Get all admin emails from the database
 * Queries profiles table joined with user_roles to find all users with admin role
 * @returns Promise<string[]> Array of admin email addresses
 */
export async function getAdminEmails(): Promise<string[]> {
  const result = await db
    .selectFrom("profiles")
    .innerJoin("user_roles", "profiles.user_id", "user_roles.user_id")
    .select("profiles.email")
    .where("user_roles.role_name", "=", "admin")
    .distinct()
    .execute()

  return result.map((row) => row.email)
}
