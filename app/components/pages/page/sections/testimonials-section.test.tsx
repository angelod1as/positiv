import { describe, expect, it } from "vitest"
import type { PageContent } from "~/business/cms/content.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { TestimonialsSection } from "./testimonials-section"

const testimonials: PageContent["testimonials"] = {
  title: "Depoimentos do editor",
  subtitle: "Quem foi conta.",
  quotes: [
    { _key: "q0", author: "B., 25", quote: "Uma noite *inesquecível*." },
    { _key: "q1", author: "D., 51", quote: "Voltarei." },
  ],
}

describe("TestimonialsSection", () => {
  it("renders the Editor's title and subtitle", () => {
    renderWithRouter(<TestimonialsSection content={testimonials} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Depoimentos do editor" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Quem foi conta.")).toBeInTheDocument()
  })

  it("renders every quote with its author, as the Editor wrote it", () => {
    renderWithRouter(<TestimonialsSection content={testimonials} />)

    expect(screen.getByText("B., 25")).toBeInTheDocument()
    expect(screen.getByText("D., 51")).toBeInTheDocument()
    expect(screen.getByText("Uma noite *inesquecível*.").tagName).toBe("P")
    expect(screen.getByText("Voltarei.")).toBeInTheDocument()
  })
})
