import { describe, expect, it } from "vitest"
import type { PageContent } from "~/business/cms/content.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { HomepageHero } from "./homepage-hero"

const hero: PageContent["hero"] = {
  title: "título do editor",
  subtitle: [
    {
      _type: "block",
      _key: "b0",
      style: "normal",
      markDefs: [],
      children: [
        { _type: "span", _key: "s0", text: "para quem busca ", marks: [] },
        { _type: "span", _key: "s1", text: "algo novo", marks: ["strong"] },
      ],
    },
  ],
}

describe("HomepageHero", () => {
  it("renders the Editor's title as the page heading", () => {
    renderWithRouter(<HomepageHero content={hero} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "título do editor" }),
    ).toBeInTheDocument()
  })

  it("renders the Editor's rich-text subtitle inline", () => {
    const { container } = renderWithRouter(<HomepageHero content={hero} />)

    const subtitle = container.querySelector("h1 + p")
    expect(subtitle).toHaveTextContent("para quem busca algo novo")
    expect(subtitle?.querySelector("strong")).toHaveTextContent("algo novo")
    expect(subtitle?.querySelector("p")).toBeNull()
  })
})
