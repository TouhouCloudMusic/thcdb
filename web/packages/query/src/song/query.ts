import { queryOptions } from "@tanstack/solid-query"
import { SongApi } from "@thc/api"
import { Either } from "effect"

export function findById(id: number) {
	return queryOptions({
		queryKey: ["song::info", id],
		queryFn: async () => {
			const result = await SongApi.findSongById({
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
		queryKey: ["song::info", keyword],
		queryFn: async () => {
			const result = await SongApi.findSongByKeyword({
				query: { keyword },
			})
			return Either.getOrThrowWith(result, (error) => {
				throw error
			})
		},
		throwOnError: true,
	})
}
