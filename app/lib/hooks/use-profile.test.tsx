import type { SupabaseClient } from "@supabase/supabase-js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "~/types/database/database.types"
import { useProfile } from "./use-profile"

vi.mock("~/business/auth/auth.client", () => ({
	getClientContext: vi.fn(),
}))

describe("useProfile", () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		})
		vi.clearAllMocks()
	})

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	it("should fetch profile data using TanStack Query", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockProfile = {
			id: "profile-123",
			email: "test@example.com",
			full_name: "Test User",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: false,
		}

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: mockProfile,
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: {} as SupabaseClient<Database>,
		})

		const { result } = renderHook(() => useProfile(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(result.current.data).toEqual(mockProfile)
		expect(getClientContext).toHaveBeenCalledTimes(1)
	})

	it("should use correct query key ['profile', 'current']", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: null,
			currentUser: null,
			supabase: {} as SupabaseClient<Database>,
		})

		renderHook(() => useProfile(), { wrapper })

		await waitFor(() => {
			const queries = queryClient.getQueryCache().getAll()
			expect(queries).toHaveLength(1)
			expect(queries[0].queryKey).toEqual(["profile", "current"])
		})
	})

	it("should have 5-minute stale time configured", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockProfile = {
			id: "profile-456",
			email: "stale@example.com",
			full_name: "Stale User",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: false,
		}

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: mockProfile,
			currentUser: { id: "user-456", email: "stale@example.com" },
			supabase: {} as SupabaseClient<Database>,
		})

		const { result, unmount } = renderHook(() => useProfile(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(getClientContext).toHaveBeenCalledTimes(1)

		unmount()

		const { result: result2 } = renderHook(() => useProfile(), { wrapper })

		await waitFor(() => expect(result2.current.isSuccess).toBe(true))
		expect(getClientContext).toHaveBeenCalledTimes(1)
	})

	it("should return loading state initially", () => {
		const { result } = renderHook(() => useProfile(), { wrapper })

		expect(result.current.isLoading).toBe(true)
		expect(result.current.data).toBeUndefined()
	})

	it("should handle null profile (logged out state)", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: null,
			currentUser: null,
			supabase: {} as SupabaseClient<Database>,
		})

		const { result } = renderHook(() => useProfile(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(result.current.data).toBeNull()
	})

	it("should handle fetch errors", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		vi.mocked(getClientContext).mockRejectedValue(
			new Error("Network error"),
		)

		const { result } = renderHook(() => useProfile(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeDefined()
		expect(result.current.data).toBeUndefined()
	})
})
