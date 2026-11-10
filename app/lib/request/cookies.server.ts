import { createCookie } from "react-router"

export const newsCookie = createCookie("show-news", {
  maxAge: 34560000, // max value
})
