import { createRoutesStub } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import AdminGuard from "./admin"
import PrivateGuard from "./private"

// Umami's Block Selector is `[data-umami-block]`: a visitor who starts on the
// public site and signs in is still being recorded, and everything behind a
// guard must come out of the replay blank.
describe.each([
  ["the private area", PrivateGuard],
  ["the admin area", AdminGuard],
])("the guard for %s", (_, Guard) => {
  it("keeps every page behind it out of session recordings", async () => {
    const Stub = createRoutesStub([
      {
        Component: Guard,
        children: [{ path: "/", Component: () => <p>Behind the guard</p> }],
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    const page = await screen.findByText("Behind the guard")
    expect(page.closest("[data-umami-block]")).not.toBeNull()
  })
})
