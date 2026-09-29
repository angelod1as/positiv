# Payments runbook

What to do when online payments through Asaas misbehave, and how to try the
whole flow by hand. The design is `docs/plans/payments-v3-design.md`.

Every Asaas call below goes to `$ASAAS_API_URL` with the header
`access_token: $ASAAS_API_KEY`. The sandbox is `https://api-sandbox.asaas.com/v3`
and production is `https://api.asaas.com/v3`. The two are separate accounts
with separate keys, webhooks and charges.

Never paste a key into a command line: Claude Code stores approved commands
verbatim, and this repository is public. Load it from the environment:

```bash
varlock run -- sh -c 'curl -s "$ASAAS_API_URL/webhooks" -H "access_token: $ASAAS_API_KEY"'
```

## 1. Environment

Declared in `.env.schema`. In production the values live in Coolify, as
runtime environment. They say whether Asaas is configured; whether online
payments are on is the admin switch (section 8).

| Variable | What it is | Sandbox vs production |
|---|---|---|
| `ASAAS_API_URL` | Base URL including `/v3` | differs |
| `ASAAS_API_KEY` | API key, shown once by Asaas when generated | differs |
| `ASAAS_WEBHOOK_TOKEN` | At least 32 characters; Asaas echoes it in `asaas-access-token` | use a fresh one per environment |

## 2. Registering the webhook

```bash
pnpm asaas:register-webhook https://www.positivparty.com
```

Run it once per environment. Running it again updates the webhook named
`Positiv` instead of adding a second one, which would deliver every event twice.
The script sends `sendType: SEQUENTIALLY`, `apiVersion: 3`, the token, and the
event list in `scripts/asaas/register-webhook.ts`.

## 3. The webhook queue stopped

Asaas delivers events one at a time. A delivery that fails holds every later
one behind it, and after 15 consecutive failures Asaas interrupts the queue and
emails the address registered on the webhook (at failures 5, 10 and 15).

1. Find out why deliveries fail: the app logs, `/api/asaas/webhook` answering
   401 (token mismatch), 503 (`ASAAS_WEBHOOK_TOKEN` unset) or 5xx.
2. Fix that first. Resuming a queue that still fails only burns another 15
   attempts.
3. Check the state:

   ```bash
   varlock run -- sh -c 'curl -s "$ASAAS_API_URL/webhooks" -H "access_token: $ASAAS_API_KEY"'
   ```

   Look at `interrupted` and `penalizedRequestsCount`.
4. Resume it:

   ```bash
   varlock run -- sh -c 'curl -s -X PUT "$ASAAS_API_URL/webhooks/<webhook id>" \
     -H "access_token: $ASAAS_API_KEY" -H "Content-Type: application/json" \
     -d "{\"interrupted\": false}"'
   ```

Asaas keeps undelivered events for 14 days. Anything older is gone, and the
affected payments have to be reconciled by hand against the Asaas dashboard.

## 4. Reading the webhook inbox

Every delivery lands in `payment_webhook_events`, keyed by the Asaas event id,
before it is applied.

```sql
SELECT event_type, asaas_payment_id, received_at, processed_at, error
  FROM payment_webhook_events
 WHERE processed_at IS NULL OR error IS NOT NULL
 ORDER BY received_at DESC
 LIMIT 50;
```

A row with `error` was answered 500, so Asaas will retry it. A row with
`processed_at` and no error was applied, or was about a charge that is not ours,
such as one created by hand in the Asaas dashboard.

## 5. The payment email outbox

Payment emails (link, confirmation, refund) are written to `payment_emails` in
the same transaction as the change that causes them, then sent right after the
commit. A send that fails is retried by the `retry-payment-emails` cron job every
5 minutes, with backoff, up to 5 attempts. After the fifth it is given up and
logged as an error.

Emails given up on — someone was not told something:

```sql
SELECT pe.kind, pe.attempts, pe.last_error, pe.created_at, pe.payment_id
  FROM payment_emails pe
 WHERE pe.given_up_at IS NOT NULL AND pe.sent_at IS NULL
 ORDER BY pe.created_at DESC;
```

Tell the participant by another channel. For a payment link, "Reenviar email" or
"Copiar mensagem" in the payment modal does it.

Emails still being retried:

```sql
SELECT kind, attempts, next_attempt_at, last_error
  FROM payment_emails
 WHERE sent_at IS NULL AND given_up_at IS NULL
 ORDER BY created_at;
```

## 6. A payment stuck in `awaiting_payment`

The participant picked an option and says they paid, but the row never turned
`paid`.

