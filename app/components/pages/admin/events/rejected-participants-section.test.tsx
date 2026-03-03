import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import type { RejectedEventParticipant } from "~/business/admin/admin.server"
import { RejectedParticipantsSection } from "./rejected-participants-section"

describe("RejectedParticipantsSection", () => {
  it("should render nothing when participants array is empty", () => {
    const { container } = renderWithRouter(
      <RejectedParticipantsSection participants={[]} />,
    )
    expect(container.innerHTML).toBe("")
  })

  it("should render count text with correct number", () => {
    const participants: RejectedEventParticipant[] = [
      { profile_id: "1", social_name: "Social", full_name: "Full Name" },
      { profile_id: "2", social_name: null, full_name: "Another Name" },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )
    expect(
      screen.getByText(
        "2 participantes rejeitades se inscreveram neste evento",
      ),
    ).toBeDefined()
  })

  it("should start collapsed (names not visible)", () => {
    const participants: RejectedEventParticipant[] = [
      { profile_id: "1", social_name: "Social", full_name: "Full Name" },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )
    expect(screen.queryByText("Social (Full Name)")).toBeNull()
  })

  it("should show linked names when expanded", async () => {
    const user = userEvent.setup()
    const participants: RejectedEventParticipant[] = [
      { profile_id: "abc-123", social_name: "Social", full_name: "Full Name" },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )

    await user.click(screen.getByRole("button"))

    const link = screen.getByRole("link", { name: "Social (Full Name)" })
    expect(link).toBeDefined()
    expect(link.getAttribute("href")).toBe("/admin/participantes/abc-123")
  })

  it("should fall back to just full_name when social_name is null", async () => {
    const user = userEvent.setup()
    const participants: RejectedEventParticipant[] = [
      { profile_id: "xyz-456", social_name: null, full_name: "Only Full Name" },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )

    await user.click(screen.getByRole("button"))

    const link = screen.getByRole("link", { name: "Only Full Name" })
    expect(link).toBeDefined()
    expect(link.getAttribute("href")).toBe("/admin/participantes/xyz-456")
  })

  it("should fall back to '(sem nome)' when both names are null", async () => {
    const user = userEvent.setup()
    const participants: RejectedEventParticipant[] = [
      { profile_id: "no-name-123", social_name: null, full_name: null },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )

    await user.click(screen.getByRole("button"))

    const link = screen.getByRole("link", { name: "(sem nome)" })
    expect(link).toBeDefined()
    expect(link.getAttribute("href")).toBe("/admin/participantes/no-name-123")
  })

  it("should use singular text for 1 participant", () => {
    const participants: RejectedEventParticipant[] = [
      { profile_id: "1", social_name: null, full_name: "Lone Rejected" },
    ]
    renderWithRouter(
      <RejectedParticipantsSection participants={participants} />,
    )
    expect(
      screen.getByText(
        "1 participante rejeitade se inscreveu neste evento",
      ),
    ).toBeDefined()
  })
})
