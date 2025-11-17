import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "~/types/database/database.types"
import { getClientContext } from "./auth.client"

// Mock import.meta.env
vi.stubGlobal("import", {
	meta: {
		env: {
			VITE_SUPABASE_URL: "http://localhost:54321",
			VITE_SUPABASE_ANON_KEY: "test-anon-key",
		},
	},
})

// Mock the client module
const mockSupabaseAuth = {
	getUser: vi.fn(),
}
const mockSupabaseRpc = vi.fn()

const mockSupabaseClient = {
	auth: mockSupabaseAuth,
	rpc: mockSupabaseRpc,
} as unknown as SupabaseClient<Database>

vi.mock("~/lib/supabase/client", () => ({
	createBrowserClient: vi.fn(() => ({
		supabase: mockSupabaseClient,
	})),
}))

vi.mock("remix-toast", () => ({
	redirectWithError: vi.fn((path: string, message: string) =>
		Promise.resolve(new Response(null, { status: 302 })),
	),
}))

describe("getClientContext", () => {
	const mockUser = {
		id: "user-123",
		email: "test@example.com",
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should call get_minimal_auth RPC instead of get_profile_with_roles", async () => {
		const mockProfile = {
			id: "profile-123",
			email: "test@example.com",
			full_name: "Test User",
			social_name: "Tester",
			race_color: ["white"],
			is_admin: false,
			created_at: "2024-01-01T00:00:00Z",
			basic_data_filled: true,
		}

		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})

		const mockSingle = vi.fn().mockResolvedValue({
			data: mockProfile,
			error: null,
		})

		mockSupabaseRpc.mockReturnValue({
			single: mockSingle,
		})

		await getClientContext()

		// Verify get_minimal_auth is called instead of get_profile_with_roles
		expect(mockSupabaseRpc).toHaveBeenCalledWith("get_minimal_auth", {
			user_id_input: mockUser.id,
		})
		expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
			"get_profile_with_roles",
			expect.anything(),
		)
	})

	it("should return minimal profile schema with 8 fields", async () => {
		const mockProfile = {
			id: "profile-123",
			email: "test@example.com",
			full_name: "Test User",
			social_name: "Tester",
			race_color: ["white"],
			is_admin: false,
			created_at: "2024-01-01T00:00:00Z",
			basic_data_filled: true,
		}

		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})

		const mockSingle = vi.fn().mockResolvedValue({
			data: mockProfile,
			error: null,
		})

		mockSupabaseRpc.mockReturnValue({
			single: mockSingle,
		})

		const result = await getClientContext()

		expect(result.currentProfile).toBeDefined()
		expect(Object.keys(result.currentProfile!)).toHaveLength(8)
		expect(result.currentProfile).toMatchObject({
			id: mockProfile.id,
			email: mockProfile.email,
			full_name: mockProfile.full_name,
			social_name: mockProfile.social_name,
			race_color: mockProfile.race_color,
			is_admin: mockProfile.is_admin,
			created_at: mockProfile.created_at,
			basic_data_filled: mockProfile.basic_data_filled,
		})
	})

	it("should handle null user", async () => {
		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		})

		const result = await getClientContext()

		expect(result.currentUser).toBeNull()
		expect(result.currentProfile).toBeNull()
		expect(result.supabase).toBeDefined()
	})

	it("should handle RPC error gracefully", async () => {
		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})

		const mockSingle = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "RPC error", details: "" },
		})

		mockSupabaseRpc.mockReturnValue({
			single: mockSingle,
		})

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const result = await getClientContext()

		expect(result.currentUser).toEqual(mockUser)
		expect(result.currentProfile).toBeNull()
		expect(consoleSpy).toHaveBeenCalledWith(
			"getCurrentProfile",
			expect.objectContaining({ message: "RPC error" }),
		)

		consoleSpy.mockRestore()
	})

	it("should handle empty profile result without error", async () => {
		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})

		const mockSingle = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "No rows", details: "The result contains 0 rows" },
		})

		mockSupabaseRpc.mockReturnValue({
			single: mockSingle,
		})

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const result = await getClientContext()

		expect(result.currentUser).toEqual(mockUser)
		expect(result.currentProfile).toBeNull()
		expect(consoleSpy).not.toHaveBeenCalled()

		consoleSpy.mockRestore()
	})

	it("should return profile with nullable social_name and race_color", async () => {
		const mockProfile = {
			id: "profile-123",
			email: "test@example.com",
			full_name: "Test User",
			social_name: null,
			race_color: null,
			is_admin: false,
			created_at: "2024-01-01T00:00:00Z",
			basic_data_filled: false,
		}

		mockSupabaseAuth.getUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})

		const mockSingle = vi.fn().mockResolvedValue({
			data: mockProfile,
			error: null,
		})

		mockSupabaseRpc.mockReturnValue({
			single: mockSingle,
		})

		const result = await getClientContext()

		expect(result.currentProfile).toBeDefined()
		expect(result.currentProfile!.social_name).toBeNull()
		expect(result.currentProfile!.race_color).toBeNull()
	})
})
