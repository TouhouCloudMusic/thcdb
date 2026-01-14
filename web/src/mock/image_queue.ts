import { faker } from "@faker-js/faker"
import type {
	ImageQueueDetail,
	ImageQueueStatus,
	ImageQueueType,
	UserSummary,
} from "@thc/api"

export type MockImageQueueEntry = {
	type: ImageQueueType
	detail: ImageQueueDetail
}

const STATUSES = [
	"Pending",
	"Approved",
	"Rejected",
	"Cancelled",
	"Reverted",
] as const satisfies ImageQueueStatus[]

const TYPES = ["artist", "release"] as const satisfies ImageQueueType[]

const pickWeighted = <T>(items: { value: T; weight: number }[]): T => {
	const total = items.reduce((acc, item) => acc + item.weight, 0)
	const target = faker.number.float({ min: 0, max: total })

	let cursor = 0
	for (const item of items) {
		cursor += item.weight
		if (target <= cursor) return item.value
	}

	return items[0]!.value
}

const createUser = (seed: number): UserSummary => {
	faker.seed(seed)

	return {
		id: seed,
		name: faker.person.fullName(),
	}
}

const createUsers = (count: number) => {
	return Array.from({ length: count }, (_, idx) => createUser(idx + 1))
}

const randomPastIso = (daysMax: number) => {
	const date = faker.date.recent({ days: daysMax })
	return date.toISOString()
}

const buildDetail = (id: number, users: UserSummary[]): MockImageQueueEntry => {
	faker.seed(id)

	const type = faker.helpers.arrayElement(TYPES)
	const status = pickWeighted<ImageQueueStatus>([
		{ value: "Pending", weight: 0.48 },
		{ value: "Approved", weight: 0.22 },
		{ value: "Rejected", weight: 0.18 },
		{ value: "Reverted", weight: 0.07 },
		{ value: "Cancelled", weight: 0.05 },
	])

	const createdBy = faker.helpers.arrayElement(users)
	const createdAt = randomPastIso(30)

	const uploadedBy = faker.helpers.arrayElement(users)
	const uploadedAt = randomPastIso(30)

	const imageId = faker.number.int({ min: 1, max: 5000 })
	const directory = `${faker.string.alpha({ length: 2 })}/${faker.string.alpha({ length: 2 })}`
	const filename = `${faker.string.hexadecimal({ length: 16, prefix: "" })}.jpg`

	const image =
		status === "Rejected"
			? null
			: {
					id: imageId,
					filename,
					directory,
					uploaded_at: uploadedAt,
					uploaded_by: uploadedBy,
				}

	const handledBy =
		status === "Approved" || status === "Rejected" || status === "Reverted"
			? faker.helpers.arrayElement(users)
			: null

	const handledAt = handledBy
		? faker.date
				.between({ from: new Date(createdAt), to: new Date() })
				.toISOString()
		: null

	const revertedBy =
		status === "Reverted" ? faker.helpers.arrayElement(users) : null
	const revertedAt =
		revertedBy && handledAt
			? faker.date
					.between({ from: new Date(handledAt), to: new Date() })
					.toISOString()
			: null

	const targetId = faker.number.int({ min: 1, max: 1500 })

	return {
		type,
		detail: {
			id,
			image_id: image ? image.id : null,
			status,
			created_at: createdAt,
			created_by: createdBy,
			handled_at: handledAt,
			handled_by: handledBy,
			reverted_at: revertedAt,
			reverted_by: revertedBy,
			image,
			artist:
				type === "artist"
					? {
							artist_id: targetId,
							type: "Profile",
						}
					: null,
			release:
				type === "release"
					? {
							release_id: targetId,
							type: "Cover",
						}
					: null,
		},
	}
}

export const createMockImageQueueEntries = (
	count: number,
	seed = 42,
): MockImageQueueEntry[] => {
	faker.seed(seed)

	const users = createUsers(8)

	return Array.from({ length: count }, (_, idx) =>
		buildDetail(idx + 1, users),
	).toSorted((a, b) => b.detail.id - a.detail.id)
}

export const MOCK_IMAGE_QUEUE_STATUSES = STATUSES
export const MOCK_IMAGE_QUEUE_TYPES = TYPES
