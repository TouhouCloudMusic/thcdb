export type ImageQueueStatus =
	| "Pending"
	| "Approved"
	| "Rejected"
	| "Cancelled"
	| "Reverted"

export type ImageQueueType = "artist" | "release"

export type ArtistImageType = "Profile"
export type ReleaseImageType = "Cover"

export type UserSummary = {
	id: number
	name: string
}

export type Paginated<T> = {
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

export type ImageSummary = {
	id: number
	filename: string
	directory: string
	uploaded_at: string
	uploaded_by: UserSummary
}

export type ArtistImageQueueTarget = {
	artist_id: number
	type: ArtistImageType
}

export type ReleaseImageQueueTarget = {
	release_id: number
	type: ReleaseImageType
}

export type ImageQueueDetail = {
	id: number
	image_id: number | null
	status: ImageQueueStatus
	created_at: string
	created_by: UserSummary
	handled_at: string | null
	handled_by: UserSummary | null
	reverted_at: string | null
	reverted_by: UserSummary | null
	image: ImageSummary | null
	artist: ArtistImageQueueTarget | null
	release: ReleaseImageQueueTarget | null
}

export type HandleImageQueueMethod = "Approve" | "Reject" | "Revert"

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
