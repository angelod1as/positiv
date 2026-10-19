// The placeholders each registration-limit copy field is allowed to use. One
// source shared by the Studio schema (publish-time validation), the zod
// contract (pnpm test:contract) and the renderer, so the three never drift.
export const REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES = {
  subject: ["evento"],
  heading: [],
  body: ["evento", "participantes"],
  cta: [],
  closing: [],
} as const
