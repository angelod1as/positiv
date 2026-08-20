import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BasicDataPage from "./basic-data-page"

const navigate = vi.hoisted(() => vi.fn())
const success = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock("sonner", () => ({ toast: { success } }))

const filledProfile = {
  id: "profile-1",
  is_admin: false,
  basic_data_filled: true,
  full_name: "Maria Silva",
  social_name: "Mari",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Uma amiga",
  phone: 11999999999,
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
}

type LoaderData = {
  profile: unknown
  orphanedProfile: unknown
}

// The page reads one prop of the many a route component is handed, and a test
// that built the rest would be describing React Router, not this page.
const Page = BasicDataPage as unknown as (props: {
  loaderData: LoaderData
}) => React.ReactNode

const draw = (loaderData: LoaderData) => render(<Page loaderData={loaderData} />)

describe("BasicDataPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) }),
    )
  })

  describe("the text above the form", () => {
    it("greets someone whose old profile was found", () => {
      draw({ profile: null, orphanedProfile: filledProfile })

      expect(
        screen.getByText(/Encontramos seu perfil anterior/),
      ).toBeInTheDocument()
    })

    it("tells someone who already filled this in that they are updating", () => {
      draw({ profile: filledProfile, orphanedProfile: null })

      expect(screen.getByText("Atualize seus dados")).toBeInTheDocument()
    })

    it("explains why the data is needed the first time round", () => {
      draw({
        profile: { ...filledProfile, basic_data_filled: false },
        orphanedProfile: null,
      })

      expect(
        screen.getByText(/Precisamos destes dados básicos/),
      ).toBeInTheDocument()
    })
  })

  describe("what the form opens holding", () => {
    it("fills the fields from the profile", () => {
      draw({ profile: filledProfile, orphanedProfile: null })

      expect(screen.getByLabelText("Nome completo")).toHaveValue("Maria Silva")
      expect(screen.getByLabelText("CPF")).toHaveValue("12345678901")
    })

    it("prefers a profile left behind under the same e-mail", () => {
      draw({
        profile: { ...filledProfile, full_name: "Conta nova" },
        orphanedProfile: { ...filledProfile, full_name: "Cadastro antigo" },
      })

      expect(screen.getByLabelText("Nome completo")).toHaveValue(
        "Cadastro antigo",
      )
    })

    it("shows an answer the list never offered as a chip of its own", () => {
      draw({
        profile: { ...filledProfile, gender: ["Bigênere"] },
        orphanedProfile: null,
      })

      expect(
        screen.getByRole("button", { name: "Remover Bigênere" }),
      ).toBeInTheDocument()
    })

    it("asks everything on one screen", () => {
      draw({ profile: filledProfile, orphanedProfile: null })

      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument()
      expect(screen.getByRole("group", { name: "Cor ou Raça" })).toBeInTheDocument()
    })
  })

  describe("where saving leads", () => {
    const save = async () => {
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: "Continuar" }))
    }

    it("sends someone filling this in for the first time to the ready page", async () => {
      draw({
        profile: { ...filledProfile, basic_data_filled: false },
        orphanedProfile: null,
      })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/conta/tudo-pronto"))
      expect(success).toHaveBeenCalledWith("Dados salvos com sucesso!")
    })

    it("sends someone correcting their data back to the dashboard", async () => {
      draw({ profile: filledProfile, orphanedProfile: null })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"))
    })

    it("sends an admin to the admin dashboard", async () => {
      draw({
        profile: { ...filledProfile, is_admin: true, basic_data_filled: false },
        orphanedProfile: null,
      })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin"))
    })

    it("sends someone whose old profile was found where their history says", async () => {
      // The row is adopted by the save, so what it knows decides where they
      // land — reading the account they just made would call a returning
      // person new.
      draw({
        profile: null,
        orphanedProfile: { ...filledProfile, basic_data_filled: true },
      })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"))
    })

    it("does not read admin from a profile left behind", async () => {
      // Roles hang off user_id, which an orphaned profile has none of, so the
      // account is the only thing that can say someone is an admin.
      draw({
        profile: null,
        orphanedProfile: { ...filledProfile, is_admin: true },
      })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"))
      expect(navigate).not.toHaveBeenCalledWith("/admin")
    })

    it("takes a session that expired mid-form to the login page", async () => {
      // The endpoint answers an expired session with a redirect, which fetch
      // follows to the login page's HTML — parsing that as JSON would only
      // say "could not save".
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          redirected: true,
          url: "http://localhost/entrar",
          json: async () => {
            throw new SyntaxError("Unexpected token <")
          },
        }),
      )

      draw({ profile: filledProfile, orphanedProfile: null })

      await save()

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/entrar"))
      expect(success).not.toHaveBeenCalled()
    })

    it("stays put when the save refuses an answer", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          json: async () => ({
            ok: false,
            errors: [{ questionId: "cpf", message: "CPF já cadastrado" }],
          }),
        }),
      )

      draw({ profile: filledProfile, orphanedProfile: null })

      await save()

      await waitFor(() =>
        expect(screen.getByText("CPF já cadastrado")).toBeInTheDocument(),
      )
      expect(navigate).not.toHaveBeenCalled()
    })
  })
})
