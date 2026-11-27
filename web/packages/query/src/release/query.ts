import { queryOptions } from "@tanstack/solid-query"
import { ReleaseApi } from "@thc/api"
import { Either } from "effect"

export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: ["release::search", keyword],
		queryFn: async () => {
			const result = await ReleaseApi.findReleaseByKeyword({
				query: { keyword },
			})
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		throwOnError: true,
	})
}
