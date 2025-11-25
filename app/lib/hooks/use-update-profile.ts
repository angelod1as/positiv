import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getClientContext } from "~/business/auth/auth.client"
import type { ProfileWithRoles } from "~/types/database/entities.types"

type ProfileUpdateData = Partial<
	Omit<ProfileWithRoles, "id" | "created_at" | "user_id">
>

export function useUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: ProfileUpdateData) => {
			const { currentProfile, currentUser, supabase } =
				await getClientContext()

			if (!currentProfile || !currentUser) {
				throw new Error("No profile found to update")
			}

			const { error } = await supabase
				.from("profiles")
				.update(data)
				.eq("id", currentProfile.id)

			if (error) {
				throw new Error(error.message)
			}

			// Fetch updated profile with roles using RPC function
			const { data: updatedProfile, error: fetchError } = await supabase
				.rpc("get_profile_with_roles", { user_id_input: currentUser.id })
				.single()

			if (fetchError || !updatedProfile) {
				throw new Error(fetchError?.message || "Failed to fetch updated profile")
			}

			return updatedProfile
		},
		onMutate: async (data) => {
			// Cancel any outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: ["profile", "current"] })

			// Snapshot the previous value
			const previousProfile = queryClient.getQueryData<ProfileWithRoles>([
				"profile",
				"current",
			])

			// Optimistically update the cache
			if (previousProfile) {
				queryClient.setQueryData<ProfileWithRoles>(["profile", "current"], {
					...previousProfile,
					...data,
				})
			}

			// Return context with previous value for rollback
			return { previousProfile }
		},
		onError: (error, variables, context) => {
			// Rollback to previous value on error
			if (context?.previousProfile) {
				queryClient.setQueryData(["profile", "current"], context.previousProfile)
			}
		},
		onSuccess: (updatedProfile) => {
			// Update cache with server response
			queryClient.setQueryData(["profile", "current"], updatedProfile)
		},
	})
}
