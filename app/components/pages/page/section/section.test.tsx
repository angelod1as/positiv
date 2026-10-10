import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { OverlayProvider } from "../overlay/overlay-provider"
import { Section } from "./section"

describe("Section", () => {
  it("is a whole-section edit target in draft mode", () => {
    render(
      <OverlayProvider pageId="page-1" studioUrl="https://positiv.sanity.studio">
        <Section>
          <p>conteúdo</p>
        </Section>
      </OverlayProvider>,
    )

    expect(screen.getByText("conteúdo").closest("section")).toHaveAttribute(
      "data-sanity-edit-target",
    )
  })

  it("is a plain section outside draft mode", () => {
    render(
      <Section>
        <p>conteúdo</p>
      </Section>,
    )

    expect(screen.getByText("conteúdo").closest("section")).not.toHaveAttribute(
      "data-sanity-edit-target",
    )
  })
})
