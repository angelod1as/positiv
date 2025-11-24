import { describe, expect, it } from "vitest"
import { createQueryClient } from "./query-client"

describe("createQueryClient", () => {
	it("should create a QueryClient instance", () => {
		const queryClient = createQueryClient()
		expect(queryClient).toBeDefined()
		expect(queryClient.getDefaultOptions).toBeDefined()
	})

	it("should have staleTime of 5 minutes (300000ms)", () => {
		const queryClient = createQueryClient()
		const defaultOptions = queryClient.getDefaultOptions()
		expect(defaultOptions.queries?.staleTime).toBe(300000)
	})

	it("should have gcTime of 30 minutes (1800000ms)", () => {
		const queryClient = createQueryClient()
		const defaultOptions = queryClient.getDefaultOptions()
		expect(defaultOptions.queries?.gcTime).toBe(1800000)
	})

	it("should disable refetchOnWindowFocus", () => {
		const queryClient = createQueryClient()
		const defaultOptions = queryClient.getDefaultOptions()
		expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false)
	})
})
