import { useQuery, queryOptions } from "@tanstack/solid-query"
import { notFound } from "@tanstack/solid-router"

import { UserFetcher } from "."

export function profile(opt: UserFetcher.Option) {
	return useQuery(() => profileOption(opt))
}

export function profileOption({
	"params.username": params_username,
	current_user,
}: UserFetcher.Option) {
	return queryOptions({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: ["profile", params_username ?? current_user?.name].filter(
			Boolean,
		),
		queryFn: async () => {
			if (current_user) return current_user
			let user = await UserFetcher.userProfile({
				"params.username": params_username,
			})

			if (!user) {
				throw notFound()
			}
			return user
		},
		throwOnError: true,
	})
}
