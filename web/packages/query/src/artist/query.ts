import {
	infiniteQueryOptions,
	queryOptions,
	useQuery,
} from "@tanstack/solid-query"
import type { ArtistCommonFilter, ReleaseType } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { StrExt } from "@thc/toolkit/data"
import { Either, identity } from "effect"

export function findById(id: number, filter?: ArtistCommonFilter) {
	return queryOptions({
		queryKey: ["artist::profile", id, filter],
		queryFn: async () => {
			const result = await ArtistApi.findOne({
				path: { id },
				query: filter,
			})
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

export function findByKeyword(keyword: string, filter?: ArtistCommonFilter) {
	return queryOptions({
		queryKey: ["artist::keyword", keyword, filter],
		queryFn: async () => {
			const result = await ArtistApi.findMany({
				query: { keyword, ...filter },
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

export function appearances(id: number) {
	return infiniteQueryOptions({
		queryKey: ["artist::appearances", id],
		queryFn: async (context) => {
			const result = await ArtistApi.findAppearances({
				path: { id },
				query: { cursor: context.pageParam, limit: 10 },
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last?.next_cursor,
		throwOnError: true,
	})
}

export function credits(id: number) {
	return infiniteQueryOptions({
		queryKey: ["artist::credits", id],
		queryFn: async (context) => {
			const result = await ArtistApi.getCredits({
				path: { id },
				query: { cursor: context.pageParam, limit: 10 },
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
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
				return res[StrExt.toLowerCase(releaseType)]
			}

			const result = await ArtistApi.findDiscographiesByType({
				path: { id },
				query: {
					cursor: context.pageParam,
					release_type: releaseType,
					limit: 10,
				},
			})

			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		getNextPageParam: (last) => last?.next_cursor,
		initialPageParam: 0,
		throwOnError: true,
	})
}

export function discographyInit(id: number, limit?: number) {
	return queryOptions({
		queryKey: ["artist::discographies::init", id, limit],
		queryFn: async () => {
			const result = await ArtistApi.findDiscographiesInit({
				path: { id },
				query: limit ? { limit } : { limit: 10 },
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
