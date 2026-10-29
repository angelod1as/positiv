export type EmailMedium = "transactional" | "newsletter"

/**
 * A link to the site, tagged so Umami attributes the visit to the e-mail it
 * came from. Appends to the string rather than parsing it, so a url the caller
 * has not vouched for still reaches whatever check the template makes on it.
 */
export const emailLink = (
  url: string,
  { medium, campaign }: { medium: EmailMedium; campaign: string },
) => {
  const utm = new URLSearchParams({
    utm_source: "email",
    utm_medium: medium,
    utm_campaign: campaign,
  })
  return `${url}${url.includes("?") ? "&" : "?"}${utm}`
}
