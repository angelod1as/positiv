import { useEffect, useState } from "react"
import type { ProfileWithRoles } from "~types/database/entities.types"

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null
  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=")
    if (cookieName === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  return null
}

function parseNewsletterCookie(): {
  checked?: boolean
  shouldShow?: boolean
} | null {
  const cookieValue = getCookieValue("newsletter-preference")
  if (!cookieValue) return null

  try {
    return JSON.parse(cookieValue)
  } catch {
    return null
  }
}

export function useNewsletterStatus(
  profile: ProfileWithRoles | null | undefined,
): boolean {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!profile) {
      setShouldShow(false)
      return
    }

    const cookie = parseNewsletterCookie()

    if (cookie?.checked === true) {
      setShouldShow(cookie.shouldShow === true)
      return
    }

    fetch(`/api/newsletter-status?profileId=${profile.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch newsletter status")
        }
        return res.json()
      })
      .then((data: { shouldShow: boolean }) => {
        setShouldShow(data.shouldShow)
      })
      .catch((error) => {
        console.error("Error fetching newsletter status:", error)
        setShouldShow(false)
      })
  }, [profile?.id])

  return shouldShow
}
