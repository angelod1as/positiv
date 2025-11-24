import { QueryClient } from "@tanstack/react-query"

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 300000, // 5 minutes
				gcTime: 1800000, // 30 minutes
				refetchOnWindowFocus: false,
			},
		},
	})
}
