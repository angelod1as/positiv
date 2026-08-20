import type { SupabaseClient } from "@supabase/supabase-js"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "~/types/database/database.types"

const navigate = vi.fn()

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  )
  return {
    ...actual,
    useNavigate: () => navigate,
    redirect: vi.fn((path: string, options?: { headers: Headers }) => {
      const headers = new Headers(options?.headers)
      headers.set("Location", path)
      const response = new Response(null, {
        status: 302,
        headers,
      })
      throw response
    }),
  }
})

import { redirect } from "react-router"
import { toast } from "sonner"
import * as authServer from "~/business/auth/auth.server"
import type { Route } from "./+types/login-page"
import LoginPage, { loader } from "./login-page"

type PageProps = Parameters<typeof LoginPage>[0]

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/entrar"]}>
      <LoginPage {...({} as PageProps)} />
    </MemoryRouter>,
  )

const answer = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("E-mail"), "pessoa@exemplo.com")
  await user.type(screen.getByLabelText("Senha"), "segredo123")
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Entrar" }))

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

describe("Login Page Loader", () => {
  const mockRequest = new Request("http://localhost:3000/entrar")
  const mockParams = {} as Route.LoaderArgs["params"]
  const mockSupabaseHeaders = new Headers()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return null when user is not logged in", async () => {
    vi.mocked(authServer.getContext).mockResolvedValue({
      currentUser: null,
      currentProfile: null,
      supabase: {} as SupabaseClient<Database>,
      supabaseHeaders: mockSupabaseHeaders,
      host: "localhost:3000",
      isProdInDev: false,
    })

    const result = await loader({
      request: mockRequest,
      params: mockParams,
      context: {},
    })

    expect(result).toBeNull()
  })

  it("should redirect regular user to /dashboard when already logged in", async () => {
    vi.mocked(authServer.getContext).mockResolvedValue({
      currentUser: { id: "user-123", email: "user@test.com" },
      currentProfile: {
        id: "profile-123",
        email: "user@test.com",
        full_name: "Regular User",
        basic_data_filled: true,
        is_admin: false,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        race_color: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      supabase: {} as SupabaseClient<Database>,
      supabaseHeaders: mockSupabaseHeaders,
      host: "localhost:3000",
      isProdInDev: false,
    })

    await expect(
      loader({ request: mockRequest, params: mockParams, context: {} }),
    ).rejects.toThrow()

    expect(redirect).toHaveBeenCalledWith("/dashboard", {
      headers: mockSupabaseHeaders,
    })
  })

  it("should redirect admin user to /admin when already logged in", async () => {
    vi.mocked(authServer.getContext).mockResolvedValue({
      currentUser: { id: "admin-123", email: "admin@test.com" },
      currentProfile: {
        id: "admin-profile-123",
        email: "admin@test.com",
        full_name: "Admin User",
        basic_data_filled: true,
        is_admin: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        race_color: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      supabase: {} as SupabaseClient<Database>,
      supabaseHeaders: mockSupabaseHeaders,
      host: "localhost:3000",
      isProdInDev: false,
    })

    await expect(
      loader({ request: mockRequest, params: mockParams, context: {} }),
    ).rejects.toThrow()

    expect(redirect).toHaveBeenCalledWith("/admin", {
      headers: mockSupabaseHeaders,
    })
  })

  it("should redirect user with null profile to /dashboard when logged in", async () => {
    vi.mocked(authServer.getContext).mockResolvedValue({
      currentUser: { id: "user-123", email: "user@test.com" },
      currentProfile: null,
      supabase: {} as SupabaseClient<Database>,
      supabaseHeaders: mockSupabaseHeaders,
      host: "localhost:3000",
      isProdInDev: false,
    })

    await expect(
      loader({ request: mockRequest, params: mockParams, context: {} }),
    ).rejects.toThrow()

    expect(redirect).toHaveBeenCalledWith("/dashboard", {
      headers: mockSupabaseHeaders,
    })
  })
})

describe("Login Page Component", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.mocked(toast.success).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("asks for an e-mail and a password on one screen", () => {
    renderPage()

    expect(screen.getByLabelText("E-mail")).toBeVisible()
    expect(screen.getByLabelText("Senha")).toBeVisible()
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible()
  })

  it("masks the password", () => {
    renderPage()

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password")
  })

  it("shows the way to the account someone does not have yet", () => {
    renderPage()

    expect(screen.getByRole("link", { name: /Criar conta/i })).toHaveAttribute(
      "href",
      "/registrar",
    )
    expect(
      screen.getByRole("link", { name: /Esqueci minha senha/i }),
    ).toHaveAttribute("href", "/entrar/esqueci")
  })

  it("refuses an empty form without asking the server", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true, redirectTo: "/dashboard" })
    renderPage()

    await submit(user)

    expect(await screen.findAllByText("Campo obrigatório")).toHaveLength(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the answers to the sign-in", async () => {
    const user = userEvent.setup()
    const fetch = answers({ ok: true, redirectTo: "/dashboard" })
    renderPage()

    await answer(user)
    await submit(user)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/auth/login")
    expect(JSON.parse(String(init.body))).toEqual({
      email: "pessoa@exemplo.com",
      password: "segredo123",
    })
  })

  it("goes where the sign-in says, with a welcome", async () => {
    const user = userEvent.setup()
    answers({ ok: true, redirectTo: "/admin" })
    renderPage()

    await answer(user)
    await submit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin"))
    expect(toast.success).toHaveBeenCalledWith(
      "Bem vinde!",
      expect.objectContaining({
        description: expect.stringContaining("desenvolvimento"),
      }),
    )
  })

  it("says the credentials were refused, and stays put", async () => {
    const user = userEvent.setup()
    answers(
      { ok: false, errors: [], message: "Credenciais inválidas" },
      { status: 422 },
    )
    renderPage()

    await answer(user)
    await submit(user)

    expect(await screen.findByText("Credenciais inválidas")).toBeVisible()
    expect(navigate).not.toHaveBeenCalled()
  })
})
