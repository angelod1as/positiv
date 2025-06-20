import { Button, type ButtonProps } from "@react-email/components"

export const EmailButton = ({ className, ...props }: ButtonProps) => {
  return (
    <Button
      {...props}
      className="px-4 py-2 bg-black text-white rounded shadow-xs hover:bg-primary/90"
    />
  )
}
