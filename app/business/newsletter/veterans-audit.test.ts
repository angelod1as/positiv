import { describe, expect, it } from "vitest"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"
import {
  auditVeteransList,
  type AuditProfile,
  type AuditSubscriber,
} from "./veterans-audit"

const REGISTERED = LISTMONK_REGISTERED_LIST_ID
const VETERANS = LISTMONK_VETERANS_LIST_ID

function profile(overrides: Partial<AuditProfile> & { id: string }): AuditProfile {
  return {
    email: `${overrides.id}@example.com`,
    isVeteran: true,
    newsletter: true,
    listmonkSubscriberId: null,
    ...overrides,
  }
}

function subscriber(
  overrides: Partial<AuditSubscriber> & { id: number; email: string },
): AuditSubscriber {
  return {
    status: "enabled",
    profileId: null,
    lists: [
      { id: REGISTERED, subscription_status: "confirmed" },
      { id: VETERANS, subscription_status: "confirmed" },
    ],
    ...overrides,
  }
}

describe("auditVeteransList", () => {
  it("counts a consented veteran on the Veterans list as apt", () => {
    const result = auditVeteransList({
      profiles: [profile({ id: "a" })],
      subscribers: [subscriber({ id: 1, email: "A@example.com " })],
    })

    expect(result.veterans).toBe(1)
    expect(result.consented).toBe(1)
    expect(result.apt).toBe(1)
    expect(result.veteransList).toEqual({
      active: 1,
      unsubscribed: 0,
      blocklisted: 0,
    })
  })

  it("matches e-mails regardless of case on either side", () => {
    const result = auditVeteransList({
      profiles: [profile({ id: "a", email: " Someone@Example.com" })],
      subscribers: [subscriber({ id: 1, email: "someone@EXAMPLE.com" })],
    })

    expect(result.apt).toBe(1)
  })

  it("splits veterans by consent: yes, refused, no record", () => {
    const result = auditVeteransList({
      profiles: [
        profile({ id: "a" }),
        profile({ id: "b", newsletter: false }),
        profile({ id: "c", newsletter: null }),
        profile({ id: "d", isVeteran: false }),
      ],
      subscribers: [],
    })

    expect(result.veterans).toBe(3)
    expect(result.consented).toBe(1)
    expect(result.refused).toBe(1)
    expect(result.noRecord).toBe(1)
  })

  it("explains why a consented veteran is not apt", () => {
    const result = auditVeteransList({
      profiles: [
        profile({ id: "missing" }),
        profile({ id: "moved", listmonkSubscriberId: 2 }),
        profile({ id: "blocked" }),
        profile({ id: "left" }),
        profile({ id: "unregistered" }),
        profile({ id: "pending" }),
      ],
      subscribers: [
        subscriber({ id: 2, email: "old-address@example.com" }),
        subscriber({ id: 3, email: "blocked@example.com", status: "blocklisted" }),
        subscriber({
          id: 4,
          email: "left@example.com",
          lists: [
            { id: REGISTERED, subscription_status: "confirmed" },
            { id: VETERANS, subscription_status: "unsubscribed" },
          ],
        }),
        subscriber({
          id: 5,
          email: "unregistered@example.com",
          lists: [{ id: REGISTERED, subscription_status: "unsubscribed" }],
        }),
        subscriber({
          id: 6,
          email: "pending@example.com",
          lists: [{ id: REGISTERED, subscription_status: "confirmed" }],
        }),
      ],
    })

    expect(result.apt).toBe(0)
    expect(result.consentedNotApt).toEqual({
      not_on_audited_lists: 1,
      email_mismatch: 1,
      blocklisted: 1,
      left_veterans_list: 1,
      not_in_registered: 1,
      pending_sync: 1,
    })
  })

  it("links a subscriber to a profile through its profile_id attribute", () => {
    const result = auditVeteransList({
      profiles: [profile({ id: "a" })],
      subscribers: [
        subscriber({ id: 1, email: "previous@example.com", profileId: "a" }),
      ],
    })

    expect(result.consentedNotApt.email_mismatch).toBe(1)
  })

  it("counts Veterans list members who should not be there, by reason", () => {
    const result = auditVeteransList({
      profiles: [
        profile({ id: "refused", newsletter: false }),
        profile({ id: "unknown", newsletter: null }),
        profile({ id: "civilian", isVeteran: false }),
      ],
      subscribers: [
        subscriber({ id: 1, email: "refused@example.com" }),
        subscriber({ id: 2, email: "unknown@example.com" }),
        subscriber({ id: 3, email: "civilian@example.com" }),
        subscriber({ id: 4, email: "stranger@example.com" }),
      ],
    })

    expect(result.inListWithoutConsent).toEqual({
      refused: 1,
      no_record: 1,
      not_veteran: 1,
      unknown_email: 1,
    })
  })

  it("counts Veterans list members by status", () => {
    const result = auditVeteransList({
      profiles: [],
      subscribers: [
        subscriber({ id: 1, email: "a@example.com" }),
        subscriber({ id: 2, email: "b@example.com", status: "blocklisted" }),
        subscriber({
          id: 3,
          email: "c@example.com",
          lists: [{ id: VETERANS, subscription_status: "unsubscribed" }],
        }),
        subscriber({
          id: 4,
          email: "d@example.com",
          lists: [{ id: REGISTERED, subscription_status: "confirmed" }],
        }),
      ],
    })

    expect(result.veteransList).toEqual({
      active: 1,
      unsubscribed: 1,
      blocklisted: 1,
    })
  })

  it("finds profiles with more than one Listmonk subscriber", () => {
    const result = auditVeteransList({
      profiles: [
        profile({ id: "a", listmonkSubscriberId: 1 }),
        profile({ id: "b", isVeteran: false }),
      ],
      subscribers: [
        subscriber({ id: 1, email: "a@example.com" }),
        subscriber({ id: 2, email: "a-old@example.com", profileId: "a" }),
        subscriber({ id: 3, email: "b@example.com", profileId: "b" }),
        subscriber({ id: 4, email: "b-old@example.com", profileId: "b" }),
      ],
    })

    expect(result.duplicates).toEqual({ veterans: 1, allProfiles: 2 })
  })
})
