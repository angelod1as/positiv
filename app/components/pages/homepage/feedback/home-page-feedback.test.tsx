import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { HomepageContent } from "~/business/cms/content.schema"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

import { HomePageFeedback } from "./home-page-feedback"

const feedback: HomepageContent["feedback"] = {
  title: "Conte pra gente",
  body: [
    {
      _type: "block",
      _key: "b0",
      style: "normal",
      markDefs: [],
      children: [
        { _type: "span", _key: "s0", text: "Sua opinião ", marks: [] },
        { _type: "span", _key: "s1", text: "importa", marks: ["em"] },
      ],
    },
  ],
  ctaLabel: "Mandar opinião",
}

describe("HomePageFeedback", () => {
  it("should render the section title", () => {
    render(<HomePageFeedback content={feedback} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Conte pra gente" }),
    ).toBeInTheDocument()
  })

  it("should render the description text inline", () => {
    render(<HomePageFeedback content={feedback} />)

    const emphasis = screen.getByText("importa")
    expect(emphasis.tagName).toBe("EM")
    expect(emphasis.parentElement?.tagName).toBe("P")
    expect(emphasis.parentElement).toHaveTextContent("Sua opinião importa")
  })

  it("should render a link button to the feedback page", () => {
    render(<HomePageFeedback content={feedback} />)

    const link = screen.getByRole("link", { name: "Mandar opinião" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/feedback")
  })
})
