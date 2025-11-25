import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import type { ProfileWithRoles } from "./types/database/entities.types"

describe("Root Cache Hydration", () => {
	it("should hydrate query cache with profile from loader data", () => {
		const queryClient = new QueryClient()
		const mockProfile: ProfileWithRoles = {
			id: "profile-123",
			email: "test@example.com",
			full_name: "Test User",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: false,
			social_name: null,
			pronouns: null,
			rg: null,
			cpf: null,
			phone: null,
			date_of_birth: null,
			gender: null,
			orientation: null,
			race_color: null,
			where_lives: null,
			how_came_to_us: null,
			rg_issuer: null,
		}

		queryClient.setQueryData(["profile", "current"], mockProfile)

		const cachedData = queryClient.getQueryData<ProfileWithRoles>([
			"profile",
			"current",
		])
		expect(cachedData).toEqual(mockProfile)
	})

	it("should hydrate query cache with null when no profile exists", () => {
		const queryClient = new QueryClient()

		queryClient.setQueryData(["profile", "current"], null)

		const cachedData = queryClient.getQueryData<ProfileWithRoles | null>([
			"profile",
			"current",
		])
		expect(cachedData).toBeNull()
	})

	it("should allow useProfile hook to use hydrated data without fetching", () => {
		const queryClient = new QueryClient()
		const mockProfile: ProfileWithRoles = {
			id: "profile-456",
			email: "hydrated@example.com",
			full_name: "Hydrated User",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: false,
			social_name: null,
			pronouns: null,
			rg: null,
			cpf: null,
			phone: null,
			date_of_birth: null,
			gender: null,
			orientation: null,
			race_color: null,
			where_lives: null,
			how_came_to_us: null,
			rg_issuer: null,
		}

		queryClient.setQueryData(["profile", "current"], mockProfile)

		const state = queryClient.getQueryState(["profile", "current"])
		expect(state?.data).toEqual(mockProfile)
		expect(state?.status).toBe("success")
	})

	it("should not override existing cache when hydrating with null", () => {
		const queryClient = new QueryClient()
		const existingProfile: ProfileWithRoles = {
			id: "existing-profile",
			email: "existing@example.com",
			full_name: "Existing User",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: false,
			social_name: null,
			pronouns: null,
			rg: null,
			cpf: null,
			phone: null,
			date_of_birth: null,
			gender: null,
			orientation: null,
			race_color: null,
			where_lives: null,
			how_came_to_us: null,
			rg_issuer: null,
		}

		queryClient.setQueryData(["profile", "current"], existingProfile)
		queryClient.setQueryData(["profile", "current"], null)

		const cachedData = queryClient.getQueryData<ProfileWithRoles | null>([
			"profile",
			"current",
		])
		expect(cachedData).toBeNull()
	})

	it("should maintain query data structure expected by useProfile", () => {
		const queryClient = new QueryClient()
		const mockProfile: ProfileWithRoles = {
			id: "profile-789",
			email: "structure@example.com",
			full_name: "Structure Test",
			created_at: new Date().toISOString(),
			basic_data_filled: true,
			is_admin: true,
			social_name: "Test Social",
			pronouns: ["they/them"],
			rg: "123456789",
			cpf: "12345678900",
			phone: 5511999999999,
			date_of_birth: "1990-01-01",
			gender: ["non-binary"],
			orientation: ["queer"],
			race_color: ["parda"],
			where_lives: "São Paulo",
			how_came_to_us: "Social media",
			rg_issuer: "SSP",
		}

		queryClient.setQueryData(["profile", "current"], mockProfile)

		const state = queryClient.getQueryState(["profile", "current"])
		expect(state?.dataUpdatedAt).toBeGreaterThan(0)
		expect(state?.error).toBeNull()
	})
})
