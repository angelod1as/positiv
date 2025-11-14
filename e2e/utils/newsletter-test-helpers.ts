import { createSupabaseAdminClient } from './db-cleanup'
import { createTestUser, generateTestEmail, generateTestPassword, type TestUser } from './user-management'

export interface NewsletterTestUser extends TestUser {
  profileId: string
}

export interface NewsletterTestUserOptions {
  subscribed?: boolean // Has newsletter_subscriptions record with consent_given=true
  declined?: boolean   // Has newsletter_subscriptions record with consent_given=false
  // If both false/undefined = no newsletter_subscriptions record (never subscribed)
}

/**
 * Creates a test user with a COMPLETE profile for newsletter modal testing.
 * The profile includes race_color field to prevent "Atualize seu perfil" modal from appearing.
 */
export async function createNewsletterTestUser(
  options?: NewsletterTestUserOptions
): Promise<NewsletterTestUser> {
  const { subscribed = false, declined = false } = options || {}
  const email = generateTestEmail()
  const password = generateTestPassword()
  const supabase = createSupabaseAdminClient()

  try {
    // Step 1: Create auth user
    const authUser = await createTestUser(email, password)

    // Step 2: Create profile with ALL required fields (especially race_color)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authUser.id,
        email: authUser.email,
        full_name: 'Newsletter Test User',
        social_name: 'Test User',
        phone: 11999999999,
        gender: ['Mulher cis'],
        orientation: ['Hétero'],
        pronouns: ['Ela/dela'],
        race_color: ['Branca'], // CRITICAL: Required to avoid profile update modal
        date_of_birth: '1990-01-01',
        where_lives: 'São Paulo',
        how_came_to_us: 'E2E Newsletter Tests',
        basic_data_filled: true,
      })
      .select('id')
      .single()

    if (profileError || !profile) {
      throw new Error(`Failed to create profile for ${email}: ${profileError?.message}`)
    }

    // Step 3: Create newsletter subscription record if requested
    if (subscribed || declined) {
      const consentGiven = subscribed
      const now = new Date().toISOString()

      const { error: newsletterError } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          profile_id: profile.id,
          consent_given: consentGiven,
          subscription_source: 'manual_button',
          sync_status: 'pending',
          first_consent_given_at: consentGiven ? now : null,
          last_consent_given_at: consentGiven ? now : null,
          subscribed_at: consentGiven ? now : null,
          unsubscribed_at: declined ? now : null,
        })

      if (newsletterError) {
        console.error(`Warning: Failed to create newsletter subscription for ${email}:`, newsletterError)
        // Don't throw - user is created, just missing subscription record
      }
    }

    return {
      id: authUser.id,
      email: authUser.email,
      password,
      profileId: profile.id,
    }
  } catch (error) {
    console.error(`Failed to create newsletter test user ${email}:`, error)
    throw error
  }
}

/**
 * Deletes a newsletter test user and all associated data including newsletter subscriptions.
 */
export async function deleteNewsletterTestUser(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  try {
    // Get the profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (profile) {
      // Delete newsletter subscriptions
      await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('profile_id', profile.id)

      // Delete event participations
      await supabase
        .from('event_participants')
        .delete()
        .eq('profile_id', profile.id)

      // Delete event reminders
      await supabase
        .from('event_newsletter_campaigns')
        .delete()
        .eq('profile_id', profile.id)

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)
    }

    // Delete user from auth
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error(`Error deleting newsletter test user ${userId}:`, error)
      throw new Error(`Failed to delete auth user ${userId}: ${error.message}`)
    }
  } catch (error) {
    console.error(`Failed to delete newsletter test user ${userId}:`, error)
  }
}
