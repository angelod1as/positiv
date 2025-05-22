import { createCookieSessionStorage } from "react-router"

type SessionData = {
  rulesCorrect: boolean
}

type SessionFlashData = {
  error: string
}

// TODO: understand this better and change the settings
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      // all of these are optional
      // domain: "reactrouter.com",
      httpOnly: true,
      maxAge: 60,
      path: "/",
      sameSite: "lax",
      secrets: ["s3cret1"],
      secure: true,
    },
  })

export { commitSession, destroySession, getSession }
