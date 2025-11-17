import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { createClient } from "@supabase/supabase-js"
import { env } from "~/env.server"

describe("get_minimal_auth RPC - Integration Tests", () => {
	const { tracker, kysely } = setupIntegrationTest()

	// Create Supabase client for RPC calls
	const { viteSupabaseUrl, viteSupabaseAnonKey } = env()

	if (!viteSupabaseUrl || !viteSupabaseAnonKey) {
		throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
	}

	const supabase = createClient(viteSupabaseUrl, viteSupabaseAnonKey)

	beforeEach(async () => {
		tracker.clear()
		// Clear any existing test data
		await kysely.deleteFrom("profiles").where("email", "like", "test%").execute()
	})

	afterEach(async () => {
		await cleanupAfterTest(tracker, kysely)
	})

	it("should return exactly 6 fields for a regular user", async () => {
		// Create a test user profile
		const profile = await createTestProfile(tracker, kysely, {
			email: "test-regular@example.com",
			full_name: "Regular User",
			social_name: "Reg",
			race_color: ["branca"],
		})

		// Call the RPC
		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()

		// Verify exactly 6 fields are returned
		const keys = Object.keys(data as object)
		expect(keys).toHaveLength(6)
		expect(keys.sort()).toEqual([
			"email",
			"full_name",
			"id",
			"is_admin",
			"race_color",
			"social_name",
		].sort())

		// Verify field values
		expect(data).toMatchObject({
			id: profile.id,
			email: "test-regular@example.com",
			full_name: "Regular User",
			social_name: "Reg",
			race_color: ["branca"],
			is_admin: false,
		})
	})

	it("should return is_admin=true for admin users", async () => {
		// Create an admin user
		const adminProfile = await createTestProfile(tracker, kysely, {
			email: "test-admin@example.com",
			full_name: "Admin User",
			social_name: "Admin",
			race_color: ["branca"],
		})

		// Add admin role
		await kysely
			.insertInto("user_roles")
			.values({
				user_id: adminProfile.user_id,
				role_name: "admin",
			})
			.execute()

		tracker.track("user_roles", { user_id: adminProfile.user_id })

		// Call the RPC
		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: adminProfile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect(data?.is_admin).toBe(true)
	})

	it("should return is_admin=false for regular users", async () => {
		// Create a regular user (no admin role)
		const profile = await createTestProfile(tracker, kysely, {
			email: "test-regular2@example.com",
			full_name: "Regular User 2",
		})

		// Call the RPC
		const { data, error} = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect(data?.is_admin).toBe(false)
	})

	it("should handle null social_name correctly", async () => {
		const profile = await createTestProfile(tracker, kysely, {
			email: "test-no-social@example.com",
			full_name: "No Social Name",
			social_name: null,
			race_color: ["preta"],
		})

		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect(data?.social_name).toBeNull()
	})

	it("should return empty result for non-existent user", async () => {
		const nonExistentId = "00000000-0000-0000-0000-000000000000"

		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: nonExistentId })
			.single()

		// Supabase returns error when .single() finds no rows
		expect(error).not.toBeNull()
		expect(data).toBeNull()
	})
})
