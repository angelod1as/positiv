import type { JSX } from "react"

export const Errors = (props: JSX.IntrinsicElements["div"]) => {
  return <div className="flex flex-col space-y-2 text-center" {...props} />
}
