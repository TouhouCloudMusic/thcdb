import type {
	CursorResponsePendingImageQueueItem,
	ImageQueueStatus,
	ImageQueueType,
} from "~/hey-api"

type PendingImageQueueItem =
	CursorResponsePendingImageQueueItem["items"][number]

export type StoryEntry = {
	type: ImageQueueType
	item: PendingImageQueueItem
}

type StoryEntrySeed = {
	id: number
	type: ImageQueueType
	status: ImageQueueStatus
	name: string
	imageId: number | null
	createdAt: string
}

export const STORY_ENTRIES: StoryEntry[] = [
	createStoryEntry({
		id: 28,
		type: "release",
		status: "Approved",
		name: "Rika Akiyama",
		imageId: 914,
		createdAt: "2026-02-26T17:08:00.000Z",
	}),
	createStoryEntry({
		id: 25,
		type: "release",
		status: "Approved",
		name: "Mina Kuroda",
		imageId: 3425,
		createdAt: "2026-02-20T08:43:00.000Z",
	}),
	createStoryEntry({
		id: 24,
		type: "release",
		status: "Approved",
		name: "Aoi Haruna",
		imageId: 4983,
		createdAt: "2026-02-21T09:19:00.000Z",
	}),
	createStoryEntry({
		id: 23,
		type: "release",
		status: "Reverted",
		name: "Patty Reilly IV",
		imageId: 836,
		createdAt: "2026-02-23T06:11:00.000Z",
	}),
	createStoryEntry({
		id: 21,
		type: "artist",
		status: "Pending",
		name: "Everett Bauch",
		imageId: 151,
		createdAt: "2026-02-15T10:24:00.000Z",
	}),
	createStoryEntry({
		id: 20,
		type: "release",
		status: "Reverted",
		name: "Aoi Haruna",
		imageId: 1894,
		createdAt: "2026-03-11T06:16:00.000Z",
	}),
	createStoryEntry({
		id: 18,
		type: "release",
		status: "Approved",
		name: "Aoi Haruna",
		imageId: 3331,
		createdAt: "2026-02-20T05:47:00.000Z",
	}),
	createStoryEntry({
		id: 15,
		type: "release",
		status: "Pending",
		name: "Mina Kuroda",
		imageId: 1530,
		createdAt: "2026-02-25T15:10:00.000Z",
	}),
	createStoryEntry({
		id: 14,
		type: "release",
		status: "Rejected",
		name: "Patty Reilly IV",
		imageId: null,
		createdAt: "2026-02-15T00:39:00.000Z",
	}),
	createStoryEntry({
		id: 13,
		type: "release",
		status: "Pending",
		name: "Patty Reilly IV",
		imageId: 3046,
		createdAt: "2026-03-15T18:12:00.000Z",
	}),
	createStoryEntry({
		id: 11,
		type: "artist",
		status: "Pending",
		name: "Julio Rau-Price",
		imageId: 64,
		createdAt: "2026-03-08T12:48:00.000Z",
	}),
	createStoryEntry({
		id: 10,
		type: "release",
		status: "Pending",
		name: "Everett Bauch",
		imageId: 991,
		createdAt: "2026-03-09T06:00:00.000Z",
	}),
	createStoryEntry({
		id: 8,
		type: "release",
		status: "Cancelled",
		name: "Patty Reilly IV",
		imageId: 2153,
		createdAt: "2026-03-02T17:05:00.000Z",
	}),
	createStoryEntry({
		id: 6,
		type: "release",
		status: "Pending",
		name: "Patty Reilly IV",
		imageId: 2650,
		createdAt: "2026-02-16T00:53:00.000Z",
	}),
	createStoryEntry({
		id: 4,
		type: "release",
		status: "Approved",
		name: "Aoi Haruna",
		imageId: 4882,
		createdAt: "2026-03-08T05:32:00.000Z",
	}),
	createStoryEntry({
		id: 3,
		type: "release",
		status: "Rejected",
		name: "Mina Kuroda",
		imageId: null,
		createdAt: "2026-03-02T02:40:00.000Z",
	}),
	createStoryEntry({
		id: 2,
		type: "artist",
		status: "Pending",
		name: "Shelly VonRueden",
		imageId: 1024,
		createdAt: "2026-02-27T20:17:00.000Z",
	}),
]

export const PENDING_COUNT = STORY_ENTRIES.filter(
	(entry) => entry.item.status === "Pending",
).length

function createStoryEntry(seed: StoryEntrySeed): StoryEntry {
	return {
		type: seed.type,
		item: {
			id: seed.id,
			image_id: seed.imageId,
			status: seed.status,
			created_at: seed.createdAt,
			created_by: {
				id: seed.id * 10,
				name: seed.name,
			},
		},
	}
}
