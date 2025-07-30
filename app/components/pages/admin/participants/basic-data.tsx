import { type FC } from "react"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import {
  GenderWarning,
  OrientationWarning,
  RookieBadge,
  VeteranBadge,
} from "~/components/atoms/badges/badges"
import { FlagBadge } from "~/components/atoms/badges/flag-badge"
import { DataPair } from "~/components/atoms/data-pair/data-pair"

import { PhoneButton } from "~/lib/helpers/phone-to-button"
import { profilePropMap } from "~/lib/helpers/propMaps"
import { AddToGoogleContactsButton } from "~/components/atoms/buttons/add-to-google-contacts-button"

type BasicDataProps = { profile: ProfileWithExtraData }
export const BasicData: FC<BasicDataProps> = ({ profile }) => {
  const {
    full_name,
    social_name,
    cpf,
    email,
    gender,
    how_came_to_us,
    is_veteran,
    orientation,
    phone,
    pronouns,
    rg,
    rg_issuer,
    where_lives,
    was_admin_skipped_last_event,
    flag,
    flag_notes,
  } = profile

  return (
    <>
      <h2>Dados básicos</h2>

      <div className="grid md:grid-cols-4 gap-4 [&>div]:space-y-2">
        <div className="col-span-2">
          <div className="flex gap-2 flex-wrap">
            <PhoneButton phone={phone} />
            <AddToGoogleContactsButton
              profile={{
                social_name,
                full_name,
                gender,
                pronouns,
              }}
              email={email}
              phone={phone}
            />
          </div>
          <p>{full_name}</p>
          <div className="flex gap-3">
            {is_veteran ? <VeteranBadge /> : <RookieBadge />}
            <FlagBadge flag={flag} flagNotes={flag_notes} />
            {pronouns?.join(", ")}
            <GenderWarning genders={gender} />
            <OrientationWarning orientations={orientation} />
          </div>
          {was_admin_skipped_last_event && (
            <div className="mt-2">
              Essa pessoa <b className="text-red-600">participou do rodízio</b>{" "}
              no último evento
            </div>
          )}
        </div>
        <div>
          <DataPair top pair={[profilePropMap("email"), email]} />
          <DataPair top pair={[profilePropMap("rg"), `${rg} ${rg_issuer}`]} />
          <DataPair top pair={[profilePropMap("cpf"), cpf]} />
        </div>
        <div>
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
