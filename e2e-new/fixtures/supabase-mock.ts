import { type Page } from '@playwright/test'
import { createSupabaseAdminClient } from '../utils/db-cleanup'

/**
 * Confirms a user's email using Supabase Admin API.
 * This simulates clicking the email confirmation link without needing to access emails.
 */
export async function confirmUserEmail(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  // Get the user by email
  const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers()
  
  if (getUserError) {
    throw new Error(`Failed to list users: ${getUserError.message}`)
  }
  
  const user = users.find(u => u.email === email)
  
  if (!user) {
    throw new Error(`User not found with email: ${email}`)
  }
  
  // Update the user to confirm their email
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      email_confirm: true,
      user_metadata: {
        email_verified: true
      }
    }
  )
  
  if (updateError) {
    throw new Error(`Failed to confirm user email: ${updateError.message}`)
  }
}

/**
 * Deletes a user completely including their auth account and profile.
 * Used for cleanup after registration tests.
 */
export async function deleteTestUser(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  // Get the user by email
  const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers()
  
  if (getUserError) {
    console.error(`Failed to list users for deletion: ${getUserError.message}`)
    return
  }
  
  const user = users.find(u => u.email === email)
  
  if (!user) {
    // User doesn't exist, nothing to delete
    return
  }
  
  // Delete the user (this will cascade delete the profile due to foreign key constraint)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
  
  if (deleteError) {
    console.error(`Failed to delete user ${email}: ${deleteError.message}`)
  }
}

/**
 * Intercepts Supabase auth requests to mock email confirmation.
 * This approach uses Playwright's route interception to simulate successful email verification.
 */
export async function setupSupabaseEmailMocking(page: Page): Promise<void> {
  // Intercept the email confirmation redirect
  await page.route('**/auth/confirm**', async route => {
    // Extract the token from the URL
    const url = new URL(route.request().url())
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')
    
    if (type === 'signup' && token) {
      // Redirect to success page as if email was confirmed
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/'
        }
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Creates a unique test email for registration tests.
 */
export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `test-reg-${timestamp}-${random}@example.com`
}

/**
 * Waits for a user to be created in the database.
 * Useful for ensuring the user exists before trying to confirm their email.
 */
export async function waitForUserCreation(email: string, maxAttempts = 10): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (!error && users.find(u => u.email === email)) {
      return true
    }
    
    // Wait 500ms before trying again
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return false
}