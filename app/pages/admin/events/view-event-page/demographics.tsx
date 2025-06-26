import type { FC } from "react"
import type { Demographics } from "~/business/admin/utils/demographics"
import { DataPair } from "~/components/atoms/data-pair/data-pair"

type DemographicsProps = {
  demographics: Demographics
}
export const DemographicsData: FC<DemographicsProps> = ({
  demographics,
}: DemographicsProps) => {
  const { total, veteran, gender, age, orientation } = demographics
  return (
    <>
      <h2>Demographics</h2>
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
