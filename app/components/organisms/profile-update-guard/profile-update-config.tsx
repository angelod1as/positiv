import type { ReactNode } from "react"

/**
 * Profile Update Guard Configuration
 *
 * This file controls the modal that forces users to update required profile fields.
 * When a user is missing a required field, they'll see a non-dismissable modal
 * blocking access to most pages until they update their profile.
 *
 * HOW TO ADD A NEW REQUIRED PROFILE FIELD:
 *
 * 1. **Database Migration** - Add the column to profiles table:
 *    - Create migration: `supabase/migrations/YYYYMMDDHHMMSS_add_[field]_to_profiles.sql`
 *    - Example: `ALTER TABLE profiles ADD COLUMN new_field text[];`
 *
 * 2. **Update RPC Function** - Add field to get_profile_with_roles:
 *    - Create migration: `supabase/migrations/YYYYMMDDHHMMSS_add_[field]_to_rpc.sql`
 *    - Drop and recreate the function (see 20251024141846 migration as example)
 *    - Add field to RETURNS TABLE declaration
 *    - Add field to SELECT statement (p.new_field)
 *    - Run: `supabase db reset` then `pnpm db:types --local`
 *
 * 3. **Update This Config File**:
 *    - Add field name to `requiredFields` array below
 *    - Update `message` JSX to explain why the field is needed
 *    - Update `targetPath` if field is on a different form page
 *    - Add any new form pages to `exemptPaths` if needed
 *
 * 4. **Update Root Loader** (app/root.tsx):
 *    - Add check in loader: `needsProfileUpdate = !currentProfile.new_field`
 *    - Combine with existing checks using || or &&
 *    - Example: `needsProfileUpdate = !currentProfile.race_color || !currentProfile.new_field`
 *
 * 5. **Ensure Form Handles Field** - Verify the target page form includes the field:
 *    - Check that the field exists in the form at `targetPath`
 *    - Verify form validation schema includes the field
 *    - Ensure form action saves the field to database
 *
 * NOTES:
 * - The guard only shows for logged-in users
 * - Modal appears on all pages EXCEPT those in `exemptPaths`
 * - Modal is non-dismissable (no ESC, no click-outside, no X button)
 * - Once user fills required fields, modal never appears again
 * - `targetPath` should point to the form page where user can fill the required fields
 */

export const PROFILE_REQUIREMENTS = {
  requiredFields: ["race_color"] as string[],
  targetPath: "/conta/dados-basicos",
  message: (
    <div>
      <p>Precisamos que você atualize seus dados básicos.</p>
      <p className="mt-2">
        Estamos solicitando informações sobre raça ou cor para melhorar nossos
        dados demográficos.
      </p>
    </div>
  ) as ReactNode,
  exemptPaths: [
    "/",
    "/entrar",
    "/entrar/esqueci",
    "/registrar",
    "/registrar/callback",
    "/registrar/confirm",
    "/conta",
    "/conta/mudar-senha",
    "/conta/termos-e-condicoes",
    "/conta/dados-basicos",
    "/conta/dados-basicos-cont",
  ] as string[],
}

export const isExemptPath = (path: string): boolean => {
  return PROFILE_REQUIREMENTS.exemptPaths.includes(path)
}