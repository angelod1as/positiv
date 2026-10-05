import { CalendarIcon, MenuIcon, Table2Icon, UserIcon } from "lucide-react"
import { type FC, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router"
import PositivLogo from "~/assets/brand/positiv-logo-colors.png"
import { Button } from "~/components/atoms/button/button"
import { ContentLink } from "~/components/atoms/content-link/content-link"
import { Link } from "~/components/atoms/link/link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { headerCopy } from "~/copy/layout"
import paths from "~/lib/paths"
import type { PortableText } from "~/business/cms/homepage-content.schema"
import type { SiteLink } from "~/business/cms/site-settings.schema"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { NewsDialog } from "../news-dialog/news-dialog"
import { Notice } from "../notice/notice"

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
  isProdInDev?: boolean
  isThereAnyNews: boolean
  navigation?: SiteLink[]
  notice?: PortableText | null
  editorialSystemUnavailable?: boolean
}

export const Header: FC<HeaderProps> = ({
  profile,
  userEmail,
  isProdInDev,
  isThereAnyNews,
  navigation = [],
  notice = null,
  editorialSystemUnavailable = false,
}) => {
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const top = topRef.current
    if (!top || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0].blockSize
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${height}px`,
      )
    })
    observer.observe(top)
    return () => observer.disconnect()
  }, [])

  const showButton = pathname !== "/entrar"
  const displayName = profile
    ? profile.social_name || profile.full_name || profile.email
    : userEmail || undefined
  const isAdmin = profile?.is_admin
  const showButtons = profile || userEmail

  return (
    <>
      {isProdInDev && (
        <div className="bg-red-400 fixed top-0 left-0 z-50 w-full text-center font-bold">
          {headerCopy.prodInDevWarning}
        </div>
      )}
      <div ref={topRef} className="fixed top-0 left-0 z-30 w-full">
        <Notice
          notice={notice}
          editorialSystemUnavailable={editorialSystemUnavailable}
        />
        <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-[1.75rem]">
          <div className="text-xl font-bold">
            <Link variant="unstyled" to={HOME}>
              <img
                alt={headerCopy.logoAlt}
                src={PositivLogo}
                className="w-auto px-2 py-1 rounded-lg max-h-8"
              />
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {navigation.length > 0 && (
              <>
                <nav
                  aria-label={headerCopy.navigationLabel}
                  className="hidden md:flex items-center gap-4 pr-2"
                >
                  {navigation.map((link) => (
                    <ContentLink
                      key={link._key}
                      href={link.href}
                      className="no-underline hover:underline"
                    >
                      {link.label}
                    </ContentLink>
                  ))}
                </nav>
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="md:hidden"
                      aria-label={headerCopy.openMenu}
                    >
                      <MenuIcon />
                    </Button>
                  </SheetTrigger>
                  <SheetContent aria-describedby={undefined}>
                    <SheetHeader>
                      <SheetTitle>{headerCopy.menuTitle}</SheetTitle>
                    </SheetHeader>
                    <ul className="flex flex-col gap-4 px-4">
                      {navigation.map((link) => (
                        <li key={link._key}>
                          <ContentLink
                            href={link.href}
                            className="no-underline hover:underline"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {link.label}
                          </ContentLink>
                        </li>
                      ))}
                    </ul>
                  </SheetContent>
                </Sheet>
              </>
            )}
            {showButton &&
              (showButtons ? (
                <div className="flex items-center space-x-2">
                  {!!displayName && (
                    <p className="hidden sm:block">{headerCopy.greeting(displayName)}</p>
                  )}
                  <NewsDialog isThereAnyNews={isThereAnyNews} isHeader={true} currentProfile={profile} />
                  <Button
                    asChild
                    variant="outline"
                    title={headerCopy.dashboardTitle}
                    to={DASHBOARD}
                  >
                    <CalendarIcon />
                  </Button>
                  {isAdmin && (
                    <Button
                      asChild
                      variant="outline"
                      title={headerCopy.adminTitle}
                      to={ADMIN_DASHBOARD}
                    >
                      <Table2Icon />
                    </Button>
                  )}
                  <Button asChild variant="outline" title={headerCopy.accountTitle} to={ACCOUNT}>
                    <UserIcon />
                  </Button>
                </div>
              ) : (
                <Button to={LOGIN}>{headerCopy.login}</Button>
              ))}
          </div>
        </header>
      </div>
    </>
  )
}
