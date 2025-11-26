import { useQuery } from "@tanstack/react-query"
import type { ViewEvent } from "~types/database/entities.types"

const eventKeys = {
	dashboard: ["events", "dashboard"] as const,
}

type SplitEvents = {
	registrationOpen: ViewEvent[]
	registrationClosed: ViewEvent[]
	scheduled: ViewEvent[]
}

export function useEvents() {
	return useQuery({
		queryKey: eventKeys.dashboard,
		queryFn: async (): Promise<SplitEvents> => {
			const response = await fetch("/api/events")

			if (!response.ok) {
				throw new Error("Failed to fetch events")
			}

			const data = await response.json()
			return data.events
		},
		staleTime: 300000, // 5 minutes
		refetchOnWindowFocus: true,
	})
}
