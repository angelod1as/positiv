import React, { type ReactElement } from "react"
import type { FCC } from "~types/utils.types"

type AboutCardProps = {
  title: string
  icon: ReactElement<SVGSVGElement>
}

export const AboutCard: FCC<AboutCardProps> = ({ children, title, icon }) => {
  const styledIcon = React.cloneElement(icon, {
    className: "h-8 w-8 text-purple",
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
        {styledIcon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="text-background text-center flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}
