import { Outlet } from "react-router"
import { FullLayout } from "~/components/layouts/full-layout"

const Layout = () => {
  return (
    <FullLayout>
      <Outlet />
    </FullLayout>
  )
}

export default Layout
