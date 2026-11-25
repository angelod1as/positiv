import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// These copies are pasted into Listmonk by hand, so emailLink cannot reach
// them; this keeps a new link from going out without the UTMs.
const dir = "app/components/email/listmonk"
const files = readdirSync(dir).filter(
  (file) => file.endsWith(".html") || file === "SNIPPETS.md",
)

describe("Listmonk templates", () => {
  it.each(files)("%s tags every link to the site with the e-mail UTMs", (file) => {
    const html = readFileSync(`${dir}/${file}`, "utf8")
    const siteLinks = [
      ...html.matchAll(/href="(https:\/\/www\.positivparty\.com[^"]*)"/g),
    ].map(([, href]) => href)

    for (const href of siteLinks) {
      expect(href).toMatch(
        /(\?|&amp;)utm_source=email&amp;utm_medium=(newsletter|transactional)&amp;utm_campaign=[a-z-]+$/,
      )
    }
  })
})

describe("Listmonk footers", () => {
  it.each(["default.template.html", "event-opening.template.html"])(
    "%s sends the unsubscribe link to Seus e-mails with the person's token",
    (file) => {
      const html = readFileSync(`${dir}/${file}`, "utf8")

      expect(html).toContain(
        'href="https://www.positivparty.com/emails?t={{ .Subscriber.Attribs.email_token }}&amp;utm_source=email',
      )
      expect(html).not.toContain("/newsletter/unsubscribe")
      expect(html).not.toContain("UnsubscribeURL")
    },
  )
})
