import type { JSX } from "react"

export const InputWrapper = (props: JSX.IntrinsicElements["div"]) => {
  return (
    <div className="flex items-start gap-2 text-muted-foreground" {...props} />
  )
}
