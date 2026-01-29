import type { ImageQueueStatus, UserSummary } from "../gen"

export type CursorPage<T> = {
	items: T[]
	next_cursor: number | null
}

export type PendingImageQueueItem = {
	id: number
	image_id: number | null
	status: ImageQueueStatus
	created_at: string
	created_by: UserSummary
}

export type UserImageQueueItem = {
	id: number
	image_id: number | null
	status: ImageQueueStatus
	created_at: string
	handled_at: string | null
	handled_by: UserSummary | null
	reverted_at: string | null
	reverted_by: UserSummary | null
}
