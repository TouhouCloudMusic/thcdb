import { queryOptions } from "@tanstack/solid-query"

import { __findByKeyword } from "./fetcher"

// oxlint-disable-next-line explicit-module-boundary-types
export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: ["credit-role::summary", keyword],
		queryFn: () => __findByKeyword(keyword),
		throwOnError: true,
	})
}
