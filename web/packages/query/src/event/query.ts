import { queryOptions } from "@tanstack/solid-query"
import { EventApi } from "@thc/api"
import { Either } from "effect"

export const QUERY_KEYS = {
	DETAIL_ID: "event::info",
	DETAIL_KEYWORD: "event::keyword",
}

export function findById(id: number) {
	return queryOptions({
		queryKey: [QUERY_KEYS.DETAIL_ID, id],
		queryFn: async () => {
			const result = await EventApi.findEventById({
				path: { id },
			})
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		throwOnError: true,
	})
}

export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: [QUERY_KEYS.DETAIL_KEYWORD, keyword],
		queryFn: async () => {
			const result = await EventApi.findEventByKeyword({
				query: { keyword },
			})
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		throwOnError: true,
	})
}
