import { getAllNewsletters } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { DataTable } from "~/components/organisms/data-table"
import paths from "~/lib/paths"
import type { Route } from "./+types/newsletters-page"

const {
  admin: {
    newsletters: { ADMIN_CREATE_NEWSLETTER },
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
        <DataTable value={newsletters} id="newsletters">
          {/* TODO COLUMNS */}
          <div>Columns</div>
        </DataTable>
      ) : (
        <p>Nenhuma newsletter encontrada</p>
      )}
    </div>
  )
}

export default NewslettersPage
