import type { FCC } from "~types/utils.types"

export const FormError: FCC = ({ children }) => {
  return <p className="text-sm text-red">{children}</p>
}
