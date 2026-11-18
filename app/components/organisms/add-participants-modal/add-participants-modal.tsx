import { useEffect, useId, useState, type FC } from "react"
import type { DirectAdditionOutcome } from "~/business/application/add-participants-directly.server"
import type { InviteSearchResult } from "~/business/reporting/search-profiles.server"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { adminAddParticipantsCopy } from "~/copy/admin/add-participants"
import { adminPropMapsCopy } from "~/copy/admin/prop-maps"
import paths from "~/lib/paths"
import { Constants, type Database } from "~/types/database/database.types"

const { modal } = adminAddParticipantsCopy
const {
  admin: {
    events: { ADMIN_EVENT_ADD_PARTICIPANTS_COMMIT },
  },
} = paths

type SpotType = Database["public"]["Enums"]["spot_type"]

type Selection = { profileId: string; name: string; spotType: SpotType }

type Outcome = { profileId: string; outcome: DirectAdditionOutcome }

export type AddParticipantsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onAdded: () => void
}

const displayName = (person: {
  full_name: string | null
  social_name: string | null
}) => person.social_name || person.full_name || ""

const SEARCH_DEBOUNCE_MS = 300

const post = (body: Record<string, unknown>, signal?: AbortSignal) =>
  fetch(ADMIN_EVENT_ADD_PARTICIPANTS_COMMIT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

export const AddParticipantsModal: FC<AddParticipantsModalProps> = ({
  open,
  onOpenChange,
  eventId,
  onAdded,
}) => {
  const resultsHeadingId = useId()
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<InviteSearchResult[]>([])
  const [selection, setSelection] = useState<Selection[]>([])
  const [outcomes, setOutcomes] = useState<
    { profileId: string; name: string; outcome: DirectAdditionOutcome }[]
  >([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Same debounce and abort as the invite search: one request per pause, and
  // a slow answer to an older term never replaces the newer one.
  useEffect(() => {
    if (!term.trim()) {
      setResults([])
      return
    }

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const response = await post(
          { intent: "search", eventId, term },
          controller.signal,
        )
        const data = (await response.json()) as {
          results?: InviteSearchResult[]
        }
        if (!controller.signal.aborted) setResults(data.results ?? [])
      } catch {
        if (!controller.signal.aborted) setResults([])
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, eventId])

  const selectedIds = new Set(selection.map((person) => person.profileId))

  const select = (person: InviteSearchResult) =>
    setSelection((current) => [
      ...current,
      { profileId: person.id, name: displayName(person), spotType: "regular" },
    ])

  const unselect = (profileId: string) =>
    setSelection((current) =>
      current.filter((person) => person.profileId !== profileId),
    )

  const changeSpotType = (profileId: string, spotType: SpotType) =>
    setSelection((current) =>
      current.map((person) =>
        person.profileId === profileId ? { ...person, spotType } : person,
      ),
    )

  const submit = async () => {
    setIsBusy(true)
    setError(null)
    setOutcomes([])

    try {
      const response = await post({
        intent: "add",
        eventId,
        people: selection.map(({ profileId, spotType }) => ({
          profileId,
          spotType,
        })),
      })
      const data = (await response.json()) as {
        ok: boolean
        error?: string
        outcomes?: Outcome[]
      }

      if (!response.ok || !data.ok || !data.outcomes) {
        setError(data.error ?? modal.failed)
        return
      }

      const names = new Map(
        selection.map((person) => [person.profileId, person.name]),
      )
      setOutcomes(
        data.outcomes.map(({ profileId, outcome }) => ({
          profileId,
          name: names.get(profileId) ?? "",
          outcome,
        })),
      )
      setSelection([])
      // The results were read before the addition; whoever was just added
      // would still look selectable.
      setTerm("")
      setResults([])
      onAdded()
    } catch {
      setError(modal.failed)
    } finally {
      setIsBusy(false)
    }
  }

  const changeOpen = (next: boolean) => {
    if (!next) {
      setTerm("")
      setSelection([])
      setOutcomes([])
      setError(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modal.title}</DialogTitle>
          <DialogDescription>{modal.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="add-participants-search">{modal.searchLabel}</Label>
          <Input
            id="add-participants-search"
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
                disabled={
                  Boolean(person.is_participant) ||
                  selectedIds.has(person.id) ||
                  isBusy
                }
                onClick={() => select(person)}
              >
                {person.is_participant
                  ? modal.alreadyParticipant
                  : selectedIds.has(person.id)
                    ? modal.selected
                    : modal.select}
              </Button>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-2">
          <h3>{modal.selectedTitle}</h3>
          {selection.length === 0 ? (
            <p className="text-sm">{modal.noneSelected}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selection.map((person) => (
                <li
                  key={person.profileId}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{person.name}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={person.spotType}
                      onValueChange={(value) =>
                        changeSpotType(person.profileId, value as SpotType)
                      }
                      disabled={isBusy}
                    >
                      <SelectTrigger
                        aria-label={modal.spotTypeLabel(person.name)}
                        className="w-32"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.spot_type.map((spotType) => (
                          <SelectItem key={spotType} value={spotType}>
                            {adminPropMapsCopy.spotType[spotType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={modal.remove(person.name)}
                      disabled={isBusy}
                      onClick={() => unselect(person.profileId)}
                    >
                      {modal.removeShort}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          disabled={selection.length === 0 || isBusy}
          onClick={submit}
        >
          {modal.submit(selection.length)}
        </Button>

        {outcomes.length > 0 ? (
          <section
            aria-labelledby={resultsHeadingId}
            className="flex flex-col gap-2"
          >
            <h3 id={resultsHeadingId}>{modal.resultsTitle}</h3>
            <ul>
              {outcomes.map(({ profileId, name, outcome }) => (
                <li key={profileId}>
                  {modal.outcomeLine(name, modal.outcome[outcome])}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
