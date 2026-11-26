import type { Page } from "~/business/cms/page.schema"
import type { Rule } from "~/business/cms/rules.schema"
import { FloatingWhatsAppButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { PageHeader } from "~/components/pages/page/header/page-header"
import { PageSections } from "~/components/pages/page/sections/page-sections"
import type { Event } from "~types/database/entities.types"

const HOMEPAGE_ADDRESS = "/"

type PageContentProps = {
  page: Page
  events: Promise<Event[] | undefined> | undefined
  isLoggedIn: boolean
  privateRules?: Rule[] | null
}

export function PageContent({
  page,
  events,
  isLoggedIn,
  privateRules = null,
}: PageContentProps) {
  return (
    <>
      <div>
        <PageHeader header={page.header} />
        <PageSections
          page={page.address}
          sections={page.sections}
          events={events}
          isLoggedIn={isLoggedIn}
          privateRules={privateRules}
        />
      </div>
      {page.address === HOMEPAGE_ADDRESS && <FloatingWhatsAppButton />}
    </>
  )
}
