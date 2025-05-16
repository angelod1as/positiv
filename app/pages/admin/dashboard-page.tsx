import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_CREATE_EVENT },
  },
} = paths

const AdminDashboard = () => {
  return (
    <>
      <Button to={ADMIN_CREATE_EVENT}>Criar novo evento</Button>
    </>
  )
}

export default AdminDashboard
