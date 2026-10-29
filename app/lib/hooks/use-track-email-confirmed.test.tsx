import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router"
import { render, screen, waitFor } from "~/test/test-utils"
import {
  EMAIL_CONFIRMED_PARAM,
  useTrackEmailConfirmed,
} from "./use-track-email-confirmed"

function Landing() {
  useTrackEmailConfirmed()
  const location = useLocation()

  return <p data-testid="search">{location.search}</p>
}

function renderAt(url: string) {
  const router = createMemoryRouter([{ path: "/", element: <Landing /> }], {
    initialEntries: [url],
  })
  return render(<RouterProvider router={router} />)
}

describe("useTrackEmailConfirmed", () => {
  const umamiTrack = vi.fn()

  beforeEach(() => {
    umamiTrack.mockClear()
    window.umami = { track: umamiTrack }
  })

  afterEach(() => {
    delete window.umami
  })

  it("sends email_confirmed when the confirmation link lands here", async () => {
    renderAt(`/?${EMAIL_CONFIRMED_PARAM}=1`)

    await waitFor(() =>
      expect(umamiTrack).toHaveBeenCalledWith("email_confirmed", undefined),
    )
    expect(umamiTrack).toHaveBeenCalledTimes(1)
  })

  it("drops the flag from the url and keeps the rest", async () => {
    renderAt(`/?utm_source=email&${EMAIL_CONFIRMED_PARAM}=1`)

    await waitFor(() =>
      expect(screen.getByTestId("search")).toHaveTextContent(
        /^\?utm_source=email$/,
      ),
    )
  })

  it("sends nothing on an ordinary visit", async () => {
    renderAt("/?utm_source=email")

    await screen.findByTestId("search")
    expect(umamiTrack).not.toHaveBeenCalled()
  })
})
