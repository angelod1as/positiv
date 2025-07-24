import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { Demographics } from "~/business/admin/utils/demographics"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { Button } from "~/components/ui/button"

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
      {demographics ? (
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-4">
          <div>
            <h4>Geral</h4>
            <DataPair suffix=" participantes" pair={["Total", demographics.total]} />
            <DataPair suffix="%" pair={["Veteranes", demographics.veteran.yes]} />
            <DataPair suffix="%" pair={["Novates", demographics.veteran.no]} />
          </div>
          <div>
            <h4>Gênero</h4>
            <DataPair suffix="%" pair={["Cis", demographics.gender.cis]} />
            <DataPair suffix="%" pair={["Trans", demographics.gender.trans]} />
            <DataPair suffix="%" pair={["Agênere", demographics.gender.agender]} />
            {!!demographics.gender.other.percentage && (
              <>
                <DataPair suffix="%" pair={["Outros", demographics.gender.other.percentage]} />{" "}
                - {demographics.gender.other.values?.join(", ")}
              </>
            )}
          </div>
          <div>
            <h4>Orientação</h4>
            <DataPair suffix="%" pair={["Héteres", demographics.orientation.straight]} />
            <DataPair suffix="%" pair={["Bi/Pan", demographics.orientation.biPan]} />
            <DataPair suffix="%" pair={["Homo", demographics.orientation.homo]} />
            <DataPair suffix="%" pair={["Ace/Demi", demographics.orientation.aceDemi]} />
            {!!demographics.orientation.other.percentage && (
              <>
                <DataPair
                  suffix="%"
                  pair={["Outros", demographics.orientation.other.percentage]}
                />{" "}
                - {demographics.orientation.other.values?.join(", ")}
              </>
            )}
          </div>
          <div>
            <h4>Idades</h4>
            <DataPair suffix=" anos" pair={["Menor", demographics.age.min]} />
            <DataPair suffix=" anos" pair={["Média", demographics.age.average]} />
            <DataPair suffix=" anos" pair={["Maior", demographics.age.max]} />
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Não há dados demográficos. Clique em 'Atualizar Demografia' para calcular.
        </div>
      )}
    </>
  )
}
