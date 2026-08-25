# POS-527 — Pricing engine (fees passed to the participant) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure module that, given the amount Positiv must net and the account's Asaas fees, produces the gross price of every payment option (PIX, card 1x…6x) so that the participant pays every fee and Positiv nets exactly the ticket price.

**Architecture:** One pure file, `app/business/payment/pricing.ts`, with no I/O and no copy — it returns numbers; labels are built by the caller from `app/copy/payments.ts`. Fees arrive as a plain object (`AsaasFees`) produced by POS-526's `asaas-fees.server.ts`, so this module is testable with literal fee tables. Everything is integer cents; rounding is always up so Positiv is never short.

**Tech Stack:** TypeScript, Vitest. Depends on POS-526 (the `AsaasFees` type lives there — this plan re-declares it inline in the test if POS-526 has not merged yet, see Task 1).

**Spec:** `docs/plans/payments-v3-design.md` §6.

**Branch:** `pos-527-pricing-engine` from `main`, worktree `wt/pos-527-pricing-engine`.

> **Correction, 2026-08-24 (POS-519).** The real `GET /v3/myAccount/fees/`
> payload disagrees with this plan in two places, and the numbers below were
> written before it was read:
>
> - **Anticipation is two monthly rates, not one.**
>   `detachedMonthlyFeeValue` (1.15%/month) applies at `n = 1`,
>   `installmentMonthlyFeeValue` (1.60%/month) at `n = 2…6`. So
>   `AsaasFees.anticipationMonthlyRate` — a single field here, used by
>   `LIST_FEES`, the property test and `buildPaymentOptions` — has to become
>   two, and the worked values in "Formula (from the spec)" and the test
>   table need recomputing against them. At 6x the anticipation term is 5.6%,
>   not the 4.375% these examples assume.
> - **`pix.percentageFee` is `null`**, not `0`, whenever `pix.type` is
>   `FIXED`. Mapping happens in POS-526, but a test table here that hardcodes
>   `percent: 0` is testing a shape the API does not return.
>
> Full payload and reasoning: POS-519 and the POS-527 comment on Linear.
> `docs/plans/payments-v3-design.md` §6 is already corrected.


---

## Formula (from the spec)

For `n` installments with card percentage `p` (1x tier or 2–6x tier), fixed fee `f`, anticipation monthly rate `r`:

```
G = ceil( (base + f) / (1 − p − r·(n+1)/2) )
perInstallment = ceil(G / n)
total = perInstallment × n
```

PIX: `G = ceil( (base + pixFixed) / (1 − pixPercent) )`.

Worked values with the public list fees (`pix.fixed = 199`, `pix.percent = 0`, `card.fixed = 49`, `card.percentOneInstallment = 0.0299`, `card.percentUpToSix = 0.0349`, `anticipationMonthlyRate = 0.0125`) and `base = 22000`:

| option | denominator | G | per | total |
|---|---|---|---|---|
| pix | 1 | 22199 | — | 22199 |
| card_1 | 1 − 0.0299 − 0.0125·1 = 0.9576 | ceil(22049 / 0.9576) = 23026 | 23026 | 23026 |
| card_2 | 1 − 0.0349 − 0.0125·1.5 = 0.94635 | ceil(22049 / 0.94635) = 23299 | 11650 | 23300 |
| card_3 | 1 − 0.0349 − 0.0125·2 = 0.9401 | ceil(22049 / 0.9401) = 23454 | 7818 | 23454 |
| card_6 | 1 − 0.0349 − 0.0125·3.5 = 0.92135 | ceil(22049 / 0.92135) = 23932 | 3989 | 23934 |

The test in Task 2 asserts these numbers. If an implementation disagrees by one cent, the implementation is wrong, not the table — recompute by hand before touching the expectation.

---

### Task 1: Types and option ids

