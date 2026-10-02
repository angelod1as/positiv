import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateValueOf } from "../../test/validate"
import { siteLink as siteLinkType } from "./site-link"

const toPage = {
  _type: "siteLink",
  label: "Sobre",
  page: { _type: "reference", _ref: "seed-page-sobre" },
}

const toUrl = {
  _type: "siteLink",
  label: "Instagram",
  url: "https://instagram.com/positivparty",
}

describe("siteLink", () => {
  it("accepts a label and a Page", async () => {
    expect(await validateValueOf("siteLink", toPage)).toEqual([])
  })

  it("accepts a label and an https URL", async () => {
    expect(await validateValueOf("siteLink", toUrl)).toEqual([])
  })

  it("accepts a label and a relative URL", async () => {
    expect(
      await validateValueOf("siteLink", { ...toUrl, url: "/eventos" }),
    ).toEqual([])
  })

  it("requires the label", async () => {
    const errors = await validateValueOf("siteLink", {
      ...toPage,
      label: undefined,
    })

    expect(pathsOf(errors)).toContain("siteLink.label")
  })

  it("rejects a link with neither a Page nor a URL", async () => {
    expect(
      await validateValueOf("siteLink", { _type: "siteLink", label: "Sobre" }),
    ).toContainEqual({
      path: "siteLink",
      message: "Escolha uma página ou escreva um endereço",
    })
  })

  it("rejects a link with both a Page and a URL", async () => {
    expect(
      await validateValueOf("siteLink", { ...toPage, url: toUrl.url }),
    ).toContainEqual({
      path: "siteLink",
      message: "Use uma página ou um endereço, não os dois",
    })
  })

  it.each([
    ["an http link", "http://example.com"],
    ["a javascript: link", "javascript:alert(1)"],
    ["a path without the leading slash", "eventos"],
    ["a protocol-relative link", "//example.com"],
    ["a protocol-relative link with a backslash", "/\\example.com"],
    ["a protocol-relative link hidden by a tab", "/\t/example.com"],
    ["a protocol-relative link hidden by a newline", "/\n/example.com"],
    ["a path with a space", "/eventos futuros"],
  ])("rejects %s", async (_, url) => {
    const errors = await validateValueOf("siteLink", { ...toUrl, url })

    expect(pathsOf(errors)).toContain("siteLink.url")
  })

  it("previews the label with the URL", () => {
    expect(
      siteLinkType.preview?.prepare?.({
        title: "Instagram",
        url: toUrl.url,
        pageTitle: undefined,
      }),
    ).toEqual({ title: "Instagram", subtitle: toUrl.url })
  })

  it("previews the label with the Page's title", () => {
    expect(
      siteLinkType.preview?.prepare?.({
        title: "Sobre",
        url: undefined,
        pageTitle: "Sobre a Positiv",
      }),
    ).toEqual({ title: "Sobre", subtitle: "Sobre a Positiv" })
  })
})
