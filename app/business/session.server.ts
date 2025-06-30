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
