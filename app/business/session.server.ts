import {
  createCookie,
  createCookieSessionStorage,
  type Session,
} from "react-router"
import { ENV } from "varlock/env"

type RulesSessionData = {
  /**
   * The events whose quiz this browser has passed. A single flag used to stand
   * here, and passing one event's quiz opened every other event's application
   * for as long as the cookie lived.
   */
  rulesCorrect: string[]
}

type SessionFlashData = {
  error: string
}

const { COOKIE_SECRET: cookieSecret } = ENV

export const rulesSessionStorage = createCookieSessionStorage<
  RulesSessionData,
  SessionFlashData
>({
  cookie: {
    name: "__session_rules",
    httpOnly: true,
    maxAge: 60 * 30, // 30 minutes
    path: "/",
    sameSite: "lax",
    secure: true,
    secrets: [cookieSecret || ""],
  },
})

export type RulesSession = Session<RulesSessionData, SessionFlashData>

/**
 * Both the form's loader and its submit ask this, and they have to agree: a
 * guard that only ran on the way in is the hole this pair was written to close.
 */
export function hasPassedRulesQuiz(
  session: RulesSession,
  eventId: string,
): boolean {
  return (session.get("rulesCorrect") ?? []).includes(eventId)
}

export const newsCookie = createCookie("show-news", {
  maxAge: 34560000, // max value
})

export const newsletterPreferenceCookie = createCookie("newsletter-preference", {
  httpOnly: true,
  sameSite: "lax",
  secure: ENV.APP_ENV === "production",
})
