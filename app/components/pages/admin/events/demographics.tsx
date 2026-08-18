import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { Demographics } from "~/business/admin/demographics/demographics"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { Button } from "~/components/ui/button"
import { adminEventsCopy } from "~/copy/admin/events"

const demographicsCopy = adminEventsCopy.demographics

type DemographicsProps = {
  demographics: Demographics | null
  fetcher?: FetcherWithComponents<unknown>
  eventId?: string
}
export const DemographicsData: FC<DemographicsProps> = ({
  demographics,
  fetcher,
  eventId,
}: DemographicsProps) => {
  const isUpdating =
    fetcher?.state === "submitting" &&
    fetcher?.formData?.get("intent") === "update-demographics"

  return (
    <>
      <div className="flex items-center justify-between">
        <h2>{demographicsCopy.title}</h2>
        {fetcher && eventId && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="update-demographics" />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isUpdating}
            >
              {isUpdating ? demographicsCopy.updating : demographicsCopy.update}
            </Button>
          </fetcher.Form>
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
              suffix={demographicsCopy.suffixes.percentage}
              pair={[demographicsCopy.general.veterans, demographics.veteran.yes]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[demographicsCopy.general.rookies, demographics.veteran.no]}
            />
          </div>
          <div>
            <h4>{demographicsCopy.gender.title}</h4>
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[demographicsCopy.gender.cis, demographics.gender.cis]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[demographicsCopy.gender.trans, demographics.gender.trans]}
            />
            {!!demographics.gender.other.percentage && (
              <>
                <DataPair
                  suffix={demographicsCopy.suffixes.percentage}
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
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.orientation.straight,
                demographics.orientation.straight,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.orientation.biPan,
                demographics.orientation.biPan,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.orientation.homo,
                demographics.orientation.homo,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.orientation.aceDemi,
                demographics.orientation.aceDemi,
              ]}
            />
            {!!demographics.orientation.other.percentage && (
              <>
                <DataPair
                  suffix={demographicsCopy.suffixes.percentage}
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
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.raceColor.yellow,
                demographics.race_color.yellow,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.raceColor.white,
                demographics.race_color.white,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.raceColor.indigenous,
                demographics.race_color.indigenous,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.raceColor.brown,
                demographics.race_color.brown,
              ]}
            />
            <DataPair
              suffix={demographicsCopy.suffixes.percentage}
              pair={[
                demographicsCopy.raceColor.black,
                demographics.race_color.black,
              ]}
            />
            {!!demographics.race_color.other.percentage && (
              <>
                <DataPair
                  suffix={demographicsCopy.suffixes.percentage}
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
