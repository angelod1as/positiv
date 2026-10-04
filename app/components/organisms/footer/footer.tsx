import { GithubIcon } from "lucide-react"
import type { FC } from "react"
import Instagram from "~/assets/social/instagram.svg"
import type { SiteSettings } from "~/business/cms/site-settings.schema"
import { ContentLink } from "~/components/atoms/content-link/content-link"
import { Copy } from "~/components/atoms/copy/copy"
import { Link } from "~/components/atoms/link/link"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { footerCopy } from "~/copy/layout"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { NewsDialog } from "../news-dialog/news-dialog"

const FALLBACK_INSTAGRAM_URL = "https://instagram.com/positivparty"

type FooterProps = {
  isThereAnyNews: boolean
  currentProfile?: ProfileWithRoles | null
  siteSettings?: SiteSettings | null
}

const InstagramLink: FC<{ url: string }> = ({ url }) => (
  <Link target="_blank" to={url} className="flex gap-2 items-center">
    <img src={Instagram} alt={footerCopy.instagramIconAlt} width={20} />{" "}
    {footerCopy.instagram}
  </Link>
)

export const Footer: FC<FooterProps> = ({
  isThereAnyNews,
  currentProfile,
  siteSettings,
}) => {
  const footer = siteSettings?.footer
  const socialLinks = footer
    ? footer.social
    : [{ _key: "instagram", url: FALLBACK_INSTAGRAM_URL }]

  return (
    <footer className="text-xs w-full p-3 bg-gray-100 border">
      <div className="px-4 md:px-6">
        {footer && footer.columns.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 pb-4 text-center">
            {footer.columns.map((column) => (
              <div key={column._key}>
                <p id={`footer-column-${column._key}`} className="font-bold">
                  {column.title}
                </p>
                <ul
                  aria-labelledby={`footer-column-${column._key}`}
                  className="flex flex-col gap-1 pt-1"
                >
                  {column.links.map((link) => (
                    <li key={link._key}>
                      <ContentLink href={link.href}>{link.label}</ContentLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 text-muted-foreground lg:grid-cols-2  gap-4  justify-end items-start text-center">
          <div className="text-muted-foreground">
            {footer ? (
              <>
                <RichText value={footer.text} />
                <RichText value={footer.development.developedBy} />
                <p className="flex gap-2 justify-center">
                  {footerCopy.openSource}{" "}
                  <Link
                    target="_blank"
                    to={footer.development.repositoryUrl}
                    className="flex items-center"
                  >
                    <GithubIcon />
                    {footerCopy.repository}
                  </Link>
                </p>
                <Copy>
                  {footerCopy.bugReport(footer.development.bugReportUrl)}
                </Copy>
              </>
            ) : (
              <Copy>{footerCopy.copyright}</Copy>
            )}
          </div>
          <div>
            <NewsDialog
              isThereAnyNews={isThereAnyNews}
              currentProfile={currentProfile}
            />
            <div className="flex justify-center items-center space-x-4">
              {socialLinks.map((social) => (
                <InstagramLink key={social._key} url={social.url} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
