import { describe, expect, it, vi } from "vitest"
import { loader } from "./basic-data-page"
import * as authServer from "~/business/auth/auth.server"
import type { Route } from "./+types/basic-data-page"
import type { Profile } from "~/types/database/entities.types"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

const { findOrphanedProfile } = vi.hoisted(() => ({
  findOrphanedProfile: vi.fn(),
}))

vi.mock("~/business/profile/profiles.server", () => ({ findOrphanedProfile }))

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

describe("basic-data-page loader", () => {
  const mockRequest = new Request("http://localhost:3000/account/basic-data")
  const mockParams = {} as Route.LoaderArgs["params"]

  describe("orphaned profile handling", () => {
    it("should return orphaned profile when found", async () => {
      const orphanedProfile: Partial<Profile> = {
        id: "orphaned-123",
        email: "test@example.com",
        full_name: "Orphaned User",
        phone: 11999999999,
        user_id: null,
      }

      findOrphanedProfile.mockResolvedValue(orphanedProfile)

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: {} as never,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({
        request: mockRequest,
        url: new URL(mockRequest.url),
        pattern: "/conta/dados-basicos",
        params: mockParams,
        context: {},
      })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile,
        cpfExemptionLinks: null,
      })
      
      expect(findOrphanedProfile).toHaveBeenCalledWith("test@example.com")
    })

    it("should return null orphanedProfile when none found", async () => {
      logger.error.mockClear()
      findOrphanedProfile.mockResolvedValue(undefined)

      const currentProfile = {
        id: "profile-123",
        full_name: "Current User",
        basic_data_filled: true,
        created_at: "2024-01-01T00:00:00Z",
        email: null,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
      }

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: {} as never,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({
        request: mockRequest,
        url: new URL(mockRequest.url),
        pattern: "/conta/dados-basicos",
        params: mockParams,
        context: {},
      })
      
      expect(result).toEqual({
        profile: currentProfile,
        orphanedProfile: null,
        cpfExemptionLinks: {
          request: expect.stringMatching(/^https:\/\/wa\.me\//),
          change: expect.stringMatching(/^https:\/\/wa\.me\//),
        },
      })
      expect(
        decodeURIComponent(
          (result as { cpfExemptionLinks: { request: string } })
            .cpfExemptionLinks.request,
        ),
      ).toContain("ID: profile-123")
      expect(logger.error).not.toHaveBeenCalled()
    })

    it("should handle errors when checking for orphaned profiles", async () => {
      logger.error.mockClear()
      
      findOrphanedProfile.mockRejectedValue({ code: "XX000", message: "Database error" })

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: {} as never,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({
        request: mockRequest,
        url: new URL(mockRequest.url),
        pattern: "/conta/dados-basicos",
        params: mockParams,
        context: {},
      })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile: null,
        cpfExemptionLinks: null,
      })
      
      // Should log the error
      expect(logger.error).toHaveBeenCalledWith(
        "Error checking for orphaned profile",
        { error: expect.objectContaining({ code: "XX000", message: "Database error" }) }
      )
    })
  })
})