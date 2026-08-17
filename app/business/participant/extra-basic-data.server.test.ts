import { beforeEach, describe, expect, it, vi } from "vitest"

const { execute, executeTakeFirst } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
  executeTakeFirst: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("~/lib/supabase/db.server", () => {
  const chain = {
    updateTable: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    execute,
    selectFrom: vi.fn(() => chain),
    select: vi.fn(() => chain),
    executeTakeFirst,
  }
  return { db: chain }
})

vi.mock("../newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: vi.fn(),
}))

import { extraBasicData } from "./basic-data.server"

const validProfile = {
  id: "profile-id",
  full_name: "Test User",
  social_name: "Test",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Friend",
  phone: "11999999999",
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  is_admin: false,
  basic_data_filled: false,
}

const formData = {
  gender: ["Mulher cis"],
  orientation: ["Bissexual"],
  pronouns: ["ela/dela"],
  race_color: ["Branca"],
}

const callExtraBasicData = (profileOverrides: Record<string, unknown>) =>
  extraBasicData({
    formData,
    context: {
      currentProfile: { ...validProfile, ...profileOverrides },
      supabaseHeaders: new Headers(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  })

describe("extraBasicData redirect target", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends a first-time person to the account-ready page", async () => {
    const response = await callExtraBasicData({ basic_data_filled: false })
    expect(response.headers.get("Location")).toBe("/conta/tudo-pronto")
  })

  it("sends someone who already filled their data to the dashboard", async () => {
    const response = await callExtraBasicData({ basic_data_filled: true })
    expect(response.headers.get("Location")).toBe("/dashboard")
  })

  it("sends an admin to the admin dashboard even on first completion", async () => {
    const response = await callExtraBasicData({
      basic_data_filled: false,
      is_admin: true,
    })
    expect(response.headers.get("Location")).toBe("/admin")
  })
})
