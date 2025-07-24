import type { FC, JSX } from "react"
import { cn } from "~/lib/utils"
import { Button } from "~/components/atoms/button/button"

type SubmitButtonProps = JSX.IntrinsicElements["button"] & {
  alignment: "left" | "center" | "right"
}
export const SubmitButton: FC<SubmitButtonProps> = ({
  alignment = "left",
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex",
        {
          left: "justify-start",
          center: "justify-center",
          right: "justify-end",
        }[alignment],
      )}
    >
      <Button {...props} />
    </div>
  )
}
