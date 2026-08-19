import { createCookie, createCookieSessionStorage } from "react-router"
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

export const newsCookie = createCookie("show-news", {
  maxAge: 34560000, // max value
})

export const newsletterPreferenceCookie = createCookie("newsletter-preference", {
  httpOnly: true,
  sameSite: "lax",
  secure: ENV.APP_ENV === "production",
})
