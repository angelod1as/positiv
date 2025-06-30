import test from "@playwright/test"
import pwLog from "e2e/helpers/log"
import { createSupabaseTestClient } from "./create-supabase-client"

test("delete database items", async ({ page }) => {
  await page.close()
  pwLog("Deleting test database items...")

  const supabase = await createSupabaseTestClient()

  const { data: users, error } = await supabase.auth.admin.listUsers()

  if (error) throw new Error(error.message)

  // Fetch all mock users ids
  const mockUserIds = users.users
    .filter((user) => user.user_metadata.is_mock_user)
    .map((user) => user.id)

  // Get profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .in("user_id", mockUserIds)

  // Map to mock profile IDs
  const mockProfileIds = profiles?.map((profile) => profile.id) || []

  // Delete entries from event_participants table with the mock profiles
  try {
    await supabase
      .from("event_participants")
      .delete()
      .in("profile_id", mockProfileIds)
  } catch (error) {
    console.error(`\n\n:event_participants error:\n`, error, `\n\n`)
  }

  // Delete mock profiles from profiles table
  try {
    await supabase.from("profiles").delete().in("id", mockProfileIds)
  } catch (error) {
    console.error(`\n\n:profiles error:\n`, error, `\n\n`)
  }

  // Delete users from auth
  for (const id of mockUserIds) {
    try {
      await supabase.auth.admin.deleteUser(id)
    } catch (error) {
      console.error(`\n\n:user error:\n`, error, `\n\n`)
    }
  }

  // TODO: POS-138 Delete E2E events

  // try {
  //   await supabase.from("events").delete().eq("title", "EVENTO TESTE E2E")
  // } catch (error) {
  //   console.error(`\n\n:events error:\n`, error, `\n\n`)
  // }

  // try {
  //   const mockEventIds = await getMockEventIds(page)
  //   if (mockEventIds) {
  //     await supabase.from("events").delete().in("id", mockEventIds)
  //   }
  // } catch (error) {
  //   console.error(`\n\n:events error:\n`, error, `\n\n`)
  // }

  pwLog("Database test items deleted.")
})
