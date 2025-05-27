import { infiniteQueryOptions, queryOptions } from "@tanstack/solid-query"
import { notFound } from "@tanstack/solid-router"

import type { ReleaseType } from "../release"
import type { Pagination } from "../shared"
import * as F from "./fetcher"

export function findById(id: number) {
	return queryOptions({
		queryKey: ["artist::profile", id],
		queryFn: async () => {
			const artist = await F.__findById(id)
			if (!artist) {
				throw notFound()
			}
			return artist
		},
		throwOnError: true,
	})
}

export function appearances(id: number) {
	return infiniteQueryOptions({
		queryKey: ["artist::appearances", id],
		queryFn: async () => {
			const appearances = await F.__appearances(id)
			return appearances
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
	})
}

export function credits(id: number) {
	return infiniteQueryOptions({
		queryKey: ["artist::credits", id],
		queryFn: async () => {
			const credits = await F.__credits(id)
			return credits
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
	})
}

export function discography(
	id: number,
	releaseType: ReleaseType,
	pagination?: Pagination,
) {
	return infiniteQueryOptions({
		queryKey: ["artist::discographies", id, releaseType, pagination],
		queryFn: async () => {
			const discographies = await F.__discographies(id, releaseType, pagination)
			return discographies
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
	})
}
