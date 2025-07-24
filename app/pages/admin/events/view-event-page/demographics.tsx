import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { Demographics } from "~/business/admin/utils/demographics"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { Button } from "~/components/ui/button"

type DemographicsProps = {
  demographics: Demographics
  fetcher?: FetcherWithComponents<unknown>
  eventId?: string
}
export const DemographicsData: FC<DemographicsProps> = ({
  demographics,
  fetcher,
  eventId,
}: DemographicsProps) => {
  const { total, veteran, gender, age, orientation } = demographics
  
  const isUpdating = fetcher?.state === "submitting" && 
    fetcher?.formData?.get("intent") === "update-demographics"
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h2>Demographics</h2>
        {fetcher && eventId && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="update-demographics" />
            <Button 
              type="submit" 
              variant="secondary"
              size="sm"
              disabled={isUpdating}
            >
              {isUpdating ? "Atualizando..." : "Atualizar Demografia"}
            </Button>
          </fetcher.Form>
        )}
      </div>
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-4">
        <div>
          <h4>Geral</h4>
          <DataPair suffix=" participantes" pair={["Total", total]} />
          <DataPair suffix="%" pair={["Veteranes", veteran.yes]} />
          <DataPair suffix="%" pair={["Novates", veteran.no]} />
        </div>
        <div>
          <h4>Gênero</h4>
          <DataPair suffix="%" pair={["Cis", gender.cis]} />
          <DataPair suffix="%" pair={["Trans", gender.trans]} />
          <DataPair suffix="%" pair={["Agênere", gender.agender]} />
          {!!gender.other.percentage && (
            <>
              <DataPair suffix="%" pair={["Outros", gender.other.percentage]} />{" "}
              - {gender.other.values?.join(", ")}
            </>
          )}
        </div>
        <div>
          <h4>Orientação</h4>
          <DataPair suffix="%" pair={["Héteres", orientation.straight]} />
          <DataPair suffix="%" pair={["Bi/Pan", orientation.biPan]} />
          <DataPair suffix="%" pair={["Homo", orientation.homo]} />
          <DataPair suffix="%" pair={["Ace/Demi", orientation.aceDemi]} />
          {!!orientation.other.percentage && (
            <>
              <DataPair
                suffix="%"
                pair={["Outros", orientation.other.percentage]}
              />{" "}
              - {orientation.other.values?.join(", ")}
            </>
          )}
        </div>
        <div>
          <h4>Idades</h4>
          <DataPair suffix=" anos" pair={["Menor", age.min]} />
          <DataPair suffix=" anos" pair={["Média", age.average]} />
          <DataPair suffix=" anos" pair={["Maior", age.max]} />
        </div>
      </div>
    </>
  )
}
