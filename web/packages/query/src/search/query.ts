import { infiniteQueryOptions } from "@tanstack/solid-query"
import type {
	SimpleArtist,
	SimpleEvent,
	SimpleLabel,
	SongRelease,
	SongRef,
	TagRef,
} from "@thc/api"
import { SearchApi } from "@thc/api"
import { Either, identity } from "effect"

const DEFAULT_LIMIT = 20

export function artists(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::artist", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchArtist({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export function releases(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::release", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchRelease({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export function songs(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::song", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchSong({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export function events(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::event", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchEvent({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export function labels(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::label", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchLabel({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export function tags(
	search_term: string,
	limit = DEFAULT_LIMIT,
	enabled = true,
) {
	return infiniteQueryOptions({
		queryKey: ["search::tag", search_term, limit],
		queryFn: async (context) => {
			const result = await SearchApi.searchTag({
				search_term,
				limit,
				cursor: context.pageParam,
			})

			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor,
		throwOnError: true,
		enabled,
	})
}

export type SearchResultItem =
	| SimpleArtist
	| SongRelease
	| SongRef
	| SimpleEvent
	| SimpleLabel
	| TagRef
