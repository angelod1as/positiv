import { describe, expect, it } from "vitest"
import type {
  HomepageContent,
  PortableText,
} from "~/business/cms/homepage-content.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { HomePageAbout } from "./about"

const paragraph = (key: string, text: string): PortableText[number] => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}s0`, text, marks: [] }],
})

const about: HomepageContent["about"] = {
  title: "Por que vir?",
  cards: [
    { _key: "a", title: "primeiro card", body: [paragraph("b0", "texto um")] },
    {
      _key: "b",
      title: "segundo card",
      body: [paragraph("b0", "texto dois"), paragraph("b1", "mais texto")],
    },
    { _key: "c", title: "terceiro card", body: [paragraph("b0", "texto três")] },
  ],
}

describe("HomePageAbout", () => {
  it("renders the Editor's section title", () => {
    renderWithRouter(<HomePageAbout content={about} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Por que vir?" }),
    ).toBeInTheDocument()
  })

  it("renders every card with its title and rich-text body as paragraphs", () => {
    renderWithRouter(<HomePageAbout content={about} />)

    for (const title of ["primeiro card", "segundo card", "terceiro card"]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument()
    }
    expect(screen.getByText("texto dois").tagName).toBe("P")
    expect(screen.getByText("mais texto").tagName).toBe("P")
  })
})
