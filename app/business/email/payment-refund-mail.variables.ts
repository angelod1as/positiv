// The placeholders each payment-refund copy field is allowed to use. One source
// shared by the Studio schema (publish-time validation), the zod contract
// (pnpm test:contract) and the renderer, so the three never drift apart.
export const PAYMENT_REFUND_MAIL_VARIABLES = {
  subject: ["evento"],
  heading: [],
  body: ["nome", "evento"],
  cta: [],
} as const
