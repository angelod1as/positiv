import { useQueryClient } from "@tanstack/react-query"
import { CalendarIcon, Table2Icon, UserIcon } from "lucide-react"
import type { FC } from "react"
import { useLocation } from "react-router"
import PositivLogo from "~/assets/brand/positiv-logo-colors.png"
import { Button } from "~/components/atoms/button/button"
import { Link } from "~/components/atoms/link/link"
import { useProfile } from "~/lib/hooks/use-profile"
import paths from "~/lib/paths"
import { NewsDialog } from "../news-dialog/news-dialog"
import { WarningBanner } from "../warning-banner/warning-banner"

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
  userEmail?: string | null
  isProdInDev?: boolean
  isThereAnyNews: boolean
}

export const Header: FC<HeaderProps> = ({
  userEmail,
  isProdInDev,
  isThereAnyNews,
}) => {
  const { pathname } = useLocation()
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()

  const showButton = pathname !== "/entrar"
  const displayName = profile
    ? profile.social_name || profile.full_name || profile.email
    : userEmail || undefined
  const isAdmin = profile?.is_admin
  const showButtons = profile || userEmail

  const handleDashboardHover = () => {
    queryClient.prefetchQuery({
      queryKey: ["events", "dashboard"],
      queryFn: async () => {
        const response = await fetch("/api/events")
        if (!response.ok) throw new Error("Failed to prefetch events")
        const data = await response.json()
        return data.events
      },
      staleTime: 300000, // 5 minutes
    })
  }

  const handleAdminDashboardHover = () => {
    queryClient.prefetchQuery({
      queryKey: ["events", "admin"],
      queryFn: async () => {
        const response = await fetch("/api/admin/events")
        if (!response.ok) throw new Error("Failed to prefetch admin events")
        const data = await response.json()
        return data.events
      },
      staleTime: 300000, // 5 minutes
    })
  }

  return (
    <>
      {isProdInDev && (
        <div className="bg-red-400 fixed top-0 left-0 z-50 w-full text-center font-bold">
          PRODUCTION DATABASE
        </div>
      )}
      <div className="fixed top-0 left-0 z-30 w-full">
        {(pathname === "/" || pathname === "/entrar") && <WarningBanner />}
        <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-[1.75rem]">
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
                  <NewsDialog isThereAnyNews={isThereAnyNews} isHeader={true} />
                  <Button
                    asChild
                    variant="outline"
                    title="Dashboard"
                    to={DASHBOARD}
                    onMouseEnter={handleDashboardHover}
                  >
                    <CalendarIcon />
                  </Button>
                  {isAdmin && (
                    <Button
                      asChild
                      variant="outline"
                      title="Área Admin"
                      to={ADMIN_DASHBOARD}
                      onMouseEnter={handleAdminDashboardHover}
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
      </div>
    </>
  )
}
