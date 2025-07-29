import { describe, expect, it, vi } from "vitest"
import { getContext } from "./auth.server"

vi.mock("~/env.server", () => ({
  env: vi.fn(() => ({ isProdInDev: "false" })),
}))

vi.mock("~/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn(() => {
    throw new Response("", { status: 302, headers: { Location: "/dashboard" } })
  }),
}))

describe("getContext", () => {
  it("should handle refresh_token_not_found error gracefully", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}
    
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Invalid Refresh Token: Refresh Token Not Found",
            code: "refresh_token_not_found",
          },
        }),
      },
    }
    
    const mockHeaders = new Headers()
    
    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as any,
      headers: mockHeaders,
    })
    
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    
    try {
      const result = await getContext(mockRequest, mockParams)
      
      expect(result.currentUser).toBeNull()
      expect(result.currentProfile).toBeNull()
      expect(result.supabaseHeaders.get("Set-Cookie")).toContain("sb-127-auth-token=; Max-Age=0")
      expect(consoleSpy).not.toHaveBeenCalled()
    } catch (e) {
      console.log("Error caught:", e)
      throw e
    } finally {
      consoleSpy.mockRestore()
    }
  })
})