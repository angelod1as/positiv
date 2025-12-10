import { Outlet } from "react-router"
import { CenteredLayout } from "~/components/layouts/centered-layout"

const Layout = () => {
  return (
    <CenteredLayout>
      <Outlet />
    </CenteredLayout>
  )
}

export default Layout
