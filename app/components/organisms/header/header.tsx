import { CalendarIcon, Table2Icon, UserIcon } from "lucide-react"
import type { FC } from "react"
import { useLocation } from "react-router"
import PositivLogo from "~/assets/brand/positiv-logo-colors.png"
import { Button } from "~/components/atoms/button/button"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"
import type { ProfileWithRoles } from "~types/entities.types"

const {
  root: { HOME },
  auth: { LOGIN },
  dash: {
    DASHBOARD,
    account: { ACCOUNT },
  },
  admin: { ADMIN_DASHBOARD },
} = paths

type HeaderProps = {
  profile: ProfileWithRoles | null
  userEmail?: string | null
}

export const Header: FC<HeaderProps> = ({ profile, userEmail }) => {
  const { pathname } = useLocation()

  const showButton = pathname !== "/entrar"
  const displayName = profile
    ? profile.social_name || profile.full_name || profile.email
    : userEmail || undefined
  const isAdmin = profile?.is_admin
  const showButtons = profile || userEmail

  return (
    <header className="flex items-center justify-between p-4 fixed top-0 left-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-[1.75rem]">
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
        {showButton &&
          (showButtons ? (
            <div className="flex items-center space-x-2">
              {!!displayName && (
                <p className="hidden sm:block">Olá, {displayName}</p>
              )}
              <Button
                asChild
                variant="outline"
                title="Dashboard"
                to={DASHBOARD}
              >
                <CalendarIcon />
              </Button>
              {isAdmin && (
                <Button
                  asChild
                  variant="outline"
                  title="Dashboard"
                  to={ADMIN_DASHBOARD}
                >
                  <Table2Icon />
                </Button>
              )}
              <Button asChild variant="outline" title="Conta" to={ACCOUNT}>
                <UserIcon />
              </Button>
            </div>
          ) : (
            <Button to={LOGIN}>Entrar</Button>
          ))}
      </div>
    </header>
  )
}
