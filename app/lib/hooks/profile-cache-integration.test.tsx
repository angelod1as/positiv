import type { SupabaseClient } from "@supabase/supabase-js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, renderHook, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "~/types/database/database.types"
import type { ProfileWithRoles } from "~/types/database/entities.types"
import { useProfile } from "./use-profile"
import { useUpdateProfile } from "./use-update-profile"

vi.mock("~/business/auth/auth.client")

describe("Profile Cache Integration", () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		})
		vi.clearAllMocks()
	})

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	describe("Cache Hydration Flow", () => {
		it("should read from hydrated cache instead of fetching", async () => {
			const { getClientContext } = await import("~/business/auth/auth.client")

			// Hydrate cache with initial data (simulating root.tsx behavior)
			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Test User",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: true,
				is_admin: false,
			}
			queryClient.setQueryData(["profile", "current"], initialProfile)

			// Mock should not be called if cache is used
			const mockGetContext = vi.mocked(getClientContext)

			const { result } = renderHook(() => useProfile(), { wrapper })

			// Data should be available immediately from cache
			expect(result.current.data).toEqual(initialProfile)
			expect(result.current.isSuccess).toBe(true)

			// Wait to ensure no fetch happens
			await new Promise((resolve) => setTimeout(resolve, 100))

			// getClientContext should not be called because data is in cache
			expect(mockGetContext).not.toHaveBeenCalled()
		})

		it("should maintain cache across multiple component mounts", async () => {
			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Test User",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: true,
				is_admin: false,
			}
			queryClient.setQueryData(["profile", "current"], initialProfile)

			// First component mount
			const { result: result1 } = renderHook(() => useProfile(), { wrapper })
			expect(result1.current.data).toEqual(initialProfile)

			// Second component mount
			const { result: result2 } = renderHook(() => useProfile(), { wrapper })
			expect(result2.current.data).toEqual(initialProfile)

			// Both should have the same data from cache
			expect(result1.current.data).toEqual(result2.current.data)
		})
	})

	describe("Mutation and Cache Updates", () => {
		it("should update cache when mutation succeeds", async () => {
			const { getClientContext } = await import("~/business/auth/auth.client")

			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			}
			queryClient.setQueryData(["profile", "current"], initialProfile)

			const updatedProfile: ProfileWithRoles = {
				...initialProfile,
				full_name: "Updated Name",
				race_color: ["Branca"],
			}

			vi.mocked(getClientContext).mockResolvedValue({
				currentProfile: initialProfile,
				currentUser: { id: "user-123", email: "test@example.com" },
				supabase: {
					from: vi.fn().mockReturnValue({
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: null,
								error: null,
							}),
						}),
					}),
					rpc: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: updatedProfile,
							error: null,
						}),
					}),
				} as unknown as SupabaseClient<Database>,
			})

			// Mount component that reads profile
			const { result: profileResult } = renderHook(() => useProfile(), {
				wrapper,
			})
			expect(profileResult.current.data?.full_name).toBe("Original Name")

			// Execute mutation
			const { result: mutationResult } = renderHook(
				() => useUpdateProfile(),
				{ wrapper },
			)
			mutationResult.current.mutate({
				full_name: "Updated Name",
				race_color: ["Branca"],
			})

			// Wait for mutation to complete
			await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true))

			// Profile hook should automatically reflect the update
			await waitFor(() =>
				expect(profileResult.current.data?.full_name).toBe("Updated Name"),
			)
			expect(profileResult.current.data?.race_color).toEqual(["Branca"])
		})

		it("should handle concurrent reads during mutation", async () => {
			const { getClientContext } = await import("~/business/auth/auth.client")

			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			}
			queryClient.setQueryData(["profile", "current"], initialProfile)

			const updatedProfile: ProfileWithRoles = {
				...initialProfile,
				full_name: "Updated Name",
			}

			vi.mocked(getClientContext).mockResolvedValue({
				currentProfile: initialProfile,
				currentUser: { id: "user-123", email: "test@example.com" },
				supabase: {
					from: vi.fn().mockReturnValue({
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: null,
								error: null,
			}),
						}),
					}),
					rpc: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: updatedProfile,
							error: null,
						}),
					}),
				} as unknown as SupabaseClient<Database>,
			})

			// Mount multiple components that read profile
			const { result: reader1 } = renderHook(() => useProfile(), { wrapper })
			const { result: reader2 } = renderHook(() => useProfile(), { wrapper })
			const { result: mutationResult } = renderHook(
				() => useUpdateProfile(),
				{ wrapper },
			)

			// All readers should have initial data
			expect(reader1.current.data?.full_name).toBe("Original Name")
			expect(reader2.current.data?.full_name).toBe("Original Name")

			// Execute mutation
			mutationResult.current.mutate({ full_name: "Updated Name" })

			// Wait for mutation to complete
			await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true))

			// All readers should see the update
			await waitFor(() => {
				expect(reader1.current.data?.full_name).toBe("Updated Name")
				expect(reader2.current.data?.full_name).toBe("Updated Name")
			})
		})
	})

	describe("Component Integration", () => {
		it("should trigger component re-renders on cache updates", async () => {
			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Original Name",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: false,
				is_admin: false,
			}

			// Create a component that uses the profile
			const TestComponent = () => {
				const { data: profile } = useProfile()
				return <div data-testid="profile-name">{profile?.full_name}</div>
			}

			queryClient.setQueryData(["profile", "current"], initialProfile)

			render(<TestComponent />, { wrapper })

			// Should show initial name
			expect(screen.getByTestId("profile-name")).toHaveTextContent(
				"Original Name",
			)

			// Update cache programmatically (simulating mutation success)
			queryClient.setQueryData(["profile", "current"], {
				...initialProfile,
				full_name: "Updated Name",
			})

			// Component should re-render with new data
			await waitFor(() =>
				expect(screen.getByTestId("profile-name")).toHaveTextContent(
					"Updated Name",
				),
			)
		})
	})

	describe("Cache Freshness", () => {
		it("should respect staleTime configuration", async () => {
			const { getClientContext } = await import("~/business/auth/auth.client")

			const initialProfile: ProfileWithRoles = {
				id: "profile-123",
				full_name: "Test User",
				race_color: null,
				created_at: new Date().toISOString(),
				basic_data_filled: true,
				is_admin: false,
			}

			vi.mocked(getClientContext).mockResolvedValue({
				currentProfile: initialProfile,
				currentUser: { id: "user-123", email: "test@example.com" },
				supabase: {} as unknown as SupabaseClient<Database>,
			})

			// Hydrate cache
			queryClient.setQueryData(["profile", "current"], initialProfile)

			// First mount - should use cache
			const { result: result1 } = renderHook(() => useProfile(), { wrapper })
			expect(result1.current.data).toEqual(initialProfile)

			// Immediately unmount and remount
			const { result: result2 } = renderHook(() => useProfile(), { wrapper })
			expect(result2.current.data).toEqual(initialProfile)

			// Should still be using cache, not refetching
			// (within staleTime window of 5 minutes)
			await new Promise((resolve) => setTimeout(resolve, 50))
			expect(vi.mocked(getClientContext)).not.toHaveBeenCalled()
		})
	})
})
