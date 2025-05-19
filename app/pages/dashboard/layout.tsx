import { Outlet } from "react-router"

const Layout = () => {
  return (
    <div className="px-4 lg:px-8 pb-4 flex flex-col gap-12 mb-12 py-8">
      <Outlet />
    </div>
  )
}

export default Layout
