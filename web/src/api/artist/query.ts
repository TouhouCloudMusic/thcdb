import {
	infiniteQueryOptions,
	queryOptions,
	useQuery,
} from "@tanstack/solid-query"
import { notFound } from "@tanstack/solid-router"

import { Str } from "~/utils/data"

import type { ReleaseType } from "../release"
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
		queryFn: async (context) => {
			const appearances = await F.__appearances(id, {
				cursor: context.pageParam,
			})
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
		queryFn: async (context) => {
			const credits = await F.__credits(id, {
				cursor: context.pageParam,
			})
			return credits
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
	})
}

// export function discography(id: number, releaseType: ReleaseType) {
// 	return infiniteQueryOptions({
// 		queryKey: ["artist::discographies", id, releaseType],
// 		queryFn: async (context) => {
// 			const discographies = await F.__discographies(id, releaseType, {
// 				cursor: context.pageParam,
// 			})
// 			return discographies
// 		},
// 		getNextPageParam: (last) => last.next_cursor,
// 		initialPageParam: 0,
// 		throwOnError: true,
// 	})
// }

export function discography(id: number, releaseType: ReleaseType) {
	return infiniteQueryOptions({
		queryKey: ["artist::discographies", id, releaseType],
		queryFn: async (context) => {
			if (context.pageParam === 0) {
				const query = useQuery(() => discographyInit(id))
				const res = await query.promise
				return res[Str.toLowerCase(releaseType)]
			}

			const discographies = await F.__discographies(id, releaseType, {
				cursor: context.pageParam,
			})
			return discographies
		},
		getNextPageParam: (last) => last.next_cursor,
		initialPageParam: 0,
		throwOnError: true,
	})
}

export function discographyInit(id: number, limit?: number) {
	return queryOptions({
		queryKey: ["artist::discographies::init", id, limit],
		queryFn: () => {
			return F.__discographiesInit(id, limit)
		},
		throwOnError: true,
	})
}
