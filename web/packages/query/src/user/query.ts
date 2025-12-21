import { useQuery, queryOptions } from "@tanstack/solid-query"
import type { UserProfile } from "@thc/api"
import { UserApi } from "@thc/api"
import { Either, Option } from "effect"

export type Option = {
	"params.username"?: string | undefined
	current_user?: UserProfile | undefined
}

export function profile(opt: Option) {
	return useQuery(() => profileOption(opt))
}

export function profileOption({
	"params.username": params_username,
	current_user,
}: Option) {
	return queryOptions({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: ["profile", params_username ?? current_user?.name].filter(
			Boolean,
		),
		queryFn: async () => {
			if (current_user) return current_user

			const result = params_username
				? await UserApi.profileWithName({
						path: { name: params_username },
					})
				: await UserApi.profile()

			return Either.match(result, {
				onRight: Option.getOrUndefined,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	})
}
