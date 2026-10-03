import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { ImageSection } from "./image-section"

const content = {
  _type: "imageSection" as const,
  _key: "image",
  image: {
    url: "https://cdn.sanity.io/images/test/development/abc-1000x184.png?w=1000&fit=max&auto=format",
    alt: "Imagem de exemplo",
    width: 1000,
    height: 184,
  },
  caption: "Uma legenda de exemplo",
}

describe("ImageSection", () => {
  it("renders the image at its size, with its alt text", () => {
    render(<ImageSection content={content} />)

    const image = screen.getByRole("img", { name: "Imagem de exemplo" })
    expect(image).toHaveAttribute("src", content.image.url)
    expect(image).toHaveAttribute("width", "1000")
    expect(image).toHaveAttribute("height", "184")
  })

  it("captions the image with the Editor's caption", () => {
    render(<ImageSection content={content} />)

    const caption = screen.getByText("Uma legenda de exemplo")
    expect(caption.tagName).toBe("FIGCAPTION")
    expect(screen.getByRole("figure")).toContainElement(caption)
  })

  it("renders no caption when the Editor left it empty", () => {
    const { container } = render(
      <ImageSection content={{ ...content, caption: null }} />,
    )

    expect(container.querySelector("figcaption")).toBeNull()
  })
})
