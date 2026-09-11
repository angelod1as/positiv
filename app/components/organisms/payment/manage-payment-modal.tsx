import { useEffect, useState, type FC, type FormEvent } from "react"
import { useFetcher } from "react-router"
import type { AsaasFees } from "~/business/payment/pricing"
import { buildPaymentOptions } from "~/business/payment/pricing"
import type { PaymentRow } from "~/business/payment/payment-totals.server"
import type { ParticipantPaymentTotals } from "~types/database/entities.types"
import { Button } from "~/components/atoms/button/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { paymentsCopy } from "~/copy/payments"
import { formatInTimeZone } from "date-fns-tz"
import {
  centsToReaisText,
  formatCurrency,
} from "~/lib/helpers/format-currency"
import { paymentStatusPropMap } from "~/lib/helpers/propMaps"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

const { manage, manual, refund, cancel, charge, errors } = paymentsCopy

/** Every payment recorded by hand arrived by PIX; nothing else is offered. */
const MANUAL_METHOD = "pix"

// Where the party is, not where the server is: past 21h in São Paulo, a UTC
// date is already tomorrow, and the admin recording that night's money would
// be offered the wrong day.
const today = () =>
  formatInTimeZone(new Date(), "America/Sao_Paulo", "yyyy-MM-dd")

export type ManagePaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventParticipantId: string
  participantName: string
  payments: PaymentRow[]
  totals: ParticipantPaymentTotals
  active: PaymentRow | null
  paymentsEnabled: boolean
  spotType: string | null
  ticketPrice: number | null
  eventTitle: string
  fees: AsaasFees | null
  appOrigin: string
}

type RefundDialogProps = {
  payment: PaymentRow
  isSubmitting: boolean
  onConfirm: (paymentId: string, amount: string) => void
}