**Files:**
- Create: `app/business/payment/pricing.ts`
- Test: `app/business/payment/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/business/payment/pricing.test.ts
import { describe, expect, it } from "vitest"
import {
  MAX_INSTALLMENTS,
  PAYMENT_OPTION_IDS,
  parsePaymentOptionId,
} from "./pricing"

describe("payment option ids", () => {
  it("lists pix and one card option per installment count", () => {
    expect(MAX_INSTALLMENTS).toBe(6)
    expect(PAYMENT_OPTION_IDS).toEqual([
      "pix",
      "card_1",
      "card_2",
      "card_3",
      "card_4",
      "card_5",
      "card_6",
    ])
  })

  it("parses a known id and rejects anything else", () => {
    expect(parsePaymentOptionId("pix")).toBe("pix")
    expect(parsePaymentOptionId("card_3")).toBe("card_3")
    expect(parsePaymentOptionId("card_7")).toBeNull()
    expect(parsePaymentOptionId("boleto")).toBeNull()
    expect(parsePaymentOptionId(3)).toBeNull()
    expect(parsePaymentOptionId(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: FAIL — `Cannot find module './pricing'`

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/pricing.ts
export const MAX_INSTALLMENTS = 6

export type AsaasFees = {
  pix: { fixed: number; percent: number }
  card: {
    fixed: number
    percentOneInstallment: number
    percentUpToSix: number
  }
  anticipationMonthlyRate: number
}

export type PaymentOptionId =
  | "pix"
  | "card_1"
  | "card_2"
  | "card_3"
  | "card_4"
  | "card_5"
  | "card_6"

export const PAYMENT_OPTION_IDS: readonly PaymentOptionId[] = [
  "pix",
  "card_1",
  "card_2",
  "card_3",
  "card_4",
  "card_5",
  "card_6",
]

export function parsePaymentOptionId(value: unknown): PaymentOptionId | null {
  if (typeof value !== "string") return null
  return (PAYMENT_OPTION_IDS as readonly string[]).includes(value)
    ? (value as PaymentOptionId)
    : null
}
```

`AsaasFees` is declared here on purpose: pricing owns the shape it consumes, and `asaas-fees.server.ts` (POS-526) imports it from here. If POS-526 merged first with its own declaration, delete that one and import from `./pricing`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/pricing.ts app/business/payment/pricing.test.ts
git commit -m "feat(payments): declare the payment option ids and the fee shape"
```

---

### Task 2: Gross-up for PIX and card

**Files:**
- Modify: `app/business/payment/pricing.ts`
- Test: `app/business/payment/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `pricing.test.ts`:

```ts
import { grossForCard, grossForPix } from "./pricing"

export const LIST_FEES = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipationMonthlyRate: 0.0125,
}

describe("grossForPix", () => {
  it("adds the fixed PIX fee", () => {
    expect(grossForPix(22000, LIST_FEES)).toBe(22199)
  })

  it("grosses up a percentage PIX fee, rounding up", () => {
    const fees = { ...LIST_FEES, pix: { fixed: 0, percent: 0.01 } }
    // 22000 / 0.99 = 22222.22…
    expect(grossForPix(22000, fees)).toBe(22223)
  })
})

describe("grossForCard", () => {
  it("uses the 1x tier plus one month of anticipation for a single installment", () => {
    expect(grossForCard(22000, 1, LIST_FEES)).toBe(23026)
  })

  it("uses the 2–6x tier and (n+1)/2 months of anticipation", () => {
    expect(grossForCard(22000, 2, LIST_FEES)).toBe(23299)
    expect(grossForCard(22000, 3, LIST_FEES)).toBe(23454)
    expect(grossForCard(22000, 6, LIST_FEES)).toBe(23932)
  })

  it("never nets less than the base after the fees are taken", () => {
    for (const base of [100, 999, 22000, 123456]) {
      for (let n = 1; n <= 6; n++) {
        const gross = grossForCard(base, n, LIST_FEES)
        const percent =
          n === 1
            ? LIST_FEES.card.percentOneInstallment
            : LIST_FEES.card.percentUpToSix
        const anticipation =
          gross * LIST_FEES.anticipationMonthlyRate * ((n + 1) / 2)
        const net = gross - (gross * percent + LIST_FEES.card.fixed) - anticipation
        expect(net).toBeGreaterThanOrEqual(base)
      }
    }
  })

  it("rejects installment counts outside 1..6", () => {
    expect(() => grossForCard(22000, 0, LIST_FEES)).toThrow()
    expect(() => grossForCard(22000, 7, LIST_FEES)).toThrow()
  })

  it("rejects a fee table whose fees eat the whole price", () => {
    const fees = { ...LIST_FEES, anticipationMonthlyRate: 0.5 }
    expect(() => grossForCard(22000, 6, fees)).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: FAIL — `grossForPix is not a function` (or not exported)

- [ ] **Step 3: Write minimal implementation**

Append to `pricing.ts`:

```ts
function assertInstallments(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) {
    throw new Error(`installment count must be between 1 and ${MAX_INSTALLMENTS}, got ${n}`)
  }
}

