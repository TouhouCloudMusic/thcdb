import { queryOptions } from "@tanstack/solid-query"
import { CorrectionApi } from "@thc/api"
import { Either, identity } from "effect"

export type CorrectionEntityType =
	| "artist"
	| "label"
	| "release"
	| "song"
	| "tag"
	| "event"
	| "song-lyrics"
	| "credit-role"

export function detail(id: number) {
	return queryOptions({
		queryKey: ["correction::detail", id],
		queryFn: async () => {
			const result = await CorrectionApi.findOne({
				path: { id },
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

export function revisions(id: number) {
	return queryOptions({
		queryKey: ["correction::revisions", id],
		queryFn: async () => {
			const result = await CorrectionApi.findRevisions({
				path: { id },
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

export function diff(id: number) {
	return queryOptions({
		queryKey: ["correction::diff", id],
		queryFn: async () => {
			const result = await CorrectionApi.findDiff({
				path: { id },
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

export function compare(id1: number, id2: number) {
	return queryOptions({
		queryKey: ["correction::compare", id1, id2],
		queryFn: async () => {
			const result = await CorrectionApi.compare({
				path: { id1, id2 },
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

export function history(entityType: CorrectionEntityType, id: number) {
	return queryOptions({
		queryKey: ["correction::history", entityType, id],
		queryFn: async () => {
			const result = await CorrectionApi.findHistory({
				path: { entity_type: entityType, id },
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
