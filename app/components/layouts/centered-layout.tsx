import type { FCC } from "~types/utils.types"

export const CenteredLayout: FCC = (props) => {
  return (
    <div
      {...props}
      className="px-4 lg:px-0 self-center flex flex-col h-full max-w-2xl w-full gap-8 mb-12 mx-4 py-8 centered-layout"
    />
  )
}
