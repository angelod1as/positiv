import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/profile/likert-answers.server", () => ({
  canSeeLikert: vi.fn(),
}))

vi.mock("~/business/profile/likert-submissions.server", () => ({
  listLikertSubmissions: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { listLikertSubmissions } from "~/business/profile/likert-submissions.server"
import LikertPage, { loader } from "./likert-page"

type PageProps = Parameters<typeof LikertPage>[0]
type LoaderArgs = Parameters<typeof loader>[0]

const currentProfile = { id: "profile-1", permissions: [] }

const runLoader = () =>
  loader({
    request: new Request("http://localhost/conta/escala"),
    params: {},
  } as unknown as LoaderArgs)

const renderPage = (loaderData: PageProps["loaderData"]) =>
  render(
    <MemoryRouter initialEntries={["/conta/escala"]}>
      <LikertPage {...({ loaderData } as PageProps)} />
    </MemoryRouter>,
  )

describe("LikertPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)
  })

  it("lists the person's own submissions, newest first as stored", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(true)
    vi.mocked(listLikertSubmissions).mockResolvedValue([
      { id: "b", submittedAt: new Date("2026-11-18T17:00:00.000Z") },
      { id: "a", submittedAt: new Date("2026-11-01T13:30:00.000Z") },
    ])

    expect(await runLoader()).toEqual({
      submissions: [
        { id: "b", submittedAt: "2026-11-18T17:00:00.000Z" },
        { id: "a", submittedAt: "2026-11-01T13:30:00.000Z" },
      ],
    })
    expect(listLikertSubmissions).toHaveBeenCalledWith(
      "profile-1",
      currentProfile,
    )
  })

  it("sends someone who may not see the scale back to the account", async () => {
    vi.mocked(canSeeLikert).mockResolvedValue(false)

    const result = await runLoader()

    expect((result as Response).headers.get("Location")).toBe("/conta")
    expect(listLikertSubmissions).not.toHaveBeenCalled()
  })
})

describe("LikertPage", () => {
  it("invites someone who never answered to answer", () => {
    renderPage({ submissions: [] })

    expect(
      screen.getByText("Você ainda não respondeu a escala."),
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Responder" })).toHaveAttribute(
      "href",
      "/conta/escala/responder",
    )
  })

  it("lists each submission by date, linking to it, and offers to answer again", () => {
    renderPage({
      submissions: [
        { id: "b", submittedAt: "2026-11-18T17:00:00.000Z" },
        { id: "a", submittedAt: "2026-11-01T13:30:00.000Z" },
      ],
    })

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.match(/\/conta\/escala\/[ab]$/))
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/conta/escala/b",
      "/conta/escala/a",
    ])
    expect(links[0]).toHaveTextContent("18 de novembro de 2026")
    expect(
      screen.getByRole("link", { name: "Responder de novo" }),
    ).toHaveAttribute("href", "/conta/escala/responder")
  })
})
