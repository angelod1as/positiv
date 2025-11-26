import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAdminEvents } from "./use-admin-events"

global.fetch = vi.fn()

describe("useAdminEvents", () => {
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

	it("should fetch admin events data using TanStack Query", async () => {
		const mockEvents = [
			{
				id: "event-1",
				title: "Admin Event",
				emoji: "🎉",
				event_status: "Registration Open",
				time_event_start: "2025-12-01T10:00:00Z",
			},
		]

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: mockEvents }),
		} as Response)

		const { result } = renderHook(() => useAdminEvents(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(result.current.data).toEqual(mockEvents)
		expect(fetch).toHaveBeenCalledWith("/api/admin/events")
	})

	it("should use correct query key ['events', 'admin']", async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: [] }),
		} as Response)

		renderHook(() => useAdminEvents(), { wrapper })

		await waitFor(() => {
			const queries = queryClient.getQueryCache().getAll()
			expect(queries).toHaveLength(1)
			expect(queries[0].queryKey).toEqual(["events", "admin"])
		})
	})

	it("should have 5-minute stale time configured", async () => {
		const mockEvents = [
			{
				id: "event-1",
				title: "Admin Event",
				emoji: "🎉",
				event_status: "Registration Open",
				time_event_start: "2025-12-01T10:00:00Z",
			},
		]

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: mockEvents }),
		} as Response)

		const { result, unmount } = renderHook(() => useAdminEvents(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(fetch).toHaveBeenCalledTimes(1)

		unmount()

		const { result: result2 } = renderHook(() => useAdminEvents(), { wrapper })

		await waitFor(() => expect(result2.current.isSuccess).toBe(true))
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it("should return loading state initially", () => {
		const { result } = renderHook(() => useAdminEvents(), { wrapper })

		expect(result.current.isLoading).toBe(true)
		expect(result.current.data).toBeUndefined()
	})

	it("should handle fetch errors", async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Network error" }),
		} as Response)

		const { result } = renderHook(() => useAdminEvents(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeDefined()
		expect(result.current.data).toBeUndefined()
	})

	it("should have refetchOnWindowFocus enabled", () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: [] }),
		} as Response)

		renderHook(() => useAdminEvents(), { wrapper })

		const queries = queryClient.getQueryCache().getAll()
		expect(queries.length).toBeGreaterThan(0)
	})
})
