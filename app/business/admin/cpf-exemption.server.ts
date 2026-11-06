import { applySchema } from "composable-functions"
import { ACTIVE_PAYMENT_STATUSES } from "~/business/payment/payment-totals.server"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"

export const setProfileCpfExemptSchema = zod.object({
  profileId: zod.string().uuid(),
  cpfExempt: zod.enum(["true", "false"]).transform((value) => value === "true"),
})

/**
 * Grants or lifts the CPF exemption an admin decides on for someone with no
 * CPF. Granting clears the CPF the profile held -- usually a borrowed one,
 * which is what the exemption is there to replace.
 *
 * An exempt profile is never charged online, so an online charge already open
 * would be left in the person's hands with nothing behind it. That one is the
 * admin's to cancel first. The profile row is locked for the check, and
 * opening a charge reads it under a lock of its own, so neither can slip in
 * between the other's check and write.
 */
export const setProfileCpfExempt = applySchema(setProfileCpfExemptSchema)(
  async ({ profileId, cpfExempt }) => {
    return kyselyDb.transaction().execute(async (trx) => {
      const profile = await trx
        .selectFrom("profiles")
        .select("id")
        .where("id", "=", profileId)
        .forUpdate()
        .executeTakeFirst()

      if (!profile) throw new Error(adminParticipantsCopy.viewProfile.profileMissing)

      if (cpfExempt) {
        const open = await trx
          .selectFrom("payments as pay")
          .innerJoin("event_participants as ep", "ep.id", "pay.event_participant_id")
          .select("pay.id")
          .where("ep.profile_id", "=", profileId)
          .where("pay.kind", "=", "online")
          .where("pay.status", "in", [...ACTIVE_PAYMENT_STATUSES])
          .executeTakeFirst()

        if (open) throw new Error(adminParticipantsCopy.cpfExemption.openCharge)
      }

      await trx
        .updateTable("profiles")
        .set(cpfExempt ? { cpf_exempt: true, cpf: null } : { cpf_exempt: false })
        .where("id", "=", profileId)
        .execute()

      return { profileId, cpfExempt }
    })
  },
)