1. Look for the charge's events in the inbox (section 4), by `asaas_payment_id`.
2. Look at the charge in the Asaas dashboard.
3. If Asaas shows the money received and no event arrived, the webhook queue is
   the problem (section 3). Once it is resumed, the pending events arrive.
4. If the event is past Asaas's 14 days, record the payment by hand. Never edit
   the row to `paid`: the webhook would no longer be able to update it.

A growing number here means the webhook is not arriving:

```sql
SELECT count(*) FROM payments
 WHERE status = 'awaiting_payment' AND due_at < now();
```

## 7. Refunds

Refunds of Asaas payments are done in the Asaas dashboard, by hand. The site
does not ask Asaas for them; it records them when Asaas reports them.

- "Reembolsar no Asaas" in the payment modal opens the charge in the dashboard,
  at `/payment/show/{invoiceNumber}` (sandbox or production, following
  `ASAAS_API_URL`). A card plan opens its first charge; a charge with no stored
  number opens the payments list.
- PIX can be refunded up to 90 days after payment, if the money is available in
  the Asaas account. A card up to 365 days; the money shows on the
  participant's statement within about 10 working days.
- Asaas may hold a refund until someone authorises it in the dashboard (it
  asks for a code).
- The row turns `refunded` or `partially_refunded` when Asaas confirms through
  the webhook, or when the refund sync reads it from Asaas. Only `DONE` refunds
  count as returned. While Asaas reports one in progress the modal says so.
- Under each payment the modal lists what Asaas last reported: given back
  (DONE), still on its way (PENDING and the AWAITING_* authorisations) and
  cancelled. "Atualizar do Asaas" reads it on demand.
- The `sync-payment-refunds` cron job reads the payments Asaas may still have
  news about every 15 minutes: an incomplete refund, or a refund on its way.
  To confirm the job exists in production:
  `select jobname, schedule, active from cron.job where jobname = 'sync-payment-refunds';`
- Asaas never deletes a charge that was paid. A paid charge can only be
  refunded.

## 8. Turning online payments off

**Admin → Configurações → Pagamentos online** (`/admin/configuracoes`). It
takes effect on the next request, with no deploy. Off means:

- the payment modal hides the Cobrança section: manual payments only;
- the emailed link shows "fale com a organização", and no new charge can be
  created at Asaas;
- no payment-link email or resend goes out.

What keeps working: open charges stay open on Asaas and can still be paid on
the invoice page, the webhook records them, and refunds of Asaas payments are
still done in the dashboard and recorded here. Nothing is cancelled. Turning the switch back on needs no
migration.

The switch cannot be turned on while `ASAAS_API_URL`, `ASAAS_API_KEY` or
`ASAAS_WEBHOOK_TOKEN` is missing; the page says so.

## 9. Trying the whole flow by hand in dev, against the sandbox

1. `.env` holds the sandbox key and URL and a webhook token, and online
   payments are switched on in `/admin/configuracoes`.
2. Serve the production build, not `pnpm dev`. The dev server listens on
   `[::1]` only, and Vite refuses the tunnel's host name:

   ```bash
   pnpm build
   PORT=5173 HOST=127.0.0.1 pnpm start
   ```

3. Open a public tunnel to it, for example
   `cloudflared tunnel --url http://localhost:5173`. Load the tunnel URL once in
   a browser before registering: a slow first delivery while the tunnel sets up
   TLS gets the queue penalised.
4. Register the webhook against the tunnel:
   `pnpm asaas:register-webhook https://<tunnel host>`.
5. In the admin, open an event, pick a participant on a regular spot, and send a
   charge from "Gerenciar pagamento". The link email lands in Mailpit
   (<http://127.0.0.1:54324>).
6. Open the link as that participant and pick an option. The app hands off to
   the Asaas invoice page.
7. Confirm the payment. Pay with a test card, generated with any card-number
   generator, any future expiry date and CCV `123`, or use "Confirmar pagamento"
   in the sandbox dashboard. The webhook marks the row paid and the
   confirmation email goes out.
8. Refund it in the Asaas dashboard through "Reembolsar no Asaas", and record a
   manual payment on another participant.
9. Close the tunnel when done. It publishes the whole local app.

### Checking the installments against the sandbox

```bash
pnpm asaas:smoke
```

It opens a PIX charge and a card 6x charge for R$ 250, confirms them, and prints
each installment Asaas charged next to what the payment page shows. It exits
non-zero when they differ: R$ 250 in 6x does not divide, so it checks that Asaas
puts the remainder on the last installment, as `splitInstallments` assumes.

The tunnel and webhook from above are optional. With them in place the script
also waits for each confirmation to reach `payment_webhook_events`, and fails if
one does not. Without a registered webhook it says so and skips that check.
