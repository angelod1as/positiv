import type { ReactNode } from 'react'

type DatavizHeadingProps = {
  title: string
  children?: ReactNode
}

// Laid out like a Rich Text section's title, so the page reads as a Page.
export function DatavizHeading({ title, children }: DatavizHeadingProps) {
  return (
    <section className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  )
}
