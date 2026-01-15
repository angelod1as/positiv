/**
 * Shared color utilities for badges, chips, and AG Grid cell backgrounds.
 * Ensures consistent colors across the application.
 *
 * Color palettes:
 * - Veteran/Rookie: Purple/violet tones
 * - Event count: Indigo/blue tones
 */

export const VETERAN_COLORS = "!bg-purple-700 text-white border border-white"
export const ROOKIE_COLORS = "!bg-violet-100 text-violet-900 border border-violet-900"

export function getVeteranRookieColors(isVeteran: boolean | null | undefined): string {
  if (isVeteran === null || isVeteran === undefined) return ""
  return isVeteran ? VETERAN_COLORS : ROOKIE_COLORS
}

export function getEventCountColors(count: number | null | undefined): string {
  if (count === null || count === undefined) return ""
  if (count <= 2) return "bg-indigo-100 text-indigo-900"
  if (count <= 4) return "bg-indigo-300 text-indigo-900"
  if (count <= 6) return "bg-indigo-500 text-white"
  if (count <= 8) return "bg-indigo-600 text-white"
  return "bg-indigo-700 text-white"
}
