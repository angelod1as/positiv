import type { PageHeader as PageHeaderContent } from "~/business/cms/page.schema"
import { HomePageHero } from "~/components/pages/homepage/hero/hero"
import { PageHero } from "./page-hero"
import { PageTitle } from "./page-title"

type PageHeaderProps = {
  header: PageHeaderContent
}

export const PageHeader = ({ header }: PageHeaderProps) => {
  switch (header._type) {
    case "homepageHero":
      return <HomePageHero content={header} />
    case "pageHero":
      return <PageHero content={header} />
    case "pageTitle":
      return <PageTitle content={header} />
  }
}
