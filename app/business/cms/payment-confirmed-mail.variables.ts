// The placeholders each payment-confirmed copy field is allowed to use. One
// source shared by the Studio schema (publish-time validation), the zod
// contract (pnpm test:contract) and the renderer, so the three never drift.
export const PAYMENT_CONFIRMED_MAIL_VARIABLES = {
  subject: ["evento"],
  heading: [],
  body: ["nome", "evento"],
  cta: [],
  closing: [],
} as const
