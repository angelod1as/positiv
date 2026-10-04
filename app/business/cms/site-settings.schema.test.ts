import { describe, expect, it } from "vitest"
import { paragraph } from "~/test/page-documents"
import {
  linkToPage,
  linkToUrl,
  siteSettingsDocument,
} from "~/test/site-settings-documents"
import { siteSettingsSchema } from "./site-settings.schema"

const parse = (value: unknown) => siteSettingsSchema.safeParse(value)

const rejects = (value: unknown) => expect(parse(value).success).toBe(false)

describe("siteSettingsSchema", () => {
  describe("links", () => {
    it("resolves a link to a Page to the Page's address", () => {
      const result = siteSettingsSchema.parse(
        siteSettingsDocument({ navigation: [linkToPage("Sobre", "/sobre")] }),
      )

      expect(result.navigation).toEqual([
        { _key: "sobre", label: "Sobre", href: "/sobre" },
      ])
    })

    it("resolves a link to an address to that address", () => {
      const result = siteSettingsSchema.parse(
        siteSettingsDocument({
          navigation: [linkToUrl("Instagram", "https://instagram.com/x")],
        }),
      )

      expect(result.navigation).toEqual([
        {
          _key: "instagram",
          label: "Instagram",
          href: "https://instagram.com/x",
        },
      ])
    })

    it("resolves the links in the footer columns", () => {
      const result = siteSettingsSchema.parse(siteSettingsDocument())

      expect(result.footer.columns[0].links).toEqual([
        { _key: "início", label: "Início", href: "/" },
      ])
    })

    it.each([
      ["neither a Page nor an address", { page: null, url: null }],
      ["both a Page and an address", { page: { address: "/a" }, url: "/b" }],
      ["a Page reference that did not resolve", { page: null, url: undefined }],
      [
        "an address that is neither relative nor https",
        { url: "http://x.com" },
      ],
      ["a protocol-relative address", { url: "//evil.com" }],
    ])("rejects a link with %s", (_, target) => {
      rejects(
        siteSettingsDocument({
          navigation: [{ ...linkToUrl("Link", "/a"), ...target }],
        }),
      )
    })

    it("rejects a link without a label", () => {
      rejects(
        siteSettingsDocument({
          navigation: [{ ...linkToUrl("Link", "/a"), label: null }],
        }),
      )
    })
  })

  describe("navigation", () => {
    it("is empty when the Editors left it out", () => {
      expect(
        siteSettingsSchema.parse(siteSettingsDocument({ navigation: null }))
          .navigation,
      ).toEqual([])
    })
  })

  describe("footer", () => {
    it("is required", () => {
      rejects(siteSettingsDocument({ footer: null }))
    })

    it("has no columns or social links when the Editors left them out", () => {
      const { footer } = siteSettingsSchema.parse(
        siteSettingsDocument({}, { columns: null, social: null }),
      )

      expect(footer.columns).toEqual([])
      expect(footer.social).toEqual([])
    })

    it("keeps the text", () => {
      const { footer } = siteSettingsSchema.parse(siteSettingsDocument())

      expect(footer.text).toEqual(
        paragraph("© 2025 Positiv. Todos os direitos reservados."),
      )
    })

    it("ignores the deprecated Desenvolvimento group", () => {
      const { footer } = siteSettingsSchema.parse(
        siteSettingsDocument(
          {},
          {
            development: {
              developedBy: paragraph("x"),
              repositoryUrl: null,
              bugReportUrl: "not a url",
            },
          },
        ),
      )

      expect(footer).not.toHaveProperty("development")
    })

    it.each([
      [
        "a column without a title",
        {
          columns: [{ _key: "c", title: null, links: [linkToUrl("A", "/a")] }],
        },
      ],
      [
        "a column without links",
        { columns: [{ _key: "c", title: "C", links: [] }] },
      ],
      [
        "an unknown social network",
        { social: [{ _key: "x", network: "x", url: "https://x.com" }] },
      ],
      [
        "a social link that is not https",
        {
          social: [
            { _key: "i", network: "instagram", url: "http://instagram.com" },
          ],
        },
      ],
      ["no text", { text: null }],
      [
        "text with a heading",
        { text: [{ ...paragraph("Oi")[0], style: "h2" }] },
      ],
    ])("rejects %s", (_, footer) => {
      rejects(siteSettingsDocument({}, footer))
    })
  })
})
