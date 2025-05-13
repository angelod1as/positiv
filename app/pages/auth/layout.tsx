import { Outlet } from "react-router"
import PositivWhite from "~/assets/brand/positiv-logo-white.png"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"

const {
  root: { HOME },
} = paths

const Layout = () => {
  return (
    <div className="grid lg:grid-cols-2 grow">
      <div className="relative hidden bg-muted bg-image lg:flex justify-center items-center">
        <Link to={HOME} variant="unstyled">
          <img src={PositivWhite} alt="Positiv Logo" width={300} />
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout
