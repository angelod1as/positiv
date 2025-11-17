import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DBClient } from "~/types/utils/utils.types"
import { getMinimalContext } from "./auth.server"

vi.mock("~/lib/supabase/server", () => ({
	createServerClient: vi.fn(),
}))

describe("getMinimalContext", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
		vi.clearAllMocks()
	})

	const createMockSupabase = (
		authError: { message?: string; code?: string } | null,
		userData: { user: { id: string; email: string } | null } | null,
		rpcData: unknown | null,
		rpcError: { details?: string } | null = null,
	) => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: userData,
				error: authError,
			}),
		},
		rpc: vi.fn().mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: rpcData,
				error: rpcError,
			}),
		}),
	})

	it("should return null profile when no user is authenticated", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockSupabase = createMockSupabase(null, { user: null }, null)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toBeNull()
	})

	it("should return minimal profile for authenticated user", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockProfileData = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			email: "test@example.com",
			full_name: "Test User",
			social_name: "Testy",
			race_color: ["branco"],
			is_admin: false,
		}

		const mockSupabase = createMockSupabase(
			null,
			{ user: { id: "user-123", email: "test@example.com" } },
			mockProfileData,
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toEqual(mockProfileData)
		expect(mockSupabase.rpc).toHaveBeenCalledWith("get_minimal_auth", {
			user_id_input: "user-123",
		})
	})

	it("should return null profile when RPC returns no data", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockSupabase = createMockSupabase(
			null,
			{ user: { id: "user-123", email: "test@example.com" } },
			null,
			{ details: "The result contains 0 rows" },
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toBeNull()
	})

	it("should return null profile when RPC has error", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockSupabase = createMockSupabase(
			null,
			{ user: { id: "user-123", email: "test@example.com" } },
			null,
			{ details: "Some RPC error" },
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toBeNull()
		expect(consoleSpy).toHaveBeenCalledWith("getMinimalContext", {
			details: "Some RPC error",
		})
	})

	it("should return admin profile when user is admin", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockAdminProfile = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			email: "admin@example.com",
			full_name: "Admin User",
			social_name: "Admin",
			race_color: ["preto"],
			is_admin: true,
		}

		const mockSupabase = createMockSupabase(
			null,
			{ user: { id: "admin-123", email: "admin@example.com" } },
			mockAdminProfile,
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toEqual(mockAdminProfile)
		expect(result.currentProfile?.is_admin).toBe(true)
	})

	it("should handle nullable social_name and race_color", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockProfileData = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			email: "test@example.com",
			full_name: "Test User",
			social_name: null,
			race_color: null,
			is_admin: false,
		}

		const mockSupabase = createMockSupabase(
			null,
			{ user: { id: "user-123", email: "test@example.com" } },
			mockProfileData,
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toEqual(mockProfileData)
		expect(result.currentProfile?.social_name).toBeNull()
		expect(result.currentProfile?.race_color).toBeNull()
	})

	it("should return null profile when auth session is missing", async () => {
		const mockRequest = new Request("http://localhost:5173/")
		const mockParams = {}

		const mockSupabase = createMockSupabase(
			{ message: "Auth session missing!" },
			null,
			null,
		)
		const mockHeaders = new Headers()

		const { createServerClient } = await import("~/lib/supabase/server")
		vi.mocked(createServerClient).mockReturnValue({
			supabase: mockSupabase as unknown as DBClient,
			headers: mockHeaders,
		})

		const result = await getMinimalContext(mockRequest, mockParams)

		expect(result.currentProfile).toBeNull()
	})
})
