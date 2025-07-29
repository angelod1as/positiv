import { describe, expect, it, vi } from "vitest"
import { basicData } from "./basic-data.server"
import type { z } from "zod"
import type { contextSchema } from "../common"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "~/types/database/database.types"

describe("basicData", () => {
  const mockFormData = {
    full_name: "Test User",
    social_name: "Test",
    date_of_birth: "1990-01-01",
    where_lives: "São Paulo",
    how_came_to_us: "Friend",
    phone: "11999999999",
    confirm_phone: "11999999999",
    cpf: "12345678901",
    rg: "123456789",
    rg_issuer: "SSP/SP",
  }

  describe("orphaned profile handling", () => {
    it("should check for orphaned profiles with matching email", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockIs = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const mockContext: z.infer<typeof contextSchema> = {
        supabase: { from: mockFrom } as unknown as SupabaseClient<Database>,
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabaseHeaders: new Headers(),
        host: "localhost",
      }

      const result = await basicData(mockFormData, mockContext)
      
      // Check that the function succeeded
      expect(result.success).toBe(true)
      
      // Verify the orphaned profile check was made
      expect(mockFrom).toHaveBeenCalledWith("profiles")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockEq).toHaveBeenCalledWith("email", "test@example.com")
      expect(mockIs).toHaveBeenCalledWith("user_id", null)
      expect(mockSingle).toHaveBeenCalled()

      // Verify upsert was called
      expect(mockUpsert).toHaveBeenCalled()
    })

    it("should use orphaned profile ID when found", async () => {
      const orphanedProfile = {
        id: "orphaned-profile-123",
        email: "test@example.com",
        full_name: "Old Name",
        user_id: null,
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: orphanedProfile, error: null })
      const mockIs = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const mockContext: z.infer<typeof contextSchema> = {
        supabase: { from: mockFrom } as unknown as SupabaseClient<Database>,
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabaseHeaders: new Headers(),
        host: "localhost",
      }

      const result = await basicData(mockFormData, mockContext)
      
      expect(result.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "orphaned-profile-123",
          user_id: "user-123",
          email: "test@example.com",
        })
      )
    })

    it("should create new profile when no orphaned profile exists", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockIs = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const mockContext: z.infer<typeof contextSchema> = {
        supabase: { from: mockFrom } as unknown as SupabaseClient<Database>,
        currentProfile: null,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabaseHeaders: new Headers(),
        host: "localhost",
      }

      const result = await basicData(mockFormData, mockContext)
      
      expect(result.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          user_id: "user-123",
          email: "test@example.com",
        })
      )
    })

    it("should use currentProfile ID when available and no orphaned profile", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockIs = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const mockContext: z.infer<typeof contextSchema> = {
        supabase: { from: mockFrom } as unknown as SupabaseClient<Database>,
        currentProfile: { 
          id: "current-profile-123",
          basic_data_filled: false,
          created_at: "2024-01-01T00:00:00Z",
          is_admin: false,
          email: null,
          full_name: null,
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
          allow_marketing_email: null
        },
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabaseHeaders: new Headers(),
        host: "localhost",
      }

      const result = await basicData(mockFormData, mockContext)
      
      expect(result.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "current-profile-123",
          user_id: "user-123",
        })
      )
    })
  })
})