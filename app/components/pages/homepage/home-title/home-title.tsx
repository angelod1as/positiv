import type { FCC } from "~types/utils/utils.types"

type HomePageTitleProps = {
  subtitle?: string
}
export const HomePageTitle: FCC<HomePageTitleProps> = ({
  children,
  subtitle,
}) => {
  return (
    <div className="space-y-2 text-center">
      <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
        {children}
      </h2>
      {subtitle && (
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}
