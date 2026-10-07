import { describe, expect, it } from "vitest"
import type { HomepageContent } from "~/business/cms/content.schema"
import { homepageCopy } from "~/copy/homepage"
import routes from "~/lib/paths"
import { renderWithRouter, screen } from "~/test/test-utils"
import { HomePageCtaBanner } from "./home-page-cta-banner"

const ctaBanner: HomepageContent["ctaBanner"] = {
  title: "Chamada do editor",
  body: [
    {
      _type: "block",
      _key: "b0",
      style: "normal",
      markDefs: [],
      children: [
        { _type: "span", _key: "s0", text: "Venha para a ", marks: [] },
        { _type: "span", _key: "s1", text: "próxima", marks: ["strong"] },
      ],
    },
  ],
}

describe("HomePageCtaBanner", () => {
  it("renders the Editor's title and inline rich-text body", () => {
    renderWithRouter(
      <HomePageCtaBanner content={ctaBanner} isLoggedIn={false} />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Chamada do editor" }),
    ).toBeInTheDocument()
    const emphasis = screen.getByText("próxima")
    expect(emphasis.tagName).toBe("STRONG")
    expect(emphasis.parentElement?.tagName).toBe("P")
    expect(emphasis.parentElement).toHaveTextContent("Venha para a próxima")
  })

  it("sends a visitor to the login page", () => {
    renderWithRouter(
      <HomePageCtaBanner content={ctaBanner} isLoggedIn={false} />,
    )

    expect(
      screen.getByRole("link", { name: homepageCopy.ctaBanner.loggedOutCta }),
    ).toHaveAttribute("href", routes.auth.LOGIN)
  })

  it("sends a logged-in participant to the dashboard", () => {
    renderWithRouter(<HomePageCtaBanner content={ctaBanner} isLoggedIn />)

    expect(
      screen.getByRole("link", { name: homepageCopy.ctaBanner.loggedInCta }),
    ).toHaveAttribute("href", routes.dash.DASHBOARD)
  })
})
