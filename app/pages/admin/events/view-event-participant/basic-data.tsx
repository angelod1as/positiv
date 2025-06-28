import { type FC } from "react"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { phoneToButton } from "~/lib/helpers/phone-to-button"
import { profilePropMap } from "~/lib/helpers/propMaps"
import type { Profile } from "~types/entities.types"

const getAge = (date_of_birth: string | null) => {
  if (!date_of_birth) return ""
  const date = new Date(date_of_birth)
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()

  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }

  return age
}

type BasicDataProps = { profile: Profile }
export const BasicData: FC<BasicDataProps> = ({ profile }) => {
  const {
    full_name,
    cpf,
    date_of_birth,
    email,
    gender,
    how_came_to_us,
    is_veteran,
    orientation,
    phone,
    pronouns,
    rg,
    rg_issuer,
    social_name,
    where_lives,
  } = profile

  return (
    <>
      <h2>Dados básicos</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3>
            <b>{social_name}</b> ({full_name}), {getAge(date_of_birth)}
          </h3>
          <p>{is_veteran ? "Veterane" : "Novate"}</p>
          <p>
            {gender?.join(", ")}; {pronouns?.join(", ")};{" "}
            {orientation?.join(", ")}{" "}
          </p>
          <div>{phoneToButton(phone)}</div>
        </div>
        <div className="space-y-2">
          <DataPair top pair={[profilePropMap("email"), email]} />
          <DataPair top pair={[profilePropMap("rg"), `${rg} ${rg_issuer}`]} />
          <DataPair top pair={[profilePropMap("cpf"), cpf]} />
          <DataPair top pair={[profilePropMap("where_lives"), where_lives]} />
          <DataPair
            top
            pair={[profilePropMap("how_came_to_us"), how_came_to_us]}
          />
        </div>
      </div>
    </>
  )
}
