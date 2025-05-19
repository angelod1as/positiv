import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { Route } from "./+types/dashboard-page"

const {
  admin: {
    events: { ADMIN_EVENTS },
  },
} = paths

const AdminDashboard = ({}: Route.ComponentProps) => {
  return (
    <>
      <Button to={ADMIN_EVENTS}>Ver eventos</Button>
      <Button to="" disabled>
        Ver participantes (em breve)
      </Button>
    </>
  )
}

export default AdminDashboard