export function grossForPix(base: number, fees: AsaasFees): number {
  const denominator = 1 - fees.pix.percent
  if (denominator <= 0) throw new Error("PIX fee leaves nothing to receive")
  return Math.ceil((base + fees.pix.fixed) / denominator)
}

export function grossForCard(base: number, n: number, fees: AsaasFees): number {
  assertInstallments(n)
  const percent =
    n === 1 ? fees.card.percentOneInstallment : fees.card.percentUpToSix
  const anticipation = fees.anticipationMonthlyRate * ((n + 1) / 2)
  const denominator = 1 - percent - anticipation
  if (denominator <= 0) throw new Error("card fees leave nothing to receive")
  return Math.ceil((base + fees.card.fixed) / denominator)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/pricing.ts app/business/payment/pricing.test.ts
git commit -m "feat(payments): gross up the ticket price so the participant pays the Asaas fees"
```

---

### Task 3: Payment options with per-installment values

**Files:**
- Modify: `app/business/payment/pricing.ts`
- Test: `app/business/payment/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `pricing.test.ts`:

```ts
import { buildPaymentOptions, findPaymentOption } from "./pricing"

describe("buildPaymentOptions", () => {
  it("returns pix first, then card 1x..6x", () => {
    const options = buildPaymentOptions(22000, LIST_FEES)
    expect(options.map((o) => o.id)).toEqual(PAYMENT_OPTION_IDS)
  })

  it("carries method, installment count and rounded-up installment values", () => {
    const options = buildPaymentOptions(22000, LIST_FEES)
    expect(options[0]).toEqual({
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: 22199,
      total: 22199,
    })
    expect(options[1]).toEqual({
      id: "card_1",
      method: "credit_card",
      installmentCount: 1,
      perInstallment: 23026,
      total: 23026,
    })
    expect(options[3]).toEqual({
      id: "card_3",
      method: "credit_card",
      installmentCount: 3,
      perInstallment: 7818,
      total: 23454,
    })
    expect(options[6]).toEqual({
      id: "card_6",
      method: "credit_card",
      installmentCount: 6,
      perInstallment: 3989,
      total: 23934,
    })
  })

  it("total is always perInstallment times the count", () => {
    for (const option of buildPaymentOptions(12345, LIST_FEES)) {
      if (option.installmentCount) {
        expect(option.total).toBe(option.perInstallment * option.installmentCount)
      }
    }
  })
})

describe("findPaymentOption", () => {
  it("returns the option for an id and null for an unknown one", () => {
    const options = buildPaymentOptions(22000, LIST_FEES)
    expect(findPaymentOption(options, "card_2")?.installmentCount).toBe(2)
    expect(findPaymentOption(options, "card_9")).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: FAIL — `buildPaymentOptions is not a function`

- [ ] **Step 3: Write minimal implementation**

Append to `pricing.ts`:

```ts
export type PaymentMethod = "pix" | "credit_card"

export type PaymentOption = {
  id: PaymentOptionId
  method: PaymentMethod
  installmentCount: number | null
  perInstallment: number
  total: number
}

export function buildPaymentOptions(base: number, fees: AsaasFees): PaymentOption[] {
  const pixTotal = grossForPix(base, fees)
  const options: PaymentOption[] = [
    {
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: pixTotal,
      total: pixTotal,
    },
  ]

  for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
    const gross = grossForCard(base, n, fees)
    const perInstallment = Math.ceil(gross / n)
    options.push({
      id: `card_${n}` as PaymentOptionId,
      method: "credit_card",
      installmentCount: n,
      perInstallment,
      total: perInstallment * n,
    })
  }

  return options
}

