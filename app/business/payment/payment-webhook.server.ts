import type { z } from "zod"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"

/**
 * Deliberately permissive. Asaas adds fields without warning, and the docs say
 * so: a body that carries something new must still be processed, not rejected.
 * Only `id` and `event` are required, because they are what dedupes and routes.
 */
export const webhookEventSchema = zod.looseObject({
  id: zod.string().min(1),
  event: zod.string().min(1),
  dateCreated: zod.string().optional(),
  payment: zod
    .looseObject({
      id: zod.string(),
      status: zod.string().optional(),
      value: zod.number().optional(),
      netValue: zod.number().nullable().optional(),
      installment: zod.string().nullable().optional(),
      externalReference: zod.string().nullable().optional(),
      paymentDate: zod.string().nullable().optional(),
      confirmedDate: zod.string().nullable().optional(),
      dueDate: zod.string().nullable().optional(),
      refunds: zod
        .array(
          zod.looseObject({
            value: zod.number().optional(),
            status: zod.string().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .optional(),
})

export type AsaasWebhookEvent = z.infer<typeof webhookEventSchema>

export async function recordWebhookEvent(
  event: AsaasWebhookEvent,
): Promise<{ isNew: boolean; id: string }> {
  const inserted = await kyselyDb
    .insertInto("payment_webhook_events")
    .values({
      asaas_event_id: event.id,
      event_type: event.event,
      asaas_payment_id: event.payment?.id ?? null,
      payload: JSON.stringify(event),
    })
    .onConflict((oc) => oc.column("asaas_event_id").doNothing())
    .returning("id")
    .executeTakeFirst()

  if (inserted) return { isNew: true, id: inserted.id }

  const existing = await kyselyDb
    .selectFrom("payment_webhook_events")
    .select("id")
    .where("asaas_event_id", "=", event.id)
    .executeTakeFirstOrThrow()

  return { isNew: false, id: existing.id }
}

export async function applyWebhookEvent(
  inboxId: string,
  _event: AsaasWebhookEvent,
): Promise<{ applied: boolean }> {
  await kyselyDb
    .updateTable("payment_webhook_events")
    .set({ processed_at: new Date().toISOString() })
    .where("id", "=", inboxId)
    .execute()

  return { applied: false }
}
