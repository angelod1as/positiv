import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createQueryClient } from "~/lib/query-client"

export function QueryWrapper({ children }: { children: ReactNode }) {
	const queryClient = createQueryClient()

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}
