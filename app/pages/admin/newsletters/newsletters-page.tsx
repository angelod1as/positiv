import { EyeIcon, PencilIcon } from "lucide-react"
import { Column } from "primereact/column"
import { getAllNewsletters } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { DataTable } from "~/components/organisms/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { newsletterStatusPropMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Route } from "./+types/newsletters-page"

const {
  admin: {
    newsletters: {
      ADMIN_CREATE_NEWSLETTER,
      ADMIN_EDIT_NEWSLETTER,
      ADMIN_VIEW_NEWSLETTER,
    },
  },
} = paths

export async function loader({}: Route.LoaderArgs) {
  const newslettersResult = await getAllNewsletters()
  const newsletters = newslettersResult.success ? newslettersResult.data : []

  return { newsletters }
}

const NewslettersPage = ({ loaderData }: Route.ComponentProps) => {
  const { newsletters } = loaderData
  return (
    <div>
      <h2>Newsletters</h2>
      <Button to={ADMIN_CREATE_NEWSLETTER} className="mb-4">
        Nova newsletter
      </Button>
      {newsletters.length > 0 ? (
        <DataTable
          value={newsletters}
          id="newsletters"
          sortField="created_at"
          buttons={[
            {
              Icon: EyeIcon,
              to: ADMIN_VIEW_NEWSLETTER,
              title: "Ver newsletter",
              key: "id",
            },
            {
              Icon: PencilIcon,
              to: ADMIN_EDIT_NEWSLETTER,
              title: "Editar newsletter",
              key: "id",
            },
          ]}
        >
          <Column
            field="status"
            header="Status"
            body={(values) => newsletterStatusPropMap(values.status)}
          />
          <Column field="subject" header="Assunto" />
          <Column
            field="created_at"
            header="📅 Criação"
            body={(values) => {
              return formatDateTime(values.created_at).date
            }}
          />
          <Column
            field="sent_at"
            header="📅 Envio"
            body={(values) => {
              return values.sent_at
                ? formatDateTime(values.created_at).date
                : undefined
            }}
          />
        </DataTable>
      ) : (
        <p>Nenhuma newsletter encontrada</p>
      )}
    </div>
  )
}

export default NewslettersPage
