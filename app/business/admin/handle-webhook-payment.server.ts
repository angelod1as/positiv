import { WEBHOOK_EVENT_TO_TRANSACTION_STATUS } from "~/integrations/asaas/constants"
import type {
  AsaasWebhookPayload,
  PaymentTransactionStatus,
} from "~/integrations/asaas/types"
import { kyselyDb } from "~/kysely-db"

export async function handleWebhookPayment(
  payload: AsaasWebhookPayload,
): Promise<void> {
  const { event, payment } = payload

  const targetStatus = WEBHOOK_EVENT_TO_TRANSACTION_STATUS[event]
  if (!targetStatus) return

  const transaction = await kyselyDb
    .selectFrom("payment_transactions")
    .select([
      "id",
      "status",
      "event_participant_id",
      "event_id",
      "asaas_payment_id",
    ])
    .where("asaas_payment_id", "=", payment.id)
    .executeTakeFirst()

  if (!transaction) return

  if (transaction.status === targetStatus) return

  if (targetStatus === "confirmed") {
    await handleConfirmation(transaction, payload)
  } else if (targetStatus === "failed") {
    await handleFailure(transaction, payload)
  } else if (targetStatus === "refunded") {
    await handleRefund(transaction)
  }
}

interface TransactionRecord {
  id: string
  status: string
  event_participant_id: string
  event_id: string
  asaas_payment_id: string
}

async function handleConfirmation(
  _transaction: TransactionRecord,
  _payload: AsaasWebhookPayload,
): Promise<void> {
  // Will be implemented in Phase D
}

async function handleFailure(
  _transaction: TransactionRecord,
  _payload: AsaasWebhookPayload,
): Promise<void> {
  // Will be implemented in Phase E
}

async function handleRefund(_transaction: TransactionRecord): Promise<void> {
  // Will be implemented in Phase E
}
