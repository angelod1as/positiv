import type { PageHeader as PageHeaderContent } from "~/business/cms/page.schema"
import { HomepageHero } from "./homepage-hero"
import { PageHero } from "./page-hero"
import { PageTitle } from "./page-title"

type PageHeaderProps = {
  header: PageHeaderContent
}

export const PageHeader = ({ header }: PageHeaderProps) => {
  switch (header._type) {
    case "homepageHero":
      return <HomepageHero content={header} />
    case "pageHero":
      return <PageHero content={header} />
    case "pageTitle":
      return <PageTitle content={header} />
  }
}
