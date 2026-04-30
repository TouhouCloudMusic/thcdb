import { faker } from "@faker-js/faker"
import type { Release } from "@thc/api"

import { RELEASE_TYPES } from "~/domain/release/constants"

const RELEASE_COVER_URL = "/img/cover/release/1.png"

const ARTIST_NAMES = [
	"SOUND HOLIC",
	"IOSYS",
	"Alstroemeria Records",
	"Silver Forest",
	"COOL&CREATE",
]

const LABEL_NAMES = [
	"THCDB Records",
	"Touhou Label",
	"Doujin Sounds",
	"Indie Circle",
]

const EVENT_NAMES = ["Comiket", "Reitaisai", "M3", "Touhou Live"]

export const createMockRelease = (
	id: number,
	override?: Partial<Release>,
): Release => {
	faker.seed(id)

	const title = faker.music.album()
	const artistCount = faker.number.int({ min: 1, max: 2 })
	const artistNames = faker.helpers.arrayElements(ARTIST_NAMES, artistCount)
	const releaseType = faker.helpers.arrayElement(RELEASE_TYPES)
	const hasCover = faker.number.int({ min: 0, max: 3 }) !== 0

	const precision = faker.helpers.arrayElement([
		"Day",
		"Month",
		"Year",
	] as const)
	const dateValue = faker.date
		.between({ from: new Date(2000, 0, 1), to: new Date() })
		.toISOString()
		.slice(0, 10)

	const hasReleaseDate = faker.number.int({ min: 0, max: 4 }) !== 0
	const releaseDate = hasReleaseDate ? { precision, value: dateValue } : null

	const catalogCount = faker.number.int({ min: 0, max: 2 })
	const catalogNumbers = Array.from({ length: catalogCount }, (_, idx) => {
		const labelName = faker.helpers.arrayElement(LABEL_NAMES)
		const hasLabel = faker.number.int({ min: 0, max: 1 }) === 1

		return {
			catalog_number: `${labelName.slice(0, 3).toUpperCase()}-${id}-${idx + 1}`,
			label: hasLabel
				? {
						id: faker.number.int({ min: 1, max: 1000 }),
						name: labelName,
					}
				: null,
		}
	})

	const hasEvent = faker.number.int({ min: 0, max: 2 }) === 1
	const events = hasEvent
		? [
				{
					id: faker.number.int({ min: 1, max: 1000 }),
					name: faker.helpers.arrayElement(EVENT_NAMES),
				},
			]
		: undefined

	const hasLocalizedTitle = faker.number.int({ min: 0, max: 2 }) === 1
	const localizedTitles = hasLocalizedTitle
		? [
				{
					language: { id: 1, code: "ja", name: "Japanese" },
					title: `【JP】${title}`,
				},
			]
		: undefined

	return {
		id,
		title,
		release_type: releaseType,
		artists: artistNames.map((name) => ({
			id: faker.number.int({ min: 1, max: 1000 }),
			name,
		})),
		cover_art_url: hasCover ? RELEASE_COVER_URL : null,
		release_date: releaseDate,
		catalog_nums: catalogNumbers.length > 0 ? catalogNumbers : undefined,
		events,
		localized_titles: localizedTitles,
		...override,
	}
}

export const createMockReleases = (count: number, startId = 1): Release[] => {
	return Array.from({ length: count }, (_, i) => createMockRelease(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	release_type?: Release["release_type"][]
	sort_field?: "created_at" | "handled_at"
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedReleases = (
	params: ExploreParams,
): { items: Release[]; next_cursor: number | null } => {
	const { limit, cursor, release_type, sort_field, sort_direction } = params
	const MOCK_TOTAL = 100

	let allReleases = createMockReleases(MOCK_TOTAL, 1)

	if (release_type && release_type.length > 0) {
		allReleases = allReleases.filter((r) =>
			release_type.includes(r.release_type),
		)
	}

	if (sort_field) {
		allReleases.sort((a, b) => {
			const aValue = a.id
			const bValue = b.id
			return sort_direction === "desc" ? bValue - aValue : aValue - bValue
		})
	}

	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allReleases.length)
	const items = allReleases.slice(startIdx, endIdx)
	const nextCursor = endIdx < allReleases.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}
