import { describe, expect, it, vi } from "vitest"
import { loader } from "./basic-data-page"
import * as authServer from "~/business/auth/auth.server"
import type { Route } from "./+types/basic-data-page"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

describe("basic-data-page loader", () => {
  const mockRequest = new Request("http://localhost:3000/account/basic-data")
  const mockParams = {} as Route.LoaderArgs["params"]

  describe("orphaned profile handling", () => {
    it("should return orphaned profile when found", async () => {
      const orphanedProfile = {
        id: "orphaned-123",
        email: "test@example.com",
        full_name: "Orphaned User",
        phone: "11999999999",
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
        } as any,
        supabase: mockSupabase as any,
        supabaseHeaders: new Headers(),
      } as any)

      const result = await loader({ request: mockRequest, params: mockParams })
      
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

      vi.mocked(authServer.getUserContext).mockResolvedValue({
        currentProfile: {
          id: "profile-123",
          full_name: "Current User",
        } as any,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        } as any,
        supabase: mockSupabase as any,
        supabaseHeaders: new Headers(),
      } as any)

      const result = await loader({ request: mockRequest, params: mockParams })
      
      expect(result).toEqual({
        profile: {
          id: "profile-123",
          full_name: "Current User",
        },
        orphanedProfile: null,
      })
    })

    it("should handle errors when checking for orphaned profiles", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: "Database error" } 
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
        } as any,
        supabase: mockSupabase as any,
        supabaseHeaders: new Headers(),
      } as any)

      const result = await loader({ request: mockRequest, params: mockParams })
      
      expect(result).toEqual({
        profile: null,
        orphanedProfile: null,
      })
    })
  })
})