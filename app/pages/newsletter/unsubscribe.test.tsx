import { describe, it, expect, vi, beforeEach } from "vitest"
import { loader, action } from "./unsubscribe"
import type { Route } from "./+types/unsubscribe"
import * as subscriptionHelpers from "~/business/newsletter/subscription-helpers.server"

vi.mock("~/business/newsletter/subscription-helpers.server", () => ({
  getSubscriptionStatus: vi.fn(),
  unsubscribeProfile: vi.fn(),
}))

vi.mock("~/lib/supabase/db.server", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirstOrThrow: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn((path, _message) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
  redirectWithSuccess: vi.fn((path, _options) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
}))

describe("Newsletter Unsubscribe Page - Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fail - loader requires profileId param", async () => {
    const request = new Request("https://positiv.com/newsletter/unsubscribe")
    const params = {}

    await expect(
      loader({
        request,
        params,
      } as unknown as Route.LoaderArgs)
    ).rejects.toThrow()
  })

  it("should fail - loader validates profileId exists in database", async () => {
    vi.mocked(subscriptionHelpers.getSubscriptionStatus).mockResolvedValueOnce({
      success: false,
      errors: [{ message: "No subscription found" }],
    } as never)

    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe?id=invalid-uuid"
    )
    const params = {}

    await expect(
      loader({
        request,
        params,
      } as unknown as Route.LoaderArgs)
    ).rejects.toThrow()
  })

  it("should fail - loader returns subscriber email and status", async () => {
    const { db } = await import("~/lib/supabase/db.server")

    const mockSubscription = {
      profile_id: "test-profile-id",
      consent_given: true,
      sync_status: "synced" as const,
    }

    vi.mocked(subscriptionHelpers.getSubscriptionStatus).mockResolvedValueOnce({
      success: true,
      data: mockSubscription,
    } as never)

    const mockDbChain = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
        email: "test@example.com",
        full_name: "Test User",
        social_name: null,
      }),
    }

    vi.mocked(db.selectFrom).mockReturnValue(mockDbChain as never)

    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe?id=test-profile-id"
    )
    const params = {}

    const result = await loader({
      request,
      params,
    } as unknown as Route.LoaderArgs)

    expect(result).toEqual({
      profileId: "test-profile-id",
      email: "test@example.com",
      name: "Test User",
      isAlreadyUnsubscribed: false,
    })
  })

  it("should fail - loader handles already unsubscribed state", async () => {
    const { db } = await import("~/lib/supabase/db.server")

    const mockSubscription = {
      profile_id: "test-profile-id",
      consent_given: false,
      sync_status: "unsubscribed" as const,
    }

    vi.mocked(subscriptionHelpers.getSubscriptionStatus).mockResolvedValueOnce({
      success: true,
      data: mockSubscription,
    } as never)

    const mockDbChain = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
        email: "test@example.com",
        full_name: "Test User",
        social_name: null,
      }),
    }

    vi.mocked(db.selectFrom).mockReturnValue(mockDbChain as never)

    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe?id=test-profile-id"
    )
    const params = {}

    const result = await loader({
      request,
      params,
    } as unknown as Route.LoaderArgs)

    expect(result.isAlreadyUnsubscribed).toBe(true)
  })
})

describe("Newsletter Unsubscribe Page - Action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fail - action requires profileId param", async () => {
    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe",
      {
        method: "POST",
      }
    )
    const params = {}

    await expect(
      action({
        request,
        params,
      } as unknown as Route.ActionArgs)
    ).rejects.toThrow()
  })

  it("should fail - action calls unsubscribeProfile with correct profileId", async () => {
    vi.mocked(subscriptionHelpers.unsubscribeProfile).mockResolvedValueOnce({
      success: true,
      data: {
        profile_id: "test-profile-id",
        consent_given: false,
        sync_status: "unsubscribed" as const,
      },
    } as never)

    const formData = new URLSearchParams()
    formData.append("profileId", "test-profile-id")

    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    )
    const params = {}

    await expect(
      action({
        request,
        params,
      } as unknown as Route.ActionArgs)
    ).rejects.toThrow() // Should redirect

    expect(subscriptionHelpers.unsubscribeProfile).toHaveBeenCalledWith(
      "test-profile-id"
    )
  })

  it("should fail - action handles unsubscribe errors gracefully", async () => {
    vi.mocked(subscriptionHelpers.unsubscribeProfile).mockResolvedValueOnce({
      success: false,
      errors: [{ message: "Listmonk API error" }],
    } as never)

    const formData = new URLSearchParams()
    formData.append("profileId", "test-profile-id")

    const request = new Request(
      "https://positiv.com/newsletter/unsubscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    )
    const params = {}

    await expect(
      action({
        request,
        params,
      } as unknown as Route.ActionArgs)
    ).rejects.toThrow()
  })
})
