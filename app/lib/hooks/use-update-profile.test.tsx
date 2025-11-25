import type { SupabaseClient } from "@supabase/supabase-js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "~/types/database/database.types"
import type { ProfileWithRoles } from "~/types/database/entities.types"
import { useUpdateProfile } from "./use-update-profile"

vi.mock("~/business/auth/auth.client", () => ({
	getClientContext: vi.fn(),
}))

describe("useUpdateProfile", () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
				mutations: {
					retry: false,
				},
			},
		})
		vi.clearAllMocks()
	})

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	it("should execute mutation with profile update data", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: "profile-123",
									full_name: "Updated Name",
									race_color: ["Branca"],
									created_at: new Date().toISOString(),
									basic_data_filled: true,
									is_admin: false,
								},
								error: null,
							}),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		result.current.mutate({
			full_name: "Updated Name",
			race_color: ["Branca"],
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
		expect(result.current.data).toEqual(
			expect.objectContaining({
				id: "profile-123",
				full_name: "Updated Name",
				race_color: ["Branca"],
			}),
		)
	})

	it("should invalidate profile cache on successful mutation", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: "profile-123",
									full_name: "Updated Name",
									created_at: new Date().toISOString(),
									basic_data_filled: true,
									is_admin: false,
								},
								error: null,
							}),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		// Set initial cache data
		queryClient.setQueryData(["profile", "current"], {
			id: "profile-123",
			full_name: "Original Name",
			race_color: null,
			created_at: new Date().toISOString(),
			basic_data_filled: false,
			is_admin: false,
		} as ProfileWithRoles)

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		result.current.mutate({
			full_name: "Updated Name",
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		// Cache should be updated with new data
		const cachedProfile = queryClient.getQueryData<ProfileWithRoles>([
			"profile",
			"current",
		])
		expect(cachedProfile?.full_name).toBe("Updated Name")
	})

	it("should handle mutation errors gracefully", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: {
									message: "Database connection failed",
									code: "PGRST116",
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		result.current.mutate({
			full_name: "Updated Name",
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeDefined()
		expect(result.current.data).toBeUndefined()
	})

	it("should support optimistic updates", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: "profile-123",
									full_name: "Server Updated Name",
									race_color: ["Branca"],
									created_at: new Date().toISOString(),
									basic_data_filled: true,
									is_admin: false,
								},
								error: null,
							}),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		// Set initial cache data
		const initialProfile: ProfileWithRoles = {
			id: "profile-123",
			full_name: "Original Name",
			race_color: null,
			created_at: new Date().toISOString(),
			basic_data_filled: false,
			is_admin: false,
		}
		queryClient.setQueryData(["profile", "current"], initialProfile)

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		// Trigger mutation
		result.current.mutate({
			full_name: "Optimistic Name",
			race_color: ["Branca"],
		})

		// Immediately after mutation (before server response), cache should show optimistic update
		const optimisticProfile = queryClient.getQueryData<ProfileWithRoles>([
			"profile",
			"current",
		])
		expect(optimisticProfile?.full_name).toBe("Optimistic Name")

		// Wait for mutation to complete
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		// After success, cache should have server data
		const finalProfile = queryClient.getQueryData<ProfileWithRoles>([
			"profile",
			"current",
		])
		expect(finalProfile?.full_name).toBe("Server Updated Name")
	})

	it("should rollback optimistic updates on error", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: {
									message: "Update failed",
									code: "23505",
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		// Set initial cache data
		const initialProfile: ProfileWithRoles = {
			id: "profile-123",
			full_name: "Original Name",
			race_color: null,
			created_at: new Date().toISOString(),
			basic_data_filled: false,
			is_admin: false,
		}
		queryClient.setQueryData(["profile", "current"], initialProfile)

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		// Trigger mutation that will fail
		result.current.mutate({
			full_name: "Failed Update",
		})

		// Wait for error
		await waitFor(() => expect(result.current.isError).toBe(true))

		// Cache should be rolled back to original value
		const rolledBackProfile = queryClient.getQueryData<ProfileWithRoles>([
			"profile",
			"current",
		])
		expect(rolledBackProfile?.full_name).toBe("Original Name")
	})

	it("should provide loading state during mutation", async () => {
		const { getClientContext } = await import("~/business/auth/auth.client")
		let resolveUpdate: (value: unknown) => void
		const updatePromise = new Promise((resolve) => {
			resolveUpdate = resolve
		})

		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockReturnValue(updatePromise),
						}),
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>

		vi.mocked(getClientContext).mockResolvedValue({
			currentProfile: {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			},
			currentUser: { id: "user-123", email: "test@example.com" },
			supabase: mockSupabase,
		})

		const { result } = renderHook(() => useUpdateProfile(), { wrapper })

		expect(result.current.isPending).toBe(false)

		result.current.mutate({
			full_name: "Updated Name",
		})

		// Should be in pending state
		await waitFor(() => expect(result.current.isPending).toBe(true))

		// Resolve the promise
		resolveUpdate({
			data: {
				id: "profile-123",
				full_name: "Updated Name",
				created_at: new Date().toISOString(),
				basic_data_filled: true,
				is_admin: false,
			},
			error: null,
		})

		// Should complete
		await waitFor(() => expect(result.current.isPending).toBe(false))
		expect(result.current.isSuccess).toBe(true)
	})
})
