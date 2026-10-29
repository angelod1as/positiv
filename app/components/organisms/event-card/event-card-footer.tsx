import { EyeIcon } from "lucide-react"
import { useEffect, useId, useState, type FC } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Button } from "~/components/atoms/button/button"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Label } from "~/components/ui/label"
import { TextArea } from "~/components/ui/textarea"
import { MAX_CANCELLATION_REASON_LENGTH } from "~/business/participant/cancellation-reason-schema"
import { eventCardCopy } from "~/copy/events"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { useAnalytics } from "~/lib/hooks/use-analytics"
import { useSmartPrefetch } from "~/lib/hooks/use-smart-prefetch"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/database/entities.types"

const {
  dash: {
    // participant: { DOWNLOAD_CALENDAR },
    events: { EVENT_VIEW },
  },
  admin: {
    events: { ADMIN_VIEW_EVENT },
  },
  payment: { PAYMENT },
} = paths

type EventCardFooterProps = {
  is_applied: boolean | undefined
  /** Whether this person holds an invite into this event, closed or not. */
  is_invited?: boolean
  /** The charge this person still owes for this event, if there is one. */
  active_payment_id?: string | null
  /** Whether Positiv holds this person's money for this event. */
  has_paid?: boolean
  eventTitle?: string | null
  event_status: EventStatus
  googleLink: string | undefined
  eventId: string
  dataTestId: string | undefined
  isAdmin?: boolean
  /**
   * Whether this person may skip the application flow. Separate from `isAdmin`,
   * which turns the card into the admin dashboard's own and drops the
   * application buttons altogether.
   */
  directApply?: boolean
  /**
   * Whether this person applies as staff, who are outside the limit that
   * closes registrations.
   */
  appliesAsStaff?: boolean
}

const ApplyButton = ({
  eventId,
  dataTestId,
}: {
  eventId: string
  dataTestId: string | undefined
}) => {
  const prefetchStrategy = useSmartPrefetch()
  const { track } = useAnalytics()

  useEffect(() => {
    track("event_viewed", { eventId })
  }, [track, eventId])

  return (
    <Button
      data-testid={dataTestId}
      to={EVENT_VIEW(eventId)}
      linkProps={{ prefetch: prefetchStrategy }}
      onClick={() => track("apply_clicked", { eventId })}
    >
      {eventCardCopy.apply}
    </Button>
  )
}

export const EventCardFooter: FC<EventCardFooterProps> = ({
  is_applied,
  is_invited,
  active_payment_id,
  has_paid,
  eventTitle,
  event_status,
  // googleLink,
  eventId,
  dataTestId,
  isAdmin,
  directApply,
  appliesAsStaff,
}) => {
  const fetcher = useFetcher()
  const { track } = useAnalytics()
  const [cancellationReason, setCancellationReason] = useState("")
  const reasonId = useId()

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      console.error(fetcher.data.error)
    }
  }, [fetcher.data])

  if (isAdmin) {
    return (
      <div className="flex flex-row gap-4 w-full">
        <Button to={ADMIN_VIEW_EVENT(eventId)}>
          <EyeIcon className="h-4 w-4 mr-2" />
          {eventCardCopy.adminView}
        </Button>
      </div>
    )
  }

  const handleDirectApply = async () => {
    track("direct_application_submitted", { eventId })
    await fetcher.submit(
      { fetchId: "handleAdminApply", eventId },
      { method: "POST" },
    )
  }

  const handleConfirmCancel = async (closeDialog: () => void) => {
    track("cancellation_submitted", { eventId })
    await fetcher.submit(
      {
        cancel: true,
        eventId,
        fetchId: "handleConfirmCancel",
        reason: cancellationReason,
      },
      { method: "POST" },
    )
    setCancellationReason("")
    closeDialog()
  }

  const { isClosed, isOpen, isScheduled } = checkEventStatus(event_status)

  if (isScheduled) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        {eventCardCopy.scheduled}
      </Button>
    )
  }

  // Applied users must keep the cancel button after registrations close, which
  // happens automatically once the event reaches its participant limit.
  if (is_applied) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {active_payment_id && (
          <Button
            to={PAYMENT(active_payment_id)}
            onClick={() =>
              track("event_action_clicked", { eventId, action: "pay" })
            }
          >
            {eventCardCopy.payment.pay}
          </Button>
        )}

        {/* TODO: Fix dates & times */}
        {/* <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Adicionar ao Calendário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar ao calendário</DialogTitle>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:justify-between">
              {googleLink && (
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    to={googleLink}
                    linkProps={{ target: "_blank" }}
                  >
                    Google Calendar
                  </Button>
                </DialogClose>
              )}
              <DialogClose asChild>
                <Button
                  variant="outline"
                  to={DOWNLOAD_CALENDAR(eventId)}
                  linkProps={{ reloadDocument: true }}
                >
                  Baixar arquivo iCal
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}

        {has_paid ? (
          <div className="flex flex-col gap-2 w-full">
            <p className="text-sm text-muted-foreground">
              {eventCardCopy.paidCancel.hint}
            </p>
            <Button
              variant="outline"
              to={`https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(eventCardCopy.paidCancel.whatsappMessage(eventTitle))}`}
              linkProps={{ target: "_blank", rel: "noopener noreferrer" }}
              onClick={() =>
                track("event_action_clicked", {
                  eventId,
                  action: "paid_cancel_whatsapp",
                })
              }
            >
              {eventCardCopy.paidCancel.trigger}
            </Button>
          </div>
        ) : (
          <fetcher.Form method="post">
            <ConfirmDialog
              title={eventCardCopy.cancel.title}
              description={
                <div className="flex flex-col gap-4">
                  <p>{eventCardCopy.cancel.description}</p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={reasonId}>
                      {eventCardCopy.cancel.reasonLabel}
                    </Label>
                    <TextArea
                      id={reasonId}
                      name="reason"
                      maxLength={MAX_CANCELLATION_REASON_LENGTH}
                      placeholder={eventCardCopy.cancel.reasonPlaceholder}
                      value={cancellationReason}
                      onChange={(event) =>
                        setCancellationReason(event.target.value)
                      }
                    />
                  </div>
                </div>
              }
              confirmLabel={eventCardCopy.cancel.confirmLabel}
              cancelLabel={eventCardCopy.cancel.cancelLabel}
              isLoading={fetcher.state !== "idle"}
              onConfirm={handleConfirmCancel}
            >
              <ConfirmDialog.Trigger variant="destructive" className="w-full">
                {eventCardCopy.cancel.trigger}
              </ConfirmDialog.Trigger>
            </ConfirmDialog>
          </fetcher.Form>
        )}
      </div>
    )
  }

  // A closed event still opens for staff and for whoever holds an invite to it.
  // What the server does with the application is decided against the database;
  // this only spares them a dead button.
  if (isClosed && !is_invited && !appliesAsStaff) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        {eventCardCopy.closed}
      </Button>
    )
  }

  if (isClosed && is_invited && !appliesAsStaff) {
    return (
      <ApplyButton eventId={eventId} dataTestId={dataTestId} />
    )
  }

  if (isOpen || (isClosed && appliesAsStaff)) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <ApplyButton eventId={eventId} dataTestId={dataTestId} />

        {directApply && (
          <Button
            variant="outline"
            disabled={fetcher.state !== "idle"}
            onClick={handleDirectApply}
          >
            {eventCardCopy.directApply}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Button data-testid={dataTestId} disabled={true}>
      {eventCardCopy.comingSoon}
    </Button>
  )
}
