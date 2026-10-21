/**
 * User role constants used throughout the application
 * These values must match the role_name values in the user_roles table
 */
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const

export type RoleName = typeof ROLES[keyof typeof ROLES]