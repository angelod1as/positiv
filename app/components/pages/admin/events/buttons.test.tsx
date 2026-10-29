import type { FetcherWithComponents } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter, screen, waitFor } from "~/test/test-utils"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { downloadCSV } from "~/lib/helpers/download-csv"
import type {
  ComposableFetcherData,
  Event,
} from "~types/database/entities.types"
import { Buttons } from "./buttons"

vi.mock("~/lib/helpers/download-csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/helpers/download-csv")>()),
  downloadCSV: vi.fn(),
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
  cpf: "52998224725",
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

  it("should download the names and CPF sheet when clicking 'Baixar dados'", async () => {
    renderButtons([goingParticipant])

    screen.getByRole("button", { name: /baixar dados/i }).click()

    await waitFor(() => expect(downloadCSV).toHaveBeenCalled())
    expect(downloadCSV).toHaveBeenCalledWith(
      "\uFEFFNome completo;Nome social ou apelido;CPF;Staff\r\n" +
        "João Silva;João;529.982.247-25;\r\n",
    )
  })

  it("should leave out participants who will not go to the event", async () => {
    renderButtons([goingParticipant, withdrewParticipant])

    screen.getByRole("button", { name: /baixar dados/i }).click()

    await waitFor(() => expect(downloadCSV).toHaveBeenCalled())
    const [content] = vi.mocked(downloadCSV).mock.calls[0]
    expect(content).toContain("João Silva")
    expect(content).not.toContain("Maria Santos")
  })
})
