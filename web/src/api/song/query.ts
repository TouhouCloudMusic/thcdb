import { queryOptions } from "@tanstack/solid-query"
import { notFound } from "@tanstack/solid-router"

import * as F from "./fetcher"

export function findById(id: number) {
	return queryOptions({
		queryKey: ["song::info", id],
		queryFn: async () => {
			const song = await F.findById(id)

			if (!song) {
				throw notFound()
			}

			return song
		},
		throwOnError: true,
	})
}

export function findByKeyword(keyword: string) {
	return queryOptions({
		queryKey: ["song::info", keyword],
		queryFn: async () => {
			const songs = await F.findByKeyword(keyword)

			return songs
		},
		throwOnError: true,
	})
}
