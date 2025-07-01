import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { downloadXLSX } from "~/lib/helpers/download-xlsx"
import { mapToString } from "~/lib/helpers/map-string-array-to-string"
import paths from "~/lib/paths"
import type { Route } from "./+types/download-data"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) {
    return redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  const { supabase } = await getAdminContext(request, params)

  const query = supabase
    .from("event_participants")
    .select(
      `
      ...profiles (
        email,
        full_name,
        social_name,
        pronouns,
        rg,
        rg_issuer,
        cpf,
        phone,
        date_of_birth,
        gender,
        orientation,
        where_lives,
        how_came_to_us
      ),
      application_status,
      attendance_status,
      has_paid,
      payment,
      notes,
      referrals,
      companions,
      bond
      `,
    )
    .eq("event_id", params.id)
    .eq("is_user_applied", true)

  const { data, error } = await query

  if (error) {
    throw new Error("Ocorreu um erro buscando participantes")
  }

  return { participants: data }
}

const AdminDownloadEventParticipants = ({
  loaderData,
}: Route.ComponentProps) => {
  const { participants } = loaderData

  const handleDownloadAll = async () => {
    const xlsxData = participants.map(mapToString).map((participant) => {
      return {
        "Nome Completo": participant.full_name,
        "Nome Social": participant.social_name,
        Pronomes: participant.pronouns,
        "E-mail": participant.email,
        RG: participant.rg,
        "Emissor do RG": participant.rg_issuer,
        CPF: participant.cpf,
        Telefone: participant.phone,
        Whatsapp: participant.phone && `https://wa.me/55${participant.phone}`,
        "Data de Nascimento": participant.date_of_birth,
        Gênero: participant.gender,
        Orientação: participant.orientation,
        "Onde mora": participant.where_lives,
        "Como veio à nós": participant.how_came_to_us,
        Processo: participant.application_status,
        Status: participant.attendance_status,
        "Pago?": participant.has_paid,
        "Valor pago": participant.payment,
        Notas: participant.notes,
        Indicações: participant.referrals,
        "Vai acompanhade?": participant.companions,
        "Pode ir só?": participant.bond,
      }
    })
    downloadXLSX(xlsxData)
    // toast.success("Documento baixado com sucesso")
  }

  const handleDownloadNames = async () => {
    const xlsxData = participants.map(
      ({ full_name, rg, rg_issuer, social_name }) => ({
        "Nome completo": full_name,
        "Nome social": social_name,
        RG: rg,
        Emissor: rg_issuer,
      }),
    )
    downloadXLSX(xlsxData)
    // toast.success("Documento baixado com sucesso")
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
