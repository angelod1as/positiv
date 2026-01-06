import { composable } from "composable-functions"
import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { kyselyDb } from "~/kysely-db"
import { mapParticipantsToDownloadFormat } from "~/lib/helpers/download-helpers"
import { downloadXLSX } from "~/lib/helpers/download-xlsx"
import { getWillGoToEventParticipants } from "~/lib/helpers/get-filtered-participants"
import { mapToString } from "~/lib/helpers/map-string-array-to-string"
import { eventParticipantPropMap, profilePropMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { EventParticipant, Profile } from "~types/database/entities.types"
import type { Route } from "./+types/download-data"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)

  if (!params.id) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }

  const result = await composable(async () => {
    return kyselyDb
      .selectFrom("event_participants as ep")
      .innerJoin("profiles as p", "p.id", "ep.profile_id")
      .selectAll(["ep", "p"])
      .where("ep.event_id", "=", params.id)
      .where("ep.is_user_applied", "=", true)
      .execute()
  })()

  if (!result.success) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      "Erro ao buscar participantes do evento",
    )
  }

  return { participants: result.data }
}

const AdminDownloadEventParticipants = ({
  loaderData,
}: Route.ComponentProps) => {
  const { participants } = loaderData

  const handleDownloadAll = async () => {
    const xlsxData = participants.map(mapToString).map((participant) => {
      return Object.entries(participant)
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([key, value]) => {
          if (profilePropMap(key as keyof Profile)) {
            return [profilePropMap(key as keyof Profile), value]
          }

          if (eventParticipantPropMap(key as keyof EventParticipant)) {
            return [
              eventParticipantPropMap(key as keyof EventParticipant),
              value,
            ]
          }
          return undefined
        })
        .reduce((prev, curr) => {
          if (!curr) return prev
          return {
            ...prev,
            [curr[0]]: curr[1],
          }
        }, {})
    })
    downloadXLSX(xlsxData)
  }

  const handleDownloadNames = async () => {
    const filteredParticipants =
      getWillGoToEventParticipants(participants).participants
    const xlsxData = mapParticipantsToDownloadFormat(filteredParticipants)
    downloadXLSX(xlsxData)
  }

  return (
    <div>
      <Button onClick={handleDownloadAll}>
        Baixar tabela (Todos os dados)
      </Button>
      <Button onClick={handleDownloadNames}>Baixar tabela (Nomes e RG)</Button>
    </div>
  )
}

export default AdminDownloadEventParticipants
