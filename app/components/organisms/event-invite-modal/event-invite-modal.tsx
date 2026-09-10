import { useCallback, useEffect, useState, type FC } from "react"
import type { EventInviteRow } from "~/business/admin/event-invites.server"
import type { InviteSearchResult } from "~/business/admin/search-profiles.server"
import { Button } from "~/components/atoms/button/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { adminInvitesCopy } from "~/copy/admin/invites"
import paths from "~/lib/paths"

const { modal } = adminInvitesCopy
const {
  root: { INVITE },
  admin: {
    events: { ADMIN_EVENT_INVITE_COMMIT },
  },
} = paths

export type InviteModalParticipant = {
  id: string
  full_name: string | null
  social_name: string | null
}

export type EventInviteModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  invites: EventInviteRow[]
  participants: InviteModalParticipant[]
}

const displayName = (person: {
  full_name: string | null
  social_name: string | null
}) => person.social_name || person.full_name || ""

const inviteUrl = (token: string) =>
  typeof window === "undefined"
    ? INVITE(token)
    : `${window.location.origin}${INVITE(token)}`

const statusOf = (invite: EventInviteRow) => {
  if (invite.revoked_at) return modal.status.revoked
  if (invite.used_at) return modal.status.used
  return modal.status.created
}

const SEARCH_DEBOUNCE_MS = 300

export const EventInviteModal: FC<EventInviteModalProps> = ({
  open,
  onOpenChange,
  eventId,
  invites,
  participants,
}) => {
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<InviteSearchResult[]>([])
  const [currentInvites, setCurrentInvites] = useState(invites)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => setCurrentInvites(invites), [invites])

  // The admin types a name, not a query: waiting out the typing keeps this to
  // one request per pause instead of one per letter.
  useEffect(() => {
    if (!term.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const response = await fetch(ADMIN_EVENT_INVITE_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "search", eventId, term }),
      })
      const data = (await response.json()) as {
        ok: boolean
        results?: InviteSearchResult[]
      }
      setResults(data.results ?? [])
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [term, eventId])

  const send = useCallback(async (body: Record<string, unknown>) => {
    setIsBusy(true)
    const response = await fetch(ADMIN_EVENT_INVITE_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as {
      ok: boolean
      invites?: EventInviteRow[]
    }
    if (data.invites) setCurrentInvites(data.invites)
    setIsBusy(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modal.title}</DialogTitle>
          <DialogDescription>{modal.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-search">{modal.searchLabel}</Label>
          <Input
            id="invite-search"
            value={term}
            placeholder={modal.searchPlaceholder}
            onChange={(event) => setTerm(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">{modal.searchHelp}</p>
        </div>

        {term.trim() && results.length === 0 ? (
          <p className="text-sm">{modal.noResults}</p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {results.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between gap-4"
            >
              <span>{displayName(person)}</span>
              <Button
                size="sm"
                disabled={Boolean(person.is_participant) || isBusy}
                onClick={() =>
                  send({ intent: "create", eventId, profileId: person.id })
                }
              >
                {person.is_participant
                  ? modal.alreadyParticipant
                  : modal.invite}
              </Button>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-2">
          <h3>{modal.invitesTitle}</h3>
          {currentInvites.length === 0 ? (
            <p className="text-sm">{modal.noInvites}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {currentInvites.map((invite) => (
                <li key={invite.id} className="flex flex-col gap-1">
                  <span>
                    {modal.inviteLine(displayName(invite), statusOf(invite))}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      data-testid="invite-link"
                      value={inviteUrl(invite.token)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(inviteUrl(invite.token))
                      }
                    >
                      {modal.copy}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={Boolean(invite.revoked_at) || isBusy}
                      onClick={() =>
                        send({ intent: "revoke", eventId, inviteId: invite.id })
                      }
                    >
                      {modal.revoke}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3>{modal.participantsTitle}</h3>
          {participants.length === 0 ? (
            <p className="text-sm">{modal.noParticipants}</p>
          ) : (
            <ul>
              {participants.map((person) => (
                <li key={person.id}>{displayName(person)}</li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}
