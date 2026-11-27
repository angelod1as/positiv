import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"

export interface AuditProfile {
  id: string
  email: string
  isVeteran: boolean
  newsletter: boolean | null
  listmonkSubscriberId: number | null
}

export interface AuditSubscriber {
  id: number
  email: string
  status: string
  profileId: string | null
  lists: Array<{ id: number; subscription_status: string }>
}

type NotAptReason =
  | "not_on_audited_lists"
  | "email_mismatch"
  | "blocklisted"
  | "left_veterans_list"
  | "not_in_registered"
  | "pending_sync"

type WithoutConsentReason =
  | "refused"
  | "no_record"
  | "not_veteran"
  | "unknown_email"

const normalize = (email: string) => email.trim().toLowerCase()

function membership(subscriber: AuditSubscriber, listId: number) {
  return subscriber.lists.find((list) => list.id === listId)
    ?.subscription_status
}

function isActiveIn(subscriber: AuditSubscriber, listId: number) {
  const status = membership(subscriber, listId)
  return status !== undefined && status !== "unsubscribed"
}

function increment<K extends string>(counts: Record<K, number>, key: K) {
  counts[key] += 1
}

export function auditVeteransList({
  profiles,
  subscribers,
}: {
  profiles: AuditProfile[]
  subscribers: AuditSubscriber[]
}) {
  const subscriberByEmail = new Map(
    subscribers.map((subscriber) => [normalize(subscriber.email), subscriber]),
  )
  const profileByEmail = new Map(
    profiles.map((profile) => [normalize(profile.email), profile]),
  )
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const profileBySubscriberId = new Map(
    profiles
      .filter((profile) => profile.listmonkSubscriberId !== null)
      .map((profile) => [profile.listmonkSubscriberId, profile]),
  )

  const linkedSubscribers = (profile: AuditProfile) =>
    subscribers.filter(
      (subscriber) =>
        normalize(subscriber.email) === normalize(profile.email) ||
        subscriber.profileId === profile.id ||
        subscriber.id === profile.listmonkSubscriberId,
    )

  const veterans = profiles.filter((profile) => profile.isVeteran)
  const consented = veterans.filter((profile) => profile.newsletter === true)

  const consentedNotApt: Record<NotAptReason, number> = {
    not_on_audited_lists: 0,
    email_mismatch: 0,
    blocklisted: 0,
    left_veterans_list: 0,
    not_in_registered: 0,
    pending_sync: 0,
  }
  let apt = 0

  for (const profile of consented) {
    const subscriber = subscriberByEmail.get(normalize(profile.email))
    if (!subscriber) {
      increment(
        consentedNotApt,
        linkedSubscribers(profile).length > 0
          ? "email_mismatch"
          : "not_on_audited_lists",
      )
    } else if (subscriber.status === "blocklisted") {
      increment(consentedNotApt, "blocklisted")
    } else if (isActiveIn(subscriber, LISTMONK_VETERANS_LIST_ID)) {
      apt += 1
    } else if (
      membership(subscriber, LISTMONK_VETERANS_LIST_ID) === "unsubscribed"
    ) {
      increment(consentedNotApt, "left_veterans_list")
    } else if (!isActiveIn(subscriber, LISTMONK_REGISTERED_LIST_ID)) {
      increment(consentedNotApt, "not_in_registered")
    } else {
      increment(consentedNotApt, "pending_sync")
    }
  }

  const veteransList = { active: 0, unsubscribed: 0, blocklisted: 0 }
  const inListWithoutConsent: Record<WithoutConsentReason, number> = {
    refused: 0,
    no_record: 0,
    not_veteran: 0,
    unknown_email: 0,
  }

  for (const subscriber of subscribers) {
    const status = membership(subscriber, LISTMONK_VETERANS_LIST_ID)
    if (status === undefined) {
      continue
    }
    if (subscriber.status === "blocklisted") {
      veteransList.blocklisted += 1
      continue
    }
    if (status === "unsubscribed") {
      veteransList.unsubscribed += 1
      continue
    }
    veteransList.active += 1

    const profile =
      profileByEmail.get(normalize(subscriber.email)) ??
      (subscriber.profileId ? profileById.get(subscriber.profileId) : undefined) ??
      profileBySubscriberId.get(subscriber.id)

    if (!profile) {
      increment(inListWithoutConsent, "unknown_email")
    } else if (!profile.isVeteran) {
      increment(inListWithoutConsent, "not_veteran")
    } else if (profile.newsletter === false) {
      increment(inListWithoutConsent, "refused")
    } else if (profile.newsletter === null) {
      increment(inListWithoutConsent, "no_record")
    }
  }

  const duplicated = profiles.filter(
    (profile) => linkedSubscribers(profile).length > 1,
  )

  return {
    veterans: veterans.length,
    consented: consented.length,
    refused: veterans.filter((profile) => profile.newsletter === false).length,
    noRecord: veterans.filter((profile) => profile.newsletter === null).length,
    apt,
    veteransList,
    consentedNotApt,
    inListWithoutConsent,
    duplicates: {
      veterans: duplicated.filter((profile) => profile.isVeteran).length,
      allProfiles: duplicated.length,
    },
  }
}
