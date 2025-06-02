import type { FCC } from "~types/utils.types"

export const FullLayout: FCC = (props) => {
  return (
    <div
      {...props}
      className="px-4 self-center flex flex-col h-full w-full gap-8 mb-12 mx-4 py-8"
    />
  )
}
