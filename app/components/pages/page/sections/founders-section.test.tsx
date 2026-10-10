import { describe, expect, it } from "vitest"
import type {
  PageContent,
  PortableText,
} from "~/business/cms/content.schema"
import { homepageCopy } from "~/copy/homepage"
import { pageContentFixture } from "~/test/page-content-fixture"
import { renderWithRouter, screen } from "~/test/test-utils"
import { OverlayProvider } from "../overlay/overlay-provider"
import { FoundersSection } from "./founders-section"

const paragraph = (key: string, text: string): PortableText[number] => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}s0`, text, marks: [] }],
})

const founders: PageContent["founders"] = {
  ...pageContentFixture.founders,
  title: "Quem organiza",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  videoTitle: "Vídeo das pessoas fundadoras",
  people: [
    {
      _id: "person-bia",
      name: "Bia Souza",
      pronouns: "ela/dela",
      instagram: "bia.souza",
      bio: [paragraph("b0", "Primeiro parágrafo."), paragraph("b1", "Segundo.")],
      photo: {
        url: "https://cdn.sanity.io/images/p/d/bia.jpg?w=320&h=320",
        alt: "Bia sorrindo",
        width: 320,
        height: 320,
      },
    },
    {
      _id: "person-caio",
      name: "Caio Lima",
      pronouns: "ele/dele",
      instagram: "caio.lima",
      bio: [paragraph("b0", "Bio do Caio.")],
      photo: {
        url: "https://cdn.sanity.io/images/p/d/caio.jpg?w=320&h=320",
        alt: "Caio de chapéu",
        width: 320,
        height: 320,
      },
    },
  ],
}

describe("FoundersSection", () => {
  it("renders the Editor's title and every founder's name and pronouns", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Quem organiza" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Bia Souza" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Caio Lima" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(homepageCopy.founders.pronounsLabel("ele/dele")),
    ).toBeInTheDocument()
  })

  it("renders each founder's photo from the content", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    const photo = screen.getByRole("img", { name: "Bia sorrindo" })
    expect(photo).toHaveAttribute(
      "src",
      "https://cdn.sanity.io/images/p/d/bia.jpg?w=320&h=320",
    )
    expect(photo).toHaveAttribute("width", "320")
    expect(photo).toHaveAttribute("height", "320")
  })

  it("renders each founder's bio as paragraphs", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    expect(screen.getByText("Primeiro parágrafo.").tagName).toBe("P")
    expect(screen.getByText("Segundo.").tagName).toBe("P")
  })

  it("links each founder's Instagram", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    const links = screen.getAllByRole("link", {
      name: homepageCopy.founders.instagramIconAlt,
    })
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://instagram.com/bia.souza",
      "https://instagram.com/caio.lima",
    ])
  })

  it("embeds the Editor's YouTube video with its title", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    expect(screen.getByTitle("Vídeo das pessoas fundadoras")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    )
  })

  it("leaves the video out when the link is not a YouTube video", () => {
    renderWithRouter(
      <FoundersSection
        content={{ ...founders, videoUrl: "https://vimeo.com/123456" }}
      />,
    )

    expect(
      screen.queryByTitle("Vídeo das pessoas fundadoras"),
    ).not.toBeInTheDocument()
  })

  it("marks each founder's photo and Instagram button for click-to-edit in draft mode", () => {
    renderWithRouter(
      <OverlayProvider pageId="page-1" studioUrl="https://positiv.sanity.studio">
        <FoundersSection content={founders} />
      </OverlayProvider>,
    )

    const photoAttr = screen
      .getByRole("img", { name: "Bia sorrindo" })
      .getAttribute("data-sanity")
    expect(photoAttr).toContain("id=person-bia")
    expect(photoAttr).toContain("type=person")
    expect(photoAttr).toContain("path=photo")

    const instagramAttr = screen
      .getAllByRole("link", { name: homepageCopy.founders.instagramIconAlt })[0]
      .getAttribute("data-sanity")
    expect(instagramAttr).toContain("id=person-bia")
    expect(instagramAttr).toContain("path=instagram")
  })

  it("leaves the founder photo unmarked outside draft mode", () => {
    renderWithRouter(<FoundersSection content={founders} />)

    expect(
      screen.getByRole("img", { name: "Bia sorrindo" }),
    ).not.toHaveAttribute("data-sanity")
  })
})
