import { useQuery, queryOptions } from "@tanstack/solid-query"
import { UserApi } from "@thc/api"
import { Either, identity, Option as EffectOption } from "effect"

export type ProfileQueryOption = {
	"params.username": string
}

export function profile(opt: ProfileQueryOption) {
	return useQuery(() => profileOption(opt))
}

export function profileQueryKey({
	"params.username": username,
}: ProfileQueryOption) {
	return ["profile", username] as const
}

export function profileOption({
	"params.username": username,
}: ProfileQueryOption) {
	return queryOptions({
		queryKey: profileQueryKey({
			"params.username": username,
		}),
		queryFn: async () => {
			const result = await UserApi.profileWithName({
				path: { name: username },
			})

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
