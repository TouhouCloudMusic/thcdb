import { infiniteQueryOptions, queryOptions } from "@tanstack/solid-query"
import type {
	ImageQueueDetail,
	ImageQueueStatus,
	ImageQueueType,
	CursorPage,
	PendingImageQueueItem,
	UserImageQueueItem,
} from "@thc/api"
import { ImageQueueApi } from "@thc/api"
import { Either, identity } from "effect"

type ListFilter = {
	limit: number
	status?: ImageQueueStatus
	type?: ImageQueueType
}

const normalizeCursor = (cursor: number) => (cursor === 0 ? undefined : cursor)

export function pendingCount() {
	return queryOptions({
		queryKey: ["image-queue::pending-count"],
		queryFn: async () => {
			const result = await ImageQueueApi.pendingCount()
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

export function list(filter: ListFilter) {
	return infiniteQueryOptions({
		queryKey: ["image-queue::list", filter.limit, filter.type, filter.status],
		queryFn: async (context) => {
			const result = await ImageQueueApi.list({
				query: {
					limit: filter.limit,
					cursor: normalizeCursor(context.pageParam),
					type: filter.type,
					status: filter.status,
				},
			})
			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor ?? undefined,
		throwOnError: true,
	})
}

export function detail(id: number) {
	return queryOptions({
		queryKey: ["image-queue::detail", id],
		queryFn: async () => {
			const result = await ImageQueueApi.detail({
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

export function userQueue(userId: number, limit: number) {
	return infiniteQueryOptions({
		queryKey: ["image-queue::user", userId, limit],
		queryFn: async (context) => {
			const result = await ImageQueueApi.userQueue({
				path: { id: userId },
				query: {
					limit,
					cursor: normalizeCursor(context.pageParam),
				},
			})
			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		initialPageParam: 0,
		getNextPageParam: (last) => last.next_cursor ?? undefined,
		throwOnError: true,
	})
}

export type ImageQueuePage = CursorPage<PendingImageQueueItem>
export type UserImageQueuePage = CursorPage<UserImageQueueItem>
export type ImageQueueEntry = ImageQueueDetail
