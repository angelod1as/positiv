import type { Page } from "~/business/cms/page.schema"
import { FloatingWhatsAppButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { PageHeader } from "~/components/pages/page/header/page-header"
import { PageSections } from "~/components/pages/page/sections/page-sections"
import type { Event } from "~types/database/entities.types"

const HOMEPAGE_ADDRESS = "/"

type PageContentProps = {
  page: Page
  events: Promise<Event[] | undefined> | undefined
  isLoggedIn: boolean
}

export function PageContent({ page, events, isLoggedIn }: PageContentProps) {
  return (
    <>
      <div>
        <PageHeader header={page.header} />
        <PageSections
          sections={page.sections}
          events={events}
          isLoggedIn={isLoggedIn}
        />
      </div>
      {page.address === HOMEPAGE_ADDRESS && <FloatingWhatsAppButton />}
    </>
  )
}
