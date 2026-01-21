import { test, expect } from '@playwright/test'
import { RegisterPage } from '../../pages/RegisterPage'
import { createSupabaseAdminClient } from '../../utils/db-cleanup'
import { generateTestEmail, generateTestPassword } from '../../utils/user-management'

test.describe('Orphan Profile Signup Blocking (POS-391)', () => {
  let orphanProfileId: string | null = null
  let orphanEmail: string | null = null

  test.afterEach(async () => {
    // Clean up the orphan profile after each test
    if (orphanProfileId) {
      const supabase = createSupabaseAdminClient()
      await supabase
        .from('profiles')
        .delete()
        .eq('id', orphanProfileId)
      orphanProfileId = null
      orphanEmail = null
    }
  })

  test('should show error when email matches orphan profile (user_id = NULL)', async ({ page }) => {
    // Step 1: Create an orphan profile directly in database (simulating imported profile)
    const supabase = createSupabaseAdminClient()
    orphanEmail = generateTestEmail()
    const password = generateTestPassword()

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: null, // Orphan profile - no auth account
        email: orphanEmail,
        full_name: 'E2E Test Orphan User',
        social_name: null,
      })
      .select('id')
      .single()

    expect(createError).toBeNull()
    expect(createdProfile).not.toBeNull()
    if (!createdProfile) throw new Error('Profile creation failed')
    orphanProfileId = createdProfile.id

    // Step 2: Try to register with the orphan email
    const registerPage = new RegisterPage(page)
    await registerPage.register(orphanEmail, password)

    // Step 3: Verify error message is displayed in the form
    await expect(page.getByText('Houve um erro no cadastro da sua conta')).toBeVisible()

    // Should NOT redirect - stays on register page
    await expect(page).toHaveURL('/registrar')
  })

  test('should allow signup when no matching profile exists', async ({ page }) => {
    // Use a completely new email that doesn't exist in the database
    const newEmail = generateTestEmail()
    const password = generateTestPassword()

    // Try to register - should succeed and redirect to confirm email page
    const registerPage = new RegisterPage(page)
    await registerPage.register(newEmail, password)

    // Should be redirected to confirm email page
    await expect(page).toHaveURL('/registrar/confirmar-email')
    await expect(page.getByText('Confirme sua conta')).toBeVisible()

    // Clean up: Delete the created user
    const supabase = createSupabaseAdminClient()
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const createdUser = authUsers?.users.find(u => u.email === newEmail)
    if (createdUser) {
      // Delete profile first (if exists)
      await supabase.from('profiles').delete().eq('user_id', createdUser.id)
      // Delete auth user
      await supabase.auth.admin.deleteUser(createdUser.id)
    }
  })

  test('should handle case-insensitive email matching for orphan profiles', async ({ page }) => {
    // Step 1: Create an orphan profile with lowercase email
    const supabase = createSupabaseAdminClient()
    const baseEmail = `orphan-case-test-${Date.now()}@example.com`
    orphanEmail = baseEmail.toLowerCase()
    const password = generateTestPassword()

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: null,
        email: orphanEmail,
        full_name: 'E2E Case Test User',
        social_name: null,
      })
      .select('id')
      .single()

    expect(createError).toBeNull()
    if (!createdProfile) throw new Error('Profile creation failed')
    orphanProfileId = createdProfile.id

    // Step 2: Try to register with UPPERCASE version of the email
    const upperCaseEmail = baseEmail.toUpperCase()
    const registerPage = new RegisterPage(page)
    await registerPage.register(upperCaseEmail, password)

    // Step 3: Should show error (email normalized to lowercase)
    await expect(page.getByText('Houve um erro no cadastro da sua conta')).toBeVisible()
    await expect(page).toHaveURL('/registrar')
  })
})
