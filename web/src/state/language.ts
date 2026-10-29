import { languageListOptions } from "~/hey-api/@tanstack/solid-query.gen"

const LANGUAGE_CATALOG_CACHE_TIME = 86_400_000

export function languageListQueryOptions() {
	return {
		...languageListOptions(),
		staleTime: LANGUAGE_CATALOG_CACHE_TIME,
		gcTime: LANGUAGE_CATALOG_CACHE_TIME,
		throwOnError: true,
	}
}