const RefundDialog: FC<RefundDialogProps> = ({
  payment,
  isSubmitting,
  onConfirm,
}) => {
  const [amount, setAmount] = useState("")
  const amountId = `refund-amount-${payment.id}`

  // The dialog's content unmounts but this component does not, so without the
  // reset an amount typed and abandoned is still there next time — and the
  // hint below the field promises an empty field refunds everything.
  return (
    <AlertDialog onOpenChange={(open) => open && setAmount("")}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          {refund.title}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{refund.confirm}</AlertDialogTitle>
          <AlertDialogDescription>{refund.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={amountId}>{refund.amount}</Label>
          <Input
            id={amountId}
            name="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-muted-foreground text-sm">{refund.amountHint}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{manage.close}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={() => onConfirm(payment.id, amount)}
          >
            {refund.submit}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type CancelDialogProps = {
  payment: PaymentRow
  isSubmitting: boolean
  onConfirm: (paymentId: string) => void
}

const CancelDialog: FC<CancelDialogProps> = ({
  payment,
  isSubmitting,
  onConfirm,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm">
        {cancel.title}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{cancel.confirm}</AlertDialogTitle>
        <AlertDialogDescription>{cancel.description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancel.keep}</AlertDialogCancel>
        <AlertDialogAction
          disabled={isSubmitting}
          onClick={() => onConfirm(payment.id)}
        >
          {cancel.submit}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

type ChargeSectionProps = {
  active: PaymentRow | null
  participantName: string
  eventTitle: string
  ticketPrice: number | null
  fees: AsaasFees
  appOrigin: string
  isSubmitting: boolean
  onOffer: (baseAmount: string) => void
  onResend: (paymentId: string) => void
}

/**
 * Opening a charge is its own act, behind its own button. Nothing in the
 * participant funnel triggers it: a status is a note an admin keeps, and an
 * absent-minded grid edit should not delete a live Asaas charge and email
 * somebody a second payment link.
 */
const ChargeSection: FC<ChargeSectionProps> = ({
  active,
  participantName,
  eventTitle,
  ticketPrice,
  fees,
  appOrigin,
  isSubmitting,
  onOffer,
  onResend,
}) => {
  // Blank when there is nothing to suggest, rather than "0,00". A zero reaches
  // the server as a zero and is refused for being one, which tells the admin
  // her amount is too low when the truth is that the event has no price. An
  // empty field arrives as no amount at all, which is what happened.
  const suggested = active?.base_amount ?? ticketPrice
  const [amount, setAmount] = useState(
    suggested ? centsToReaisText(suggested) : "",
  )
  const [copied, setCopied] = useState(false)

  // Replacing a charge the participant has already acted on deletes it at
  // Asaas mid-checkout, so that one asks first. A pending row is nobody's
  // work in progress.
  const needsConfirmation = active?.status === "awaiting_payment"

  const copyMessage = () => {
    if (!active) return
    // Built here rather than fetched: writeText has to run inside the click
    // that asked for it, and a round trip first loses that permission.
    const message = paymentsCopy.whatsappMessage({
      displayName: participantName,
      eventTitle,
      // The origin the server would use, not the one this browser happens to
      // be on: appOrigin deliberately ignores the request host, and the two
      // channels must hand the participant the same link.
      paymentUrl: `${appOrigin}${paths.payment.PAYMENT(active.id)}`,
      dueAt: active.due_at,
      options: buildPaymentOptions(active.base_amount, fees),
    })
    void navigator.clipboard.writeText(message)
    setCopied(true)
  }

  // The copied notice belongs to the charge it was copied from. Opening
  // another one leaves the message on the clipboard stale, so the notice goes
  // with it rather than sitting under a link that no longer works.
  const sendOffer = () => {
    setCopied(false)
    onOffer(amount)
  }

  const sendLabel = active ? charge.resendAmount : charge.send

  return (
    <section className="flex flex-col gap-4 border-b pb-4">
      <h3 className="font-bold">{charge.title}</h3>

      <div className="flex flex-col gap-2">
        <Label htmlFor="charge-amount">{charge.amount}</Label>
        {/* Text, not number: a number input binds the arrow keys and the
            scroll wheel to a step of one cent, so an admin moving the caret
            through the amount changes it. */}
        <Input
          id="charge-amount"
          name="baseAmount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <p className="text-muted-foreground text-sm">{charge.amountHint}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {needsConfirmation ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSubmitting}>{sendLabel}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{charge.replaceConfirm}</AlertDialogTitle>
                <AlertDialogDescription>
                  {charge.replaceDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{charge.replaceKeep}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isSubmitting}
                  onClick={() => sendOffer()}
                >
                  {charge.replaceSubmit}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button disabled={isSubmitting} onClick={() => sendOffer()}>
            {sendLabel}
          </Button>
        )}

        {active && (
          <>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onResend(active.id)}
            >
              {charge.resendEmail}
            </Button>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={copyMessage}
            >
              {charge.copyMessage}
            </Button>
          </>
        )}
      </div>

      {copied && (
        <p role="status" className="text-muted-foreground text-sm">
          {charge.copied}
        </p>
      )}
    </section>
  )
}

export const ManagePaymentModal: FC<ManagePaymentModalProps> = ({
  open,
  onOpenChange,
  eventParticipantId,
  participantName,
  payments,
  totals,
  active,
  paymentsEnabled,
  spotType,
  ticketPrice,
  eventTitle,
  fees,
  appOrigin,
}) => {
  const fetcher = useFetcher<{
    success?: boolean
    intent?: string
    errors?: { message?: string }[]
    emailSent?: boolean
  }>()

  const failure =
    fetcher.data && fetcher.data.success === false ? fetcher.data : null
  const failureMessages = failure
    ? (failure.errors ?? []).flatMap((error) => error.message ?? [])
    : []

  // A recorded payment is the end of the errand: the admin came here to write
  // it down, and the grid behind the dialog already shows the result.
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.intent === "payment-manual") {
      onOpenChange(false)
    }
  }, [fetcher.data, onOpenChange])

  // The charge exists and the participant does not know. Not an error -- the
  // row is good and the admin can still reach them by hand -- but she has to
  // be told, or she walks away believing the link is in their inbox.
  const emailFailed =
    fetcher.data?.success === true && fetcher.data.emailSent === false
  const chargeWithoutEmail =
    emailFailed && fetcher.data?.intent === "payment-offer"
  const resendFailed = emailFailed && fetcher.data?.intent === "payment-resend"
  const resendSucceeded =
    fetcher.data?.success === true &&
    fetcher.data.intent === "payment-resend" &&
    fetcher.data.emailSent === true

  const isSubmitting = fetcher.state !== "idle"

  const post = (values: Record<string, string>) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))
    fetcher.submit(formData, { method: "POST" })
  }

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    post({
      intent: "payment-manual",
      eventParticipantId,
      amount: String(formData.get("amount") ?? ""),
      method: MANUAL_METHOD,
      paidAt: String(formData.get("paidAt") ?? ""),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{manage.title}</DialogTitle>
          <DialogDescription>
            {manage.description(participantName)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.gross}
            </dt>
            <dd className="font-bold">
              {formatCurrency(totals.paid_gross - totals.refunded)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.fee}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.fee)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.refunded}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.refunded)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {manage.totals.net}
            </dt>
            <dd className="font-bold">{formatCurrency(totals.net)}</dd>
          </div>
        </dl>

        {failure && (
          <div
            role="alert"
            className="border-destructive text-destructive rounded-md border p-3 text-sm"
          >
            {failureMessages.length > 0 ? (
              failureMessages.map((message) => <p key={message}>{message}</p>)
            ) : (
              <p>{errors.generic}</p>
            )}
          </div>
        )}

        {payments.length === 0 ? (
          <p>{manage.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {/* Deliberately unlabelled: the date opens the row like a
                    stamp, and a heading for two characters would weigh more
                    than what it names. The label is there for screen
                    readers. */}
                <TableHead>
                  <span className="sr-only">{manage.columns.sentAt}</span>
                </TableHead>
                <TableHead>{manage.columns.status}</TableHead>
                <TableHead>{manage.columns.kind}</TableHead>
                <TableHead>{manage.columns.method}</TableHead>
                <TableHead>{manage.columns.amount}</TableHead>
                <TableHead>{manage.columns.fees}</TableHead>
                <TableHead>{manage.columns.date}</TableHead>
                <TableHead>{manage.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatInTimeZone(
                      payment.created_at,
                      "America/Sao_Paulo",
                      "dd/MM",
                    )}
                  </TableCell>
                  <TableCell>{paymentStatusPropMap(payment.status)}</TableCell>
                  <TableCell>{manage.kinds[payment.kind]}</TableCell>
                  <TableCell>
                    {payment.method
                      ? manage.methods[payment.method]
                      : manage.noMethod}
                  </TableCell>
                  {/* Two columns because they are two different people's
                      money. "Valor" is Positiv's: what was agreed while the
                      charge is open, and what actually landed once Asaas
                      reports it -- never `amount`, which is the gross the
                      participant pays and lands on the row as soon as they
                      pick a method, long before asaas_net exists. "Taxas" is
                      their share, known from the same moment. */}
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(payment.asaas_net ?? payment.base_amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {payment.kind === "asaas" && payment.amount !== null
                      ? // Against asaas_net once the webhook reports it, and
                        // against the base until then: a paid row is allowed
                        // to exist without asaas_net, and the estimate the
                        // participant was quoted beats showing no fee at all
                        // on a charge that certainly had one.
                        formatCurrency(
                          payment.amount -
                            (payment.asaas_net ?? payment.base_amount),
                        )
                      : manage.noAmount}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(payment.paid_at, "numeric").date ??
                      manage.noDate}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                    {payment.kind === "manual" &&
                      payment.status === "paid" &&
                      (payment.amount ?? 0) > 0 && (
                      <RefundDialog
                        payment={payment}
                        isSubmitting={isSubmitting}
                        onConfirm={(paymentId, amount) =>
                          post({
                            intent: "payment-manual-refund",
                            paymentId,
                            amount,
                          })
                        }
                      />
                    )}
                      {active?.id === payment.id && (
                        <CancelDialog
                          payment={payment}
                          isSubmitting={isSubmitting}
                          onConfirm={(paymentId) =>
                            post({ intent: "payment-cancel", paymentId })
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {chargeWithoutEmail && (
          <p role="alert" className="rounded-md border p-3 text-sm">
            {charge.emailFailed}
          </p>
        )}

        {resendFailed && (
          <p role="alert" className="rounded-md border p-3 text-sm">
            {charge.resendFailed}
          </p>
        )}

        {/* Nothing on screen changes when a resend works -- same row, same
            deadline -- so without a word the admin cannot tell it from a
            button that did nothing. */}
        {resendSucceeded && (
          <p role="status" className="text-muted-foreground text-sm">
            {charge.resendSucceeded}
          </p>
        )}

        {paymentsEnabled && spotType === "regular" && fees && (
          <ChargeSection
            // Remounts when the charge does, so the amount field re-seeds from
            // whatever is open now. Cancelling one used to leave its value in
            // a field that had gone back to offering the ticket price.
            key={active?.id ?? "none"}
            active={active}
            participantName={participantName}
            eventTitle={eventTitle}
            ticketPrice={ticketPrice}
            fees={fees}
            appOrigin={appOrigin}
            isSubmitting={isSubmitting}
            onOffer={(baseAmount) =>
              post({ intent: "payment-offer", eventParticipantId, baseAmount })
            }
            onResend={(paymentId) => post({ intent: "payment-resend", paymentId })}
          />
        )}

        {active ? (
          <p>{errors.activeChargeExists}</p>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
            <h3 className="font-bold">{manual.title}</h3>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-amount">{manual.amount}</Label>
              {/* Text, not number: a number input binds the arrow keys and the
                  scroll wheel to a step of one cent, so an admin moving the
                  caret through the amount changes it. reaisToCents reads both
                  "150.55" and "150,55". */}
              <Input
                id="manual-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-paid-at">{manual.paidAt}</Label>
              <Input
                id="manual-paid-at"
                name="paidAt"
                type="date"
                defaultValue={today()}
                required
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {manual.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
