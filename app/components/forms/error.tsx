import type { JSX } from "react"

export const Error = (
  props: JSX.IntrinsicElements["div"] & { name?: string },
) => {
  const { name, ...rest } = props
  return <div data-name={name} className="text-red-600 text-sm" {...rest} />
}
