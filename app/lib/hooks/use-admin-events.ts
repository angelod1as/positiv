import { useQuery } from "@tanstack/react-query"
import type { DashboardEvent } from "~/components/organisms/tables/admin/events-table"

const eventKeys = {
	admin: ["events", "admin"] as const,
}

export function useAdminEvents() {
	return useQuery({
		queryKey: eventKeys.admin,
		queryFn: async (): Promise<DashboardEvent[]> => {
			const response = await fetch("/api/admin/events")

			if (!response.ok) {
				throw new Error("Failed to fetch admin events")
			}

			const data = await response.json()
			return data.events
		},
		staleTime: 300000, // 5 minutes
		refetchOnWindowFocus: true,
	})
}
