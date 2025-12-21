import { faker } from "@faker-js/faker"
import type { Tag } from "@thc/api"

import { TAG_TYPES } from "~/domain/tag/constants"

const TAG_NAMES = [
	"Trance",
	"Rock",
	"Eurobeat",
	"House",
	"Piano",
	"Vocal",
	"Instrumental",
	"Remix",
	"Arrange",
	"Live",
]

export const createMockTag = (id: number, override?: Partial<Tag>): Tag => {
	faker.seed(id)
	const name = faker.helpers.arrayElement(TAG_NAMES)

	return {
		id,
		name,
		description: faker.lorem.paragraph(),
		short_description: faker.lorem.sentence(),
		type: TAG_TYPES[(id - 1) % TAG_TYPES.length] ?? "Genre",
		...override,
	}
}

export const createMockTags = (count: number, startId = 1): Tag[] => {
	return Array.from({ length: count }, (_, i) => createMockTag(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	tag_type?: Tag["type"][]
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedTags = (
	params: ExploreParams,
): { items: Tag[]; next_cursor: number | null } => {
	const { limit, cursor, tag_type, sort_direction } = params
	const MOCK_TOTAL = 200

	let allTags = createMockTags(MOCK_TOTAL, 1)

	if (tag_type && tag_type.length > 0) {
		allTags = allTags.filter((t) => tag_type.includes(t.type))
	}

	allTags.sort((a, b) => {
		const aValue = a.id
		const bValue = b.id
		return sort_direction === "desc" ? bValue - aValue : aValue - bValue
	})

	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allTags.length)
	const items = allTags.slice(startIdx, endIdx)
	const nextCursor = endIdx < allTags.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}

export type TagTreeNode = {
	id: number
	name: string
	type: Tag["type"]
	short_description: Tag["short_description"]
	children: TagTreeNode[]
}

type TagTreeParams = {
	rootCount: number
	maxDepth: number
	childCountRange: [number, number]
	startId?: number
}

export function createMockTagTree(params: TagTreeParams): TagTreeNode[] {
	let nextId = params.startId ?? 1
	let [minChild, maxChild] = params.childCountRange

	let buildNode = (depth: number): TagTreeNode => {
		let currentId = nextId
		nextId += 1
		let base = createMockTag(currentId)
		let childCount = 0

		if (depth < params.maxDepth) {
			let span = Math.max(0, maxChild - minChild)
			let offset = span > 0 ? currentId % (span + 1) : 0
			childCount = minChild + offset
		}

		let children =
			childCount > 0
				? Array.from({ length: childCount }, () => buildNode(depth + 1))
				: []

		return {
			id: base.id,
			name: base.name,
			type: base.type,
			short_description: base.short_description,
			children,
		}
	}

	return Array.from({ length: params.rootCount }, () => buildNode(0))
}
