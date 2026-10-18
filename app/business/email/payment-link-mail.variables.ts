// The placeholders each payment-link copy field is allowed to use. One source
// shared by the Studio schema (publish-time validation), the zod contract
// (pnpm test:contract) and the renderer, so the three never drift apart.
export const PAYMENT_LINK_MAIL_VARIABLES = {
  subject: ["evento"],
  heading: [],
  body: ["nome", "evento"],
} as const
