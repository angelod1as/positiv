import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateDocumentOf } from "../../test/validate"
import { siteSettings as siteSettingsType } from "./site-settings"

const development = {
  developedBy: paragraphs("Desenvolvido por Angelo Dias."),
  repositoryUrl: "https://github.com/angelod1as/positiv",
  bugReportUrl: "https://forms.gle/ys6W6W54YTcoBHrJA",
}

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
  development,
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

  it("no longer requires the deprecated Desenvolvimento group", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: { ...footer, development: undefined },
    })

    expect(
      pathsOf(errors).filter((path) => path.startsWith("footer.development")),
    ).toEqual([])
  })

  it("marks the Desenvolvimento group deprecated", () => {
    const footerField = siteSettingsType.fields.find(
      (field) => field.name === "footer",
    ) as { fields?: { name: string; deprecated?: { reason: string } }[] }

    expect(
      footerField.fields?.find((field) => field.name === "development")
        ?.deprecated?.reason,
    ).toBeTruthy()
  })

  it("keeps the developed by text short", async () => {
    const errors = await validate({
      ...siteSettings,
      footer: {
        ...footer,
        development: { ...development, developedBy: image },
      },
    })

    expect(pathsOf(errors)).toContain("footer.development.developedBy.i1")
  })

  it.each(["repositoryUrl", "bugReportUrl"])(
    "rejects a Desenvolvimento %s that is not https or relative",
    async (field) => {
      const errors = await validate({
        ...siteSettings,
        footer: {
          ...footer,
          development: { ...development, [field]: "http://example.com" },
        },
      })

      expect(pathsOf(errors)).toContain(`footer.development.${field}`)
    },
  )

  it("titles the preview Configurações do site", () => {
    expect(siteSettingsType.preview?.prepare?.()).toEqual({
      title: "Configurações do site",
    })
  })
})
