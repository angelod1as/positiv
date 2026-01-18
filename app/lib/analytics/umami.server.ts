type EventData = Record<string, unknown>

interface UmamiPayload {
  type: "event"
  payload: {
    website: string
    hostname: string
    url: string
    name: string
    language: string
    screen: string
    title: string
    data?: EventData
  }
}

export async function trackServerEvent(
  eventName: string,
  data?: EventData,
  url = "/"
): Promise<void> {
  const websiteId = process.env.VITE_UMAMI_WEBSITE_ID
  const umamiUrl = process.env.VITE_UMAMI_URL

  if (!websiteId || !umamiUrl) {
    return
  }

  const payload: UmamiPayload = {
    type: "event",
    payload: {
      website: websiteId,
      hostname: "positivparty.com",
      url,
      name: eventName,
      language: "pt-BR",
      screen: "1920x1080",
      title: "Positiv",
      data,
    },
  }

  try {
    await fetch(`${umamiUrl}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://positivparty.com",
        Referer: "https://positivparty.com/",
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silently fail - analytics should never break the app
  }
}
