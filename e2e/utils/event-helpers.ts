import { TEST_USER_PROFILE_DATA } from "../fixtures/test-data"
import { createSupabaseAdminClient } from "./db-cleanup"
import { createTestUser } from "./user-management"

export interface TestParticipant {
  profileId: string
  userId: string
  email: string
  fullName: string
  socialName: string
  phone: number
}

export async function createTestEventWithParticipants(
  eventId: string,
  count: number = 3,
): Promise<TestParticipant[]> {
  // Using Supabase client here for E2E test data creation
  // This is consistent with other E2E utilities that need admin access
  const supabase = createSupabaseAdminClient()
  const participants: TestParticipant[] = []

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now()
    const email = `test-participant-${timestamp}-${i}@example.com`
    const password = `TestPass${timestamp}!`

    // Create user
    const user = await createTestUser(email, password)

    // Create profile with test data
    const profileData = {
      user_id: user.id,
      email: email,
      basic_data_filled: true,
      full_name: `Test Participant ${i + 1}`,
      social_name: `Participant ${i + 1}`,
      phone: 11999999000 + i,
      gender: TEST_USER_PROFILE_DATA.gender,
      orientation: TEST_USER_PROFILE_DATA.orientation,
      pronouns: TEST_USER_PROFILE_DATA.pronouns,
      date_of_birth: TEST_USER_PROFILE_DATA.date_of_birth,
      rg: TEST_USER_PROFILE_DATA.rg,
      rg_issuer: TEST_USER_PROFILE_DATA.rg_issuer,
      cpf: TEST_USER_PROFILE_DATA.cpf,
      where_lives: TEST_USER_PROFILE_DATA.where_lives,
      how_came_to_us: TEST_USER_PROFILE_DATA.how_came_to_us,
      is_veteran: i % 2 === 0, // Alternate between veteran and rookie
      flag: (i === 0 ? "yellow" : i === 1 ? "red" : "none") as
        | "none"
        | "yellow"
        | "red", // Vary flag colors
      flag_notes: i === 0 ? "Test flag note" : null,
      approved_to_attend: (i === 0 ? "approved" : "pending") as
        | "approved"
        | "pending",
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // Create event participant record with varying statuses
    const participantData = {
      profile_id: profile.id,
      event_id: eventId,
      is_user_applied: true,
      application_status: (i === 0
        ? "finalised"
        : i === 1
          ? "pending"
          : "talking") as
        | "pending"
        | "talking"
        | "sent_payment_data"
        | "sent_rules"
        | "think_better"
        | "finalised",
      attendance_status: (i === 0 ? "attended" : "pending") as
        | "pending"
        | "attended"
        | "not-attended"
        | "skipped"
        | "will-not-go",
      has_paid: i === 0,
      payment: i === 0 ? 100 : 0,
      spot_type: (i === 0 ? "regular" : i === 1 ? "social" : "staff") as
        | "regular"
        | "social"
        | "staff",
      referred:
        i === 0 ? "João Test - indicação formal" : i === 1 ? "ninguém" : "",
    }

    const { error: participantError } = await supabase
      .from("event_participants")
      .insert(participantData)

    if (participantError) {
      throw new Error(
        `Failed to create participant: ${participantError.message}`,
      )
    }

    participants.push({
      profileId: profile.id,
      userId: user.id,
      email: email,
      fullName: profile.full_name || `Test Participant ${i + 1}`,
      socialName: profile.social_name || `Participant ${i + 1}`,
      phone: profile.phone || 11999999000 + i,
    })
  }

  return participants
}

export async function cleanupTestParticipants(
  participants: TestParticipant[],
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  for (const participant of participants) {
    // Delete event participant records
    await supabase
      .from("event_participants")
      .delete()
      .eq("profile_id", participant.profileId)

    // Delete profile
    await supabase.from("profiles").delete().eq("id", participant.profileId)

    // Delete user
    await supabase.auth.admin.deleteUser(participant.userId)
  }
}
