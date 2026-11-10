import { createCookie } from "react-router"
import { ENV } from "varlock/env"

export const newsletterPreferenceCookie = createCookie("newsletter-preference", {
  httpOnly: true,
  sameSite: "lax",
  secure: ENV.APP_ENV === "production",
})
