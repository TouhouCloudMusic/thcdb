import { useQuery, queryOptions } from "@tanstack/solid-query"
import type { UserProfile } from "@thc/api"
import { UserApi } from "@thc/api"
import { Either, identity, Option as EffectOption } from "effect"

export type ProfileQueryOption = {
	"params.username"?: string | undefined
	current_user?: UserProfile | undefined
	viewer_name?: string | undefined
}

export function profile(opt: ProfileQueryOption) {
	return useQuery(() => profileOption(opt))
}

export function profileQueryKey({
	"params.username": params_username,
	current_user,
	viewer_name,
}: ProfileQueryOption) {
	return [
		"profile",
		params_username ?? current_user?.name ?? "__self__",
		current_user?.name ?? viewer_name ?? "__anonymous__",
	] as const
}

export function profileOption({
	"params.username": params_username,
	current_user,
	viewer_name,
}: ProfileQueryOption) {
	return queryOptions({
		queryKey: profileQueryKey({
			"params.username": params_username,
			current_user,
			viewer_name,
		}),
		queryFn: async () => {
			if (current_user) return current_user

			const result = params_username
				? await UserApi.profileWithName({
						path: { name: params_username },
					})
				: await UserApi.profile()

			return Either.match(Either.map(result, EffectOption.getOrUndefined), {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	})
}
