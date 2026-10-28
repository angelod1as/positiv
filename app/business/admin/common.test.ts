import { describe, expect, it } from "vitest"
import { eventFormValidation } from "~/copy/admin/events"
import {
  participantApplicationStatusEnum,
  participantAttendanceStatusEnum,
  profileApprovedToAttendStatusEnum,
} from "~types/database/entities.types"
import {
  eventFormSchema,
  updateEventParticipantByIdSchema,
  updateParticipantVsEventSchema,
  updateProfileAdminNotesSchema,
  updateProfileApprovalStatusSchema,
} from "./common"

const base = {
  title: "Festa",
  description: "Uma festa",
  emoji: "🎉",
  location: "Rua X",
  total_spots: 50,
  time_event_start: "2026-09-01T20:00",
  time_event_end: "2026-09-02T04:00",
  time_application_start: "2026-08-01T12:00",
  time_group_start: "2026-08-20T12:00",
  time_group_end: "2026-09-01T12:00",
  time_payment_start: "2026-08-10T12:00",
  time_payment_end: "2026-08-25T12:00",
}

describe("eventFormSchema.ticket_price", () => {
  it("converts the reais an admin types into cents", () => {
    expect(
      eventFormSchema.parse({ ...base, ticket_price: "220" }).ticket_price,
    ).toBe(22000)
    expect(
      eventFormSchema.parse({ ...base, ticket_price: "220,50" }).ticket_price,
    ).toBe(22050)
    expect(
      eventFormSchema.parse({ ...base, ticket_price: 220 }).ticket_price,
    ).toBe(22000)
  })

  it("still refuses a price below one real, saying why", () => {
    for (const tooSmall of ["0", "0,50", "0.50"]) {
      const result = eventFormSchema.safeParse({
        ...base,
        ticket_price: tooSmall,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          eventFormValidation.ticketPriceTooSmall,
        )
      }
    }
  })

  it("refuses something that is not a number", () => {
    expect(() =>
      eventFormSchema.parse({ ...base, ticket_price: "abc" }),
    ).toThrow()
  })
})

describe("admin body schemas refuse an id that is not a uuid", () => {
  const UUID = "3f2c9a1e-5b7d-4c8e-9f10-2a3b4c5d6e7f"
  const NOT_UUID = "eventos"

  const participantVsEvent = {
    profile_id: UUID,
    event_id: UUID,
    intent: "participant-vs-event-schema",
    attendance_status: participantAttendanceStatusEnum.options[0],
    application_status: participantApplicationStatusEnum.options[0],
    spot_type: "regular",
    was_selected_for_rotation: false,
    admin_general_notes: "",
  }

  const cases = [
    {
      name: "updateParticipantVsEventSchema",
      schema: updateParticipantVsEventSchema,
      valid: participantVsEvent,
      ids: ["profile_id", "event_id"],
    },
    {
      name: "updateEventParticipantByIdSchema",
      schema: updateEventParticipantByIdSchema,
      valid: { id: UUID, profile_id: UUID },
      ids: ["id", "profile_id"],
    },
    {
      name: "updateProfileApprovalStatusSchema",
      schema: updateProfileApprovalStatusSchema,
      valid: {
        intent: "update-profile-approval-status",
        profile_id: UUID,
        approved_to_attend: profileApprovedToAttendStatusEnum.options[0],
      },
      ids: ["profile_id"],
    },
    {
      name: "updateProfileAdminNotesSchema",
      schema: updateProfileAdminNotesSchema,
      valid: { intent: "update-profile-admin-notes", profile_id: UUID },
      ids: ["profile_id"],
    },
    {
      name: "eventFormSchema",
      schema: eventFormSchema,
      valid: { ...base, ticket_price: "220", id: UUID },
      ids: ["id"],
    },
  ]

  for (const { name, schema, valid, ids } of cases) {
    it(`${name} accepts a uuid`, () => {
      expect(schema.safeParse(valid).success).toBe(true)
    })

    for (const id of ids) {
      it(`${name} refuses a non-uuid ${id}`, () => {
        const result = schema.safeParse({ ...valid, [id]: NOT_UUID })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual([id])
        }
      })
    }
  }
})
