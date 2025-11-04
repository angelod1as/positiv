export type SubscriptionSource =
  | "onboarding_auto"
  | "terms_and_conditions"
  | "manual_button"
  | "backfill"
  | "admin"

export type SyncStatus = "pending" | "synced" | "failed" | "unsubscribed"
