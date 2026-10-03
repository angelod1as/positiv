import type { PageHeader } from "~/business/cms/page.schema"

type PageTitleProps = {
  content: Extract<PageHeader, { _type: "pageTitle" }>
}

export const PageTitle = ({ content }: PageTitleProps) => {
  return (
    <header className="w-full px-4 pt-12 pb-4 md:px-6 md:pt-16">
      <div className="mx-auto max-w-3xl space-y-2">
        <h1>{content.title}</h1>
        {content.intro && (
          <p className="text-muted-foreground md:text-lg">{content.intro}</p>
        )}
      </div>
    </header>
  )
}
