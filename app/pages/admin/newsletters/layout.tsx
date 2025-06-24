import { Outlet } from "react-router"
import { CenteredLayout } from "~/components/layouts/centered-layout"

/**
 * Layout for newsletters admin section
 */
const NewslettersLayout = () => (
  <CenteredLayout>
    <Outlet />
  </CenteredLayout>
)

export default NewslettersLayout
