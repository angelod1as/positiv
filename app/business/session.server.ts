import { createCookie, createCookieSessionStorage } from "react-router"
import { env } from "~/env.server"

type RulesSessionData = {
  rulesCorrect: boolean
}

type SessionFlashData = {
  error: string
}

const { cookieSecret } = env()

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
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365, // 1 year
})
