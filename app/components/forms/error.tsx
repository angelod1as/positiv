import type { JSX } from "react"

export const Error = (props: JSX.IntrinsicElements["div"]) => {
  return <div className="text-red-600 text-sm" {...props} />
}
