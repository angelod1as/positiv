import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import { HomePageNextEventsSkeleton } from "./next-events-skeleton"

const content = {
  title: "Agenda do editor",
  subtitle: "Subtítulo do editor.",
  count: 3,
}

describe("HomePageNextEventsSkeleton", () => {
  it("renders the Editor's section title and subtitle while events load", () => {
    renderWithRouter(<HomePageNextEventsSkeleton content={content} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Agenda do editor" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Subtítulo do editor.")).toBeInTheDocument()
    expect(screen.getByTestId("homepage-next-events-skeleton")).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })
})
