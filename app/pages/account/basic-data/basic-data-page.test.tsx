import { describe, expect, it, vi } from "vitest"
import { loader } from "./basic-data-page"
import * as authServer from "~/business/auth/auth.server"
import type { Route } from "./+types/basic-data-page"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "~/types/database/database.types"
import type { Profile } from "~/types/database/entities.types"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

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

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: orphanedProfile, error: null }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: mockSupabase as unknown as SupabaseClient<Database>,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({ request: mockRequest, params: mockParams, context: {} })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile,
      })
      
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
      expect(mockSupabase.from().select).toHaveBeenCalledWith("*")
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith("email", "test@example.com")
      expect(mockSupabase.from().select().eq().is).toHaveBeenCalledWith("user_id", null)
    })

    it("should return null orphanedProfile when none found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }

      const currentProfile = {
        id: "profile-123",
        full_name: "Current User",
        basic_data_filled: true,
        created_at: "2024-01-01T00:00:00Z",
        is_admin: false,
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
        supabase: mockSupabase as unknown as SupabaseClient<Database>,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({ request: mockRequest, params: mockParams, context: {} })
      
      expect(result).toEqual({
        profile: currentProfile,
        orphanedProfile: null,
      })
    })

    it("should handle errors when checking for orphaned profiles", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { code: 'PGRST500', message: "Database error" } 
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: mockSupabase as unknown as SupabaseClient<Database>,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({ request: mockRequest, params: mockParams, context: {} })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile: null,
      })
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking for orphaned profile:', 
        expect.objectContaining({ code: 'PGRST500', message: 'Database error' })
      )
      
      consoleErrorSpy.mockRestore()
    })

    it("should handle 'no rows' error gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { code: 'PGRST116', message: "No rows found" } 
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabase: mockSupabase as unknown as SupabaseClient<Database>,
        supabaseHeaders: new Headers(),
        host: null,
        isProdInDev: false,
      })

      const result = await loader({ request: mockRequest, params: mockParams, context: {} })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile: null,
      })
      
      // Should NOT log "no rows" errors
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })
  })
})