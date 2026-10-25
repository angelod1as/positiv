import type { Database } from "~/types/database/database.types"

export type Permission = Database["public"]["Enums"]["app_permission"]

export const PERMISSIONS = {
  ADMIN_PANEL: "admin.panel",
  EVENTS_MANAGE: "events.manage",
  PARTICIPANTS_MANAGE: "participants.manage",
  PROFILES_MANAGE: "profiles.manage",
  NEWSLETTER_MANAGE: "newsletter.manage",
  REPORTS_READ: "reports.read",
  EVENTS_APPLY_DIRECT: "events.apply_direct",
  EVENTS_APPLY_AS_STAFF: "events.apply_as_staff",
  NOTIFICATIONS_RECEIVE_ADMIN: "notifications.receive_admin",
} as const satisfies Record<string, Permission>

export function can(
  profile: { permissions?: readonly string[] | null } | null | undefined,
  permission: Permission,
): boolean {
  return profile?.permissions?.includes(permission) ?? false
}
