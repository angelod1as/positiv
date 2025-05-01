import type { JSX } from "react"

export const RadioGroup = (props: JSX.IntrinsicElements["fieldset"]) => {
  return <fieldset className="flex gap-4" {...props} />
}
