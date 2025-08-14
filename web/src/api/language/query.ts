import { queryOptions } from "@tanstack/solid-query"

import type { Language } from "."
import { getLanguages } from "./fetcher"

const LANGUAGES_STALE_TIME = 86_400_000 // 1 day (86,400,000 milliseconds)

export function findAll() {
	return queryOptions({
		queryKey: ["languages::all"],
		queryFn: (): Promise<Language[]> => getLanguages(),
		staleTime: LANGUAGES_STALE_TIME,
		gcTime: LANGUAGES_STALE_TIME,
		throwOnError: true,
	})
}
