import type { FetcherWithComponents } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { downloadXLSX } from "~/lib/helpers/download-xlsx"
import type {
  ComposableFetcherData,
  Event,
} from "~types/database/entities.types"
import { Buttons } from "./buttons"

vi.mock("~/lib/helpers/download-xlsx", () => ({
  downloadXLSX: vi.fn(),
}))

const mockFetcher = {
  Form: ({ children, ...props }: { children: React.ReactNode }) => (
    <form {...props}>{children}</form>
  ),
  state: "idle",
  data: undefined,
  formData: undefined,
  submit: vi.fn(),
  load: vi.fn(),
} as unknown as FetcherWithComponents<ComposableFetcherData>

const event = {
  id: "event-1",
  event_status: "Registration Open",
  listmonk_list_id: null,
} as Event

const goingParticipant = {
  id: "1",
  full_name: "João Silva",
  social_name: "João",
  rg: "12345678",
  rg_issuer: "SSP",
  approved_to_attend: "approved",
  application_status: "finalised",
  attendance_status: "pending",
  spot_type: "regular",
} as ProfileWithExtraData

const withdrewParticipant = {
  ...goingParticipant,
  id: "2",
  full_name: "Maria Santos",
  social_name: "Maria",
  rg: "87654321",
  attendance_status: "withdrew",
} as ProfileWithExtraData

const renderButtons = (participants: ProfileWithExtraData[]) =>
  renderWithRouter(
    <Buttons
      event={event}
      participants={participants}
      isListStale={false}
      fetcher={mockFetcher}
    />,
  )

describe("Buttons", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should download the names and RG sheet when clicking 'Baixar dados'", async () => {
    renderButtons([goingParticipant])

    screen.getByRole("button", { name: /baixar dados/i }).click()

    expect(downloadXLSX).toHaveBeenCalledWith([
      {
        "Nº": 1,
        Staff: "",
        "Status de Aprovação": "approved",
        "Nome completo": "João Silva",
        "Nome social ou apelido": "João",
        RG: "12345678",
        "Emissor do RG": "SSP",
      },
    ])
  })

  it("should leave out participants who will not go to the event", () => {
    renderButtons([goingParticipant, withdrewParticipant])

    screen.getByRole("button", { name: /baixar dados/i }).click()

    const [rows] = vi.mocked(downloadXLSX).mock.calls[0] as [
      Array<Record<string, unknown>>,
    ]
    expect(rows).toHaveLength(1)
    expect(rows[0]["Nome completo"]).toBe("João Silva")
  })
})
