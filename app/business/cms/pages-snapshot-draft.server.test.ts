import { describe, expect, it } from "vitest"
import { headers, page, paragraph, sections } from "~/test/page-documents"
import { resolvePagesSnapshot } from "./pages-snapshot.server"

const config = { projectId: "8ojkallk", dataset: "development" }

const draft = (documents: unknown[]) =>
  resolvePagesSnapshot(documents, config, "draft")

const published = (documents: unknown[]) =>
  resolvePagesSnapshot(documents, config)

describe("resolvePagesSnapshot in draft mode", () => {
  it("renders a placeholder for an invalid Section and keeps the valid ones", async () => {
    const broken = { _type: "about", _key: "broken-about" }
    const snapshot = await draft([
      page({ sections: [broken, sections.feedback] }),
    ])
    const resolved = snapshot.get("/sobre")

    expect(resolved?.sections.map(({ _type }) => _type)).toEqual([
      "placeholder",
      "feedback",
    ])
    const placeholder = resolved?.sections[0]
    expect(placeholder).toMatchObject({
      _type: "placeholder",
      _key: "broken-about",
    })
    expect(
      placeholder?._type === "placeholder" ? placeholder.missing : [],
    ).toContain("title")
  })

  it("reports a nested Section failure by its top-level field", async () => {
    const brokenCards = {
      _type: "about",
      _key: "nested-about",
      title: "Como assim?",
      cards: [
        { _key: "c0", title: "ok", body: paragraph("texto") },
        { _key: "c1", title: "ok", body: paragraph("texto") },
        { _key: "c2" },
      ],
    }
    const snapshot = await draft([page({ sections: [brokenCards] })])
    const placeholder = snapshot.get("/sobre")?.sections[0]

    expect(placeholder?._type).toBe("placeholder")
    expect(placeholder?._type === "placeholder" ? placeholder.missing : []).toEqual(
      ["cards"],
    )
  })

  it("renders a placeholder for an invalid Page Header", async () => {
    const snapshot = await draft([
      page({ header: [{ _type: "pageHero", _key: "header" }] }),
    ])
    const header = snapshot.get("/sobre")?.header

    expect(header).toMatchObject({ _type: "placeholder" })
    expect(header?._type === "placeholder" ? header.missing : []).toContain(
      "title",
    )
  })

  it("renders a placeholder when the Page has no Page Header at all", async () => {
    const snapshot = await draft([page({ header: [] })])
    const header = snapshot.get("/sobre")?.header

    expect(header).toMatchObject({ _type: "placeholder" })
  })

  it("resolves a fully valid draft Page just like the published path", async () => {
    const snapshot = await draft([
      page({ header: [headers.pageHero], sections: [sections.about] }),
    ])
    const resolved = snapshot.get("/sobre")

    expect(resolved?.header._type).toBe("pageHero")
    expect(resolved?.sections.map(({ _type }) => _type)).toEqual(["about"])
  })

  it("still rejects that same Page on the published path", async () => {
    const broken = { _type: "about", _key: "broken-about" }

    expect(() =>
      published([page({ sections: [broken, sections.feedback] })]),
    ).toThrow(/page-sobre \(\/sobre\)/)
  })

  it("drops a Page whose shell is malformed instead of failing the snapshot", async () => {
    const snapshot = await draft([
      page(),
      page({
        _id: "page-bad",
        address: "/bad",
        seo: { description: 123 },
      }),
    ])

    expect([...snapshot.keys()]).toEqual(["/sobre"])
  })
})
