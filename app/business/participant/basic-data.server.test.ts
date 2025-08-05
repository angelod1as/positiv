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

  describe("marketing email preference preservation", () => {
    it("should preserve existing allow_marketing_email value when updating profile", async () => {
      const orphanedProfile = {
        id: "profile-123",
        email: "test@example.com",
        allow_marketing_email: true,
        basic_data_filled: false,
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

      await basicData(mockFormData, mockContext)

      // Check that upsert was called
      expect(mockUpsert).toHaveBeenCalled()
      const upsertData = mockUpsert.mock.calls[0][0]
      
      // Verify that allow_marketing_email was preserved from orphaned profile
      expect(upsertData.allow_marketing_email).toBe(true)
    })

    it("should preserve existing allow_marketing_email value for current profile", async () => {
      const currentProfile = {
        id: "profile-456",
        email: "test@example.com",
        full_name: "Old Name",
        basic_data_filled: true,
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
        allow_marketing_email: false,
        created_at: "2025-01-01T00:00:00Z",
        is_admin: false,
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
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
        currentProfile,
        currentUser: {
          id: "user-123",
          email: "test@example.com",
        },
        supabaseHeaders: new Headers(),
        host: "localhost",
      }

      await basicData(mockFormData, mockContext)

      // Check that upsert was called
      expect(mockUpsert).toHaveBeenCalled()
      const upsertData = mockUpsert.mock.calls[0][0]
      
      // Verify that allow_marketing_email was preserved from current profile
      expect(upsertData.allow_marketing_email).toBe(false)
    })
  })

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
          user_id: "user-123",
          email: "test@example.com",
        })
      )
      // Verify id is not included when creating new profile
      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall).not.toHaveProperty('id')
      // But should have all other required fields
      expect(upsertCall).toHaveProperty('full_name', 'Test User')
      expect(upsertCall).toHaveProperty('date_of_birth')
    })

    it("should handle database errors when checking for orphaned profiles", async () => {
      const databaseError = { code: 'PGRST500', message: 'Database connection error' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: databaseError })
      const mockIs = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
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
      
      expect(result.success).toBe(false)
      expect(result.errors?.[0]?.message).toContain('Error checking for orphaned profile')
    })

    it("should ignore 'no rows' error when checking for orphaned profiles", async () => {
      const noRowsError = { code: 'PGRST116', message: 'No rows found' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: noRowsError })
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
      // Should proceed with upsert despite 'no rows' error
      expect(mockUpsert).toHaveBeenCalled()
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