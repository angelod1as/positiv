import type { Database } from "~types/database/database.types"

type PaymentStatus = Database["public"]["Enums"]["payment_status"]

/**
 * The statuses where money actually arrived. `paid` and `partially_refunded`
 * mean Positiv holds something; `refunded` means it arrived and went back, so
 * the amount is still a fact about the participation.
 *
 * Everything else — `pending`, `awaiting_payment`, `expired`, `cancelled` — is
 * a charge that was never collected, and its zero means "nothing came in",
 * which is a different statement from a staff spot settled at zero.
 */
const SETTLED_STATUSES: PaymentStatus[] = [
  "paid",
  "refunded",
  "partially_refunded",
]

/** Whether the ledger recorded money changing hands, at any amount, zero included. */
export const isSettledPayment = (
  status: PaymentStatus | null | undefined,
): boolean => status != null && SETTLED_STATUSES.includes(status)

/** Whether Positiv still holds what was paid — a full refund answers false. */
export const holdsPayment = (
  status: PaymentStatus | null | undefined,
): boolean => status === "paid" || status === "partially_refunded"

/**
 * What the grid reads for a participant's payment status, cell and filter
 * alike. `BaseMultiSelectFilter` drops a null value — the option never appears
 * and every unpaid participant vanishes the moment any status is picked — so
 * "no payment" needs a value of its own rather than an absence.
 */
export const NO_PAYMENT_STATUS = "none"

export const paymentStatusFilterValue = (
  row: { payment_status?: PaymentStatus | null } | null | undefined,
): string => row?.payment_status ?? NO_PAYMENT_STATUS
