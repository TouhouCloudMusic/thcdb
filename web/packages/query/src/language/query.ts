import { queryOptions } from "@tanstack/solid-query"
import { LanguageApi } from "@thc/api"
import { Either } from "effect"

const LANGUAGES_STALE_TIME = 86_400_000 // 1 day (86,400,000 milliseconds)

export function findAll() {
	return queryOptions({
		queryKey: ["languages::all"],
		queryFn: async () => {
			const result = await LanguageApi.findAll()
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		staleTime: LANGUAGES_STALE_TIME,
		gcTime: LANGUAGES_STALE_TIME,
		throwOnError: true,
	})
}
