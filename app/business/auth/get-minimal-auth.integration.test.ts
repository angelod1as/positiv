import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createClient } from "@supabase/supabase-js"
import { env } from "~/env.server"
import type { Database } from "~/types/database/database.types"

type MinimalAuthResult = Database["public"]["Functions"]["get_minimal_auth"]["Returns"][0]

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
	})

	afterEach(async () => {
		await cleanupAfterTest(tracker, kysely)
	})

	it("should return exactly 8 fields for a regular user", async () => {
		// Use seeded user1@example.com (not an admin)
		const profile = await kysely
			.selectFrom("profiles")
			.selectAll()
			.where("email", "=", "user1@example.com")
			.executeTakeFirstOrThrow()

		// Call the RPC
		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()

		// Verify exactly 8 fields are returned
		const keys = Object.keys(data as object)
		expect(keys).toHaveLength(8)
		expect(keys.sort()).toEqual([
			"basic_data_filled",
			"created_at",
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
			email: "user1@example.com",
			full_name: "User One Full Name",
			social_name: "user1",
			is_admin: false,
			basic_data_filled: true,
		})
		expect((data as MinimalAuthResult).race_color).toBeDefined()
		expect((data as MinimalAuthResult).created_at).toBeDefined()
	})

	it("should return is_admin=true for admin users", async () => {
		// Use seeded admin@example.com (has admin role)
		const adminProfile = await kysely
			.selectFrom("profiles")
			.selectAll()
			.where("email", "=", "admin@example.com")
			.executeTakeFirstOrThrow()

		// Call the RPC
		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: adminProfile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect((data as MinimalAuthResult).is_admin).toBe(true)
	})

	it("should return is_admin=false for regular users", async () => {
		// Use seeded user2@example.com (not an admin)
		const profile = await kysely
			.selectFrom("profiles")
			.selectAll()
			.where("email", "=", "user2@example.com")
			.executeTakeFirstOrThrow()

		// Call the RPC
		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect((data as MinimalAuthResult).is_admin).toBe(false)
	})

	it("should handle profiles with all required fields", async () => {
		// Use seeded user3@example.com
		const profile = await kysely
			.selectFrom("profiles")
			.selectAll()
			.where("email", "=", "user3@example.com")
			.executeTakeFirstOrThrow()

		const { data, error } = await supabase
			.rpc("get_minimal_auth", { user_id_input: profile.user_id })
			.single()

		expect(error).toBeNull()
		expect(data).toBeDefined()
		expect((data as MinimalAuthResult).social_name).toBe("user3")
		expect((data as MinimalAuthResult).full_name).toBe("User Three Full Name")
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
