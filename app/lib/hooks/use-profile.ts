import { useQuery } from "@tanstack/react-query"
import { getClientContext } from "~/business/auth/auth.client"

const profileKeys = {
	current: ["profile", "current"] as const,
}

export function useProfile() {
	return useQuery({
		queryKey: profileKeys.current,
		queryFn: async () => {
			const { currentProfile } = await getClientContext()
			return currentProfile
		},
		staleTime: 300000, // 5 minutes
	})
}
