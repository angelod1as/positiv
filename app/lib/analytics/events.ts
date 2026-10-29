import type { PaymentMethod } from "~/business/payment/pricing"

type PersonalDataField =
  | "email"
  | "name"
  | "cpf"
  | "phone"
  | "userId"
  | "profileId"
  | "domain"

type AnonymousPayload = { [field: string]: string | number | boolean } & {
  [field in PersonalDataField]?: never
}

export type AnonymousRegistry<
  Registry extends { [name: string]: AnonymousPayload | undefined },
> = Registry

type OnEvent = { eventId: string }

export type AnalyticsEvents = AnonymousRegistry<{
  email_confirmed: undefined
  terms_accepted: undefined
  basic_data_saved: { firstTime: boolean }
  onboarding_finished: undefined
  event_viewed: OnEvent
  apply_clicked: OnEvent
  rules_quiz_started: OnEvent
  rules_quiz_failed: OnEvent & { question: string }
  rules_quiz_passed: OnEvent
  application_submitted: OnEvent
  application_completed: OnEvent
  direct_application_submitted: OnEvent
  direct_application_completed: OnEvent
  cancellation_submitted: OnEvent
  cancellation_completed: OnEvent
  login_completed: undefined
  signup_completed: undefined
  signup_refused: { reason: "blocked_domain" | "rate_limited" }
  claimed_profile_signup_blocked: undefined
  payment_page_opened: { state: "needs_cpf" | "ready" | "paid" | "closed" }
  payment_method_picked: { method: PaymentMethod; installments: number }
  payment_thanks_reached: undefined
}>

export type AnalyticsEventName = keyof AnalyticsEvents
