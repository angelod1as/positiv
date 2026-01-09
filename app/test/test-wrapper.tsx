import { TooltipProvider } from "~/components/ui/tooltip"

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
}