export function findPaymentOption(
  options: PaymentOption[],
  id: unknown,
): PaymentOption | null {
  const parsed = parsePaymentOptionId(id)
  if (!parsed) return null
  return options.find((option) => option.id === parsed) ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/pricing.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/pricing.ts app/business/payment/pricing.test.ts
git commit -m "feat(payments): build the payment options with per-installment values"
```

---

### Task 4: Option labels in copy

**Files:**
- Modify: `app/copy/payments.ts` (created in POS-525; if this PR lands first, create it with only this block)
- Test: `app/copy/payments.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/copy/payments.test.ts
import { describe, expect, it } from "vitest"
import { paymentsCopy } from "./payments"

describe("paymentsCopy.options", () => {
  it("labels pix with the total", () => {
    expect(
      paymentsCopy.options.label({
        id: "pix",
        method: "pix",
        installmentCount: null,
        perInstallment: 22199,
        total: 22199,
      }),
    ).toBe("Pix — R$ 221,99")
  })

  it("labels a single card installment with the total only", () => {
    expect(
      paymentsCopy.options.label({
        id: "card_1",
        method: "credit_card",
        installmentCount: 1,
        perInstallment: 23026,
        total: 23026,
      }),
    ).toBe("Cartão à vista — R$ 230,26")
  })

  it("labels installments with the per-installment value and the total", () => {
    expect(
      paymentsCopy.options.label({
        id: "card_3",
        method: "credit_card",
        installmentCount: 3,
        perInstallment: 7818,
        total: 23454,
      }),
    ).toBe("Cartão 3x de R$ 78,18 (total R$ 234,54)")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/copy/payments.test.ts`
Expected: FAIL — `paymentsCopy.options` is undefined (or module missing)

- [ ] **Step 3: Write minimal implementation**

Add to `app/copy/payments.ts` (the `formatCurrency` helper comes from POS-520, `app/lib/helpers/format-currency.ts`, and formats cents as `R$ 1.234,56`):

```ts
import type { PaymentOption } from "~/business/payment/pricing"
import { formatCurrency } from "~/lib/helpers/format-currency"

export const paymentsCopy = {
  // …existing keys from POS-525 stay above…
  options: {
    label: (option: PaymentOption) => {
      if (option.method === "pix") {
        return `Pix — ${formatCurrency(option.total)}`
      }
      if (option.installmentCount === 1) {
        return `Cartão à vista — ${formatCurrency(option.total)}`
      }
      return `Cartão ${option.installmentCount}x de ${formatCurrency(option.perInstallment)} (total ${formatCurrency(option.total)})`
    },
  },
} as const
```

`app/copy/README.md` allows functions for strings with variables; a copy module importing a type from `app/business` is fine (types only).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/copy/payments.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Lint and full unit run, then commit**

Run: `pnpm lint && pnpm test:unit`
Expected: both clean.

```bash
git add app/copy/payments.ts app/copy/payments.test.ts
git commit -m "feat(payments): label the payment options"
```

---

## Definition of done

- `pnpm lint` green, `pnpm test` green (integration untouched by this PR, still run it).
- PR title: `[POS-527] Price the payment options so the participant covers the Asaas fees`.
- Delete this plan file before opening the PR.
