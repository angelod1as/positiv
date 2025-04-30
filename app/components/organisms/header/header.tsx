import PositivLogo from "~/assets/brand/positiv-logo-colors.png"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"

const { HOME } = paths.root

export const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 sticky top-[.5rem] md:top-[.75rem] z-30 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-[1.75rem]">
      <div className="text-xl font-bold">
        <Link variant="unstyled" to={HOME}>
          <img
            alt="Logo Positiv"
            src={PositivLogo}
            className="w-auto px-2 py-1 rounded-lg max-h-8"
          />
        </Link>
      </div>
      <div className="flex items-center space-x-2">
        {/* TODO: After setting up login */}
        {/* <HeaderAccountData /> */}
      </div>
    </header>
  )
}
