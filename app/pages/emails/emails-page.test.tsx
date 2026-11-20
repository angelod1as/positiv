import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/newsletter/email-preferences.server", () => ({
  findEmailPreferences: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}))

import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { findEmailPreferences } from "~/business/newsletter/email-preferences.server"
import EmailsPage, { loader } from "./emails-page"

const mockGetUserContext = vi.mocked(getUserContext)
const mockFind = vi.mocked(findEmailPreferences)

const preferences = { registrationAlerts: true, newsletter: true, marketing: true }
const TOKEN = "11111111-1111-4111-8111-111111111111"

const load = (url: string) =>
  loader({
    request: new Request(url),
    params: {},
    context: {} as never,
    url: new URL(url),
    pattern: "/emails",
  } as Parameters<typeof loader>[0])

const found = (profileId: string) =>
  ({
    success: true,
    data: { profileId, email: "a@example.com", preferences },
    errors: [],
  }) as never

describe("emails page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens for the profile behind the token, without a login", async () => {
    mockFind.mockResolvedValue(found("p-token"))

    const data = await load(`http://localhost/emails?t=${TOKEN}`)

    expect(mockFind).toHaveBeenCalledWith({ token: TOKEN })
    expect(mockGetUserContext).not.toHaveBeenCalled()
    expect(data).toEqual({ token: TOKEN, email: "a@example.com", preferences })
  })

  it("opens for the person logged in when there is no token", async () => {
    mockGetUserContext.mockResolvedValue({
      currentProfile: { id: "p-session" },
    } as never)
    mockFind.mockResolvedValue(found("p-session"))

    const data = await load("http://localhost/emails")

    expect(mockFind).toHaveBeenCalledWith({ profileId: "p-session" })
    expect(data).toEqual({ token: null, email: "a@example.com", preferences })
  })

  it("asks for a login when the token opens nothing", async () => {
    mockFind.mockResolvedValueOnce({ success: true, data: null, errors: [] } as never)
    const toLogin = new Response(null, { status: 302 })
    mockGetUserContext.mockRejectedValue(toLogin)

    await expect(load("http://localhost/emails?t=bad")).rejects.toBe(toLogin)
  })
})

describe("EmailsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderPage = (token: string | null = TOKEN) =>
    render(
      <MemoryRouter>
        <EmailsPage
          {...({
            loaderData: { token, email: "a@example.com", preferences },
          } as unknown as Parameters<typeof EmailsPage>[0])}
        />
      </MemoryRouter>,
    )

  it("is titled Seus e-mails and names the address", () => {
    renderPage()

    expect(
      screen.getByRole("heading", { name: "Seus e-mails" }),
    ).toBeInTheDocument()
    expect(screen.getByText("a@example.com")).toBeInTheDocument()
  })

  it("has no button to leave everything", () => {
    renderPage()

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Salvar",
    ])
  })

  it("saves the choices with the token and says so", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true, bounced: false }))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Suas escolhas foram salvas."),
    )
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("/api/emails")
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      token: TOKEN,
      answers: preferences,
    })
  })

  it("asks for a new address when it bounced", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true, bounced: true }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(
      await screen.findByText(/Não conseguimos entregar e-mails/),
    ).toBeInTheDocument()
  })
})
