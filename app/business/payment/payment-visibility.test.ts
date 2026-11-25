import { describe, expect, it } from "vitest"
import { PERMISSIONS } from "~/business/auth/permissions"
import { canSeePayments, paymentsVisibleTo } from "./payment-visibility"

const treasurer = {
  permissions: [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PAYMENTS_MANAGE],
}
const interviewer = { permissions: [PERMISSIONS.ADMIN_PANEL] }

const row = {
  id: "ep-1",
  full_name: "Ana",
  paid_gross: 22000,
  net: 21000,
  refunded: 1000,
  payment_status: "partially_refunded" as const,
  active_payment_id: "pay-1",
}

describe("canSeePayments", () => {
  it("is true only with payments.manage", () => {
    expect(canSeePayments(treasurer)).toBe(true)
    expect(canSeePayments(interviewer)).toBe(false)
    expect(canSeePayments(null)).toBe(false)
  })
})

describe("paymentsVisibleTo", () => {
  it("hands the rows back untouched to a person who handles payments", () => {
    expect(paymentsVisibleTo(treasurer, [row])).toEqual([row])
  })

  it("blanks every payment field for anyone else, and keeps the rest", () => {
    expect(paymentsVisibleTo(interviewer, [row])).toEqual([
      {
        id: "ep-1",
        full_name: "Ana",
        paid_gross: 0,
        net: 0,
        refunded: 0,
        payment_status: null,
        active_payment_id: null,
      },
    ])
  })
})
