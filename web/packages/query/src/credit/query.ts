import { queryOptions } from "@tanstack/solid-query"
import { CreditApi } from "@thc/api"
import { Either } from "effect"

export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: ["credit-role::summary", keyword],
		queryFn: async () => {
			const result = await CreditApi.findManyCreditRolesSummary({
				query: { keyword },
			})
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		throwOnError: true,
	})
}
