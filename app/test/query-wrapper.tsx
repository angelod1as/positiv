import { QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { createQueryClient } from "~/lib/query-client"

export function QueryWrapper({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => {
		const client = createQueryClient()
		client.setDefaultOptions({
			queries: {
				...client.getDefaultOptions().queries,
				retry: false,
			},
		})
		return client
	})

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}
