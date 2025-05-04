import { type FC } from "react"

type FormDescriptionProps = {
  description: string | undefined
}
export const FormDescription: FC<FormDescriptionProps> = ({ description }) => {
  if (!description) return null
  return (
    <p className="text-xs text-muted-foreground leading-normal">
      {description}
    </p>
  )
}
