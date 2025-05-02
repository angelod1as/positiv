import { Outlet } from "react-router"

const Layout = () => {
  return (
    <div className="self-center flex flex-col h-full max-w-2xl w-full gap-8 mb-12 mx-4 py-8">
      <Outlet />
    </div>
  )
}

export default Layout
