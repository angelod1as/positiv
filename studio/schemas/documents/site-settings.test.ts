import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateDocumentOf } from "../../test/validate"
import { siteSettings as siteSettingsType } from "./site-settings"

const footer = {
  columns: [
    {
      _type: "footerColumn",
      _key: "positiv",
      title: "A Positiv",
      links: [
        {
          _type: "siteLink",
          _key: "sobre",
          label: "Sobre",
          page: { _type: "reference", _ref: "seed-page-sobre" },
        },
      ],
    },
  ],
  social: [
    {
      _type: "socialLink",
      _key: "instagram",
      network: "instagram",
      url: "https://instagram.com/positivparty",
    },
  ],
  text: paragraphs("© 2025 Positiv. Todos os direitos reservados."),
}

const siteSettings = {
  navigation: [
    {
      _type: "siteLink",
      _key: "eventos",
      label: "Eventos",
      url: "/eventos",
    },
  ],
  footer,
  notice: paragraphs("Inscrições abertas para o próximo evento."),
}

const image = [
  {
    _type: "image",
    _key: "i1",
    asset: { _type: "reference", _ref: "image-abc-1x1-jpg" },
  },
]

function validate(fields: Record<string, unknown>) {
  return validateDocumentOf("siteSettings", fields)
}

describe("siteSettings", () => {
  it("accepts a Navigation, a full footer and a Notice", async () => {
    expect(await validate(siteSettings)).toEqual([])
  })

  it("accepts no Navigation and no Notice", async () => {
    expect(
      await validate({ ...siteSettings, navigation: [], notice: undefined }),
    ).toEqual([])
  })

  it("requires the footer", async () => {
    expect(
      pathsOf(await validate({ ...siteSettings, footer: undefined })),
    ).toContain("footer")
  })

  it("checks every Navigation link has one target", async () => {
    const errors = await validate({
      ...siteSettings,
      navigation: [{ _type: "siteLink", _key: "empty", label: "Sobre" }],
    })

    expect(pathsOf(errors)).toContain("navigation.empty")
  })

  it("requires the footer text", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: { ...footer, text: undefined },
    })

    expect(pathsOf(errors)).toContain("footer.text")
  })

  it("keeps the footer text short", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: { ...footer, text: image },
    })

    expect(pathsOf(errors)).toContain("footer.text.i1")
  })

  it("keeps the Notice short", async () => {
    const errors = await validate({ ...siteSettings, notice: image })

    expect(pathsOf(errors)).toContain("notice.i1")
  })

  it("requires a title and a link in every footer column", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: {
        ...footer,
        columns: [{ _type: "footerColumn", _key: "empty", links: [] }],
      },
    })

    expect(pathsOf(errors)).toEqual(
      expect.arrayContaining([
        "footer.columns.empty.title",
        "footer.columns.empty.links",
      ]),
    )
  })

  it("checks every footer column link has one target", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: {
        ...footer,
        columns: [
          {
            ...footer.columns[0],
            links: [{ _type: "siteLink", _key: "empty", label: "Sobre" }],
          },
        ],
      },
    })

    expect(pathsOf(errors)).toContain("footer.columns.positiv.links.empty")
  })

  it("requires the network and the URL of a social link", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: {
        ...footer,
        social: [{ _type: "socialLink", _key: "empty" }],
      },
    })

    expect(pathsOf(errors)).toEqual(
      expect.arrayContaining([
        "footer.social.empty.network",
        "footer.social.empty.url",
      ]),
    )
  })

  it("rejects a social link that is not https or relative", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: {
        ...footer,
        social: [{ ...footer.social[0], url: "//instagram.com/positivparty" }],
      },
    })

    expect(pathsOf(errors)).toContain("footer.social.instagram.url")
  })

  it("titles the preview Configurações do site", () => {
    expect(siteSettingsType.preview?.prepare?.()).toEqual({
      title: "Configurações do site",
    })
  })
})
