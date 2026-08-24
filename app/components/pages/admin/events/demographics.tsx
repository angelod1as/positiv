import { useState, type FC } from "react"
import { useNavigate, useRevalidator } from "react-router"
import { toast } from "sonner"
import type { Demographics } from "~/business/admin/demographics/demographics"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { Button } from "~/components/ui/button"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"

const {
  admin: {
    events: { ADMIN_EVENT_DEMOGRAPHICS_COMMIT },
  },
} = paths

const demographicsCopy = adminEventsCopy.demographics

type DemographicsProps = {
  demographics: Demographics | null
  eventId?: string
}
export const DemographicsData: FC<DemographicsProps> = ({
  demographics,
  eventId,
}: DemographicsProps) => {
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const [isUpdating, setIsUpdating] = useState(false)

  const countAgain = async () => {
    if (!eventId) return

    setIsUpdating(true)

    // A count that never reached the server throws rather than answering, and
    // either way the numbers on screen are the ones the loader last gave.
    const result = await commitJson(
      ADMIN_EVENT_DEMOGRAPHICS_COMMIT(eventId),
      {},
      (pathname) => void navigate(pathname),
    ).catch((): CommitResult => ({ ok: false, errors: [] }))

    setIsUpdating(false)

    if (result.ok) {
      toast.success(adminEventsCopy.toasts.demographicsUpdated)
    } else {
      toast.error(
        result.message ?? adminEventsCopy.toasts.demographicsUpdateFailed,
      )
    }

    // Read again on a refusal too: the count is written before the page can
    // show it, and a refusal is the likeliest moment for this page to be
    // holding an event that has moved on without it.
    void revalidator.revalidate()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2>{demographicsCopy.title}</h2>
        {eventId && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUpdating}
            onClick={() => void countAgain()}
          >
            {isUpdating ? demographicsCopy.updating : demographicsCopy.update}
          </Button>
        )}
      </div>
      {demographics ? (
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-5">
          <div>
            <h4>{demographicsCopy.general.title}</h4>
            <DataPair
              suffix={demographicsCopy.suffixes.participants}
              pair={[demographicsCopy.general.total, demographics.total]}
            />
            <DataPair
              suffix="%"
              pair={[demographicsCopy.general.veterans, demographics.veteran.yes]}
            />
            <DataPair
              suffix="%"
              pair={[demographicsCopy.general.rookies, demographics.veteran.no]}
            />
          </div>
          <div>
            <h4>{demographicsCopy.gender.title}</h4>
            <DataPair
              suffix="%"
              pair={[demographicsCopy.gender.cis, demographics.gender.cis]}
            />
            <DataPair
              suffix="%"
              pair={[demographicsCopy.gender.trans, demographics.gender.trans]}
            />
            {!!demographics.gender.other.percentage && (
              <>
                <DataPair
                  suffix="%"
                  pair={[
                    demographicsCopy.gender.others,
                    demographics.gender.other.percentage,
                  ]}
                />
                {demographicsCopy.othersSeparator}
                {demographics.gender.other.values?.join(", ")}
              </>
            )}
          </div>
          <div>
            <h4>{demographicsCopy.orientation.title}</h4>
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.orientation.straight,
                demographics.orientation.straight,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.orientation.biPan,
                demographics.orientation.biPan,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.orientation.homo,
                demographics.orientation.homo,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.orientation.aceDemi,
                demographics.orientation.aceDemi,
              ]}
            />
            {!!demographics.orientation.other.percentage && (
              <>
                <DataPair
                  suffix="%"
                  pair={[
                    demographicsCopy.orientation.others,
                    demographics.orientation.other.percentage,
                  ]}
                />
                {demographicsCopy.othersSeparator}
                {demographics.orientation.other.values?.join(", ")}
              </>
            )}
          </div>
          <div>
            <h4>{demographicsCopy.raceColor.title}</h4>
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.raceColor.yellow,
                demographics.race_color.yellow,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.raceColor.white,
                demographics.race_color.white,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.raceColor.indigenous,
                demographics.race_color.indigenous,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.raceColor.brown,
                demographics.race_color.brown,
              ]}
            />
            <DataPair
              suffix="%"
              pair={[
                demographicsCopy.raceColor.black,
                demographics.race_color.black,
              ]}
            />
            {!!demographics.race_color.other.percentage && (
              <>
                <DataPair
                  suffix="%"
                  pair={[
                    demographicsCopy.raceColor.others,
                    demographics.race_color.other.percentage,
                  ]}
                />
                {demographicsCopy.othersSeparator}
                {demographics.race_color.other.values?.join(", ")}
              </>
            )}
          </div>
          <div>
            <h4>{demographicsCopy.age.title}</h4>
            <DataPair
              suffix={demographicsCopy.suffixes.years}
              pair={[demographicsCopy.age.min, demographics.age.min]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.years}
              pair={[demographicsCopy.age.average, demographics.age.average]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.years}
              pair={[demographicsCopy.age.max, demographics.age.max]}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {demographicsCopy.empty}
        </div>
      )}
    </>
  )
}
