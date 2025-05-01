import type { JSX } from "react"
import { Button } from "../atoms/button/button"

export const SubmitButton = (props: JSX.IntrinsicElements["button"]) => {
  return (
    <div className="flex justify-end">
      <Button {...props} />
    </div>
  )
}
