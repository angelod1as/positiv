import type { FC } from "react"

export const SavingIndicator: FC = () => (
  <span className="absolute right-2 top-2 h-4 w-4">
    <span className="animate-ping absolute h-4 w-4 rounded-full bg-blue-400 opacity-75" />
    <span className="absolute h-4 w-4 rounded-full bg-blue-500" />
  </span>
)
