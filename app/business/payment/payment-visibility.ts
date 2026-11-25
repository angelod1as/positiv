import { can, PERMISSIONS } from "~/business/auth/permissions"

type Viewer = { permissions?: readonly string[] | null } | null | undefined

type PaymentFields = {
  paid_gross: number
  net: number
  refunded: number
  payment_status: string | null
  active_payment_id: string | null
}

export const canSeePayments = (viewer: Viewer): boolean =>
  can(viewer, PERMISSIONS.PAYMENTS_MANAGE)

/**
 * Entering the admin area is not enough to see money. Rows that carry a
 * participant's payment go through here before they leave the server, so a
 * person without payments.manage never receives the amounts, not just never
 * sees them.
 *
 * Blanked rows read as "no payment": zero amounts and no status. Whatever
 * renders them must also ask canSeePayments, or it will show a free spot.
 */
export function paymentsVisibleTo<T extends PaymentFields>(
  viewer: Viewer,
  rows: T[],
): T[] {
  if (canSeePayments(viewer)) return rows

  return rows.map((row) => ({
    ...row,
    paid_gross: 0,
    net: 0,
    refunded: 0,
    payment_status: null,
    active_payment_id: null,
  }))
}
