import { queryOptions } from "@tanstack/solid-query"
import { LabelApi } from "@thc/api"
import { Either, identity } from "effect"

export const QUERY_KEYS = {
	DETAIL_ID: "label::profile",
	DETAIL_KEYWORD: "label::keyword",
}

export function findById(id: number) {
	return queryOptions({
		queryKey: [QUERY_KEYS.DETAIL_ID, id],
		queryFn: async () => {
			const result = await LabelApi.findLabelById({ path: { id } })
			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	})
}

export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: [QUERY_KEYS.DETAIL_KEYWORD, keyword],
		queryFn: async () => {
			const result = await LabelApi.findLabelByKeyword({
				query: { keyword },
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	})
}
