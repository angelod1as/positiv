import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "~/types/database/database.types"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  loginUser: vi.fn(),
}))

vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: () => (
    <form data-testid="mock-schema-form">
      <input type="email" placeholder="email@exemplo.com" />
      <input type="password" placeholder="senha123" />
      <button type="submit">Entrar</button>
    </form>
  ),
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    redirect: vi.fn((path: string, options?: { headers: Headers }) => {
      const response = new Response(null, {
        status: 302,
        headers: { Location: path, ...(options?.headers ? Object.fromEntries(options.headers) : {}) },
      })
      throw response
    }),
  }
})

import * as authServer from "~/business/auth/auth.server"
import { redirect } from "react-router"
import { loader } from "./login-page"
import type { Route } from "./+types/login-page"
import LoginPage from "./login-page"

const createTestRouter = () => {
  return createMemoryRouter(
    [
      {
        path: "/entrar",
        element: <LoginPage loaderData={null} actionData={undefined} params={{}} matches={[] as never} />,
      },
      {
        path: "/registrar",
        element: <div>Register Page</div>,
      },
      {
        path: "/entrar/esqueci",
        element: <div>Forgot Password Page</div>,
      },
    ],
    {
      initialEntries: ["/entrar"],
    },
  )
}

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

    const result = await loader({ request: mockRequest, params: mockParams, context: {} })

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
      loader({ request: mockRequest, params: mockParams, context: {} })
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
      loader({ request: mockRequest, params: mockParams, context: {} })
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
      loader({ request: mockRequest, params: mockParams, context: {} })
    ).rejects.toThrow()

    expect(redirect).toHaveBeenCalledWith("/dashboard", {
      headers: mockSupabaseHeaders,
    })
  })
})

describe("Login Page Component", () => {
  it("should render login form with title and description", () => {
    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    expect(screen.getByTestId("mock-schema-form")).toBeInTheDocument()
    expect(screen.getByText("Entre na sua conta com seu e-mail")).toBeInTheDocument()
  })

  it("should display link to registration page", () => {
    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    const registerLink = screen.getByRole("link", { name: /Inscreva-se/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute("href", "/registrar")
  })

  it("should display link to forgot password page", () => {
    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    const forgotPasswordLink = screen.getByRole("link", { name: /Esqueci minha senha/i })
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink).toHaveAttribute("href", "/entrar/esqueci")
  })
})
