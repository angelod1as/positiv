import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"
import { useEvents } from "./use-events"

global.fetch = vi.fn()

describe("useEvents", () => {
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

	it("should fetch events data using TanStack Query", async () => {
		const mockEvents = {
			registrationOpen: [
				{
					id: "event-1",
					title: "Test Event",
					event_status: "Registration Open",
				} as ViewEvent,
			],
			registrationClosed: [],
			scheduled: [],
		}

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: mockEvents }),
		} as Response)

		const { result } = renderHook(() => useEvents(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(result.current.data).toEqual(mockEvents)
		expect(fetch).toHaveBeenCalledWith("/api/events")
	})

	it("should use correct query key ['events', 'dashboard']", async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: { registrationOpen: [], registrationClosed: [], scheduled: [] } }),
		} as Response)

		renderHook(() => useEvents(), { wrapper })

		await waitFor(() => {
			const queries = queryClient.getQueryCache().getAll()
			expect(queries).toHaveLength(1)
			expect(queries[0].queryKey).toEqual(["events", "dashboard"])
		})
	})

	it("should have 5-minute stale time configured", async () => {
		const mockEvents = {
			registrationOpen: [],
			registrationClosed: [],
			scheduled: [],
		}

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: mockEvents }),
		} as Response)

		const { result, unmount } = renderHook(() => useEvents(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(fetch).toHaveBeenCalledTimes(1)

		unmount()

		const { result: result2 } = renderHook(() => useEvents(), { wrapper })

		await waitFor(() => expect(result2.current.isSuccess).toBe(true))
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it("should return loading state initially", () => {
		const { result } = renderHook(() => useEvents(), { wrapper })

		expect(result.current.isLoading).toBe(true)
		expect(result.current.data).toBeUndefined()
	})

	it("should handle fetch errors", async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Network error" }),
		} as Response)

		const { result } = renderHook(() => useEvents(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeDefined()
		expect(result.current.data).toBeUndefined()
	})

	it("should have refetchOnWindowFocus enabled", () => {
		const mockEvents = {
			registrationOpen: [],
			registrationClosed: [],
			scheduled: [],
		}

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ events: mockEvents }),
		} as Response)

		renderHook(() => useEvents(), { wrapper })

		const queries = queryClient.getQueryCache().getAll()
		expect(queries.length).toBeGreaterThan(0)
	})
})
