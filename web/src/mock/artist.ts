import { faker } from "@faker-js/faker"
import type { Artist } from "@thc/api"

import { ARTIST_TYPES } from "~/domain/artist/constants"

const LANG_JA = { id: 1, code: "ja", name: "Japanese" }
const LANG_EN = { id: 2, code: "en", name: "English" }

const ARTIST_NAMES = [
	"ZUN",
	"Alstroemeria Records",
	"IOSYS",
	"Demetori",
	"Halozy",
	"COOL&CREATE",
	"SOUND HOLIC",
	"Silver Forest",
	"Liz Triangle",
	"Yuuhei Satellite",
]

export const createMockArtist = (
	id: number,
	override?: Partial<Artist>,
): Artist => {
	faker.seed(id)

	const name = faker.helpers.arrayElement(ARTIST_NAMES)
	const artistType = ARTIST_TYPES[(id - 1) % ARTIST_TYPES.length] ?? "Unknown"

	const startDate = faker.date.between({
		from: new Date("1985-01-01"),
		to: new Date("2015-12-31"),
	})
	const startDateValue = startDate.toISOString().slice(0, 10)
	const shouldHaveEndDate = 0 === id % 6
	const endDate = shouldHaveEndDate
		? faker.date.between({ from: startDate, to: new Date("2025-12-31") })
		: undefined
	const endDateValue = endDate?.toISOString().slice(0, 10)

	const hasProfileImage = 0 === id % 4
	const profileImageUrl = hasProfileImage ? "/avatar.png" : undefined

	return {
		id,
		name,
		artist_type: artistType,
		start_date: { precision: "Day", value: startDateValue },
		end_date: endDateValue
			? { precision: "Day", value: endDateValue }
			: undefined,
		current_location: {
			country: faker.location.country(),
			province: faker.location.state(),
			city: faker.location.city(),
		},
		localized_names: [
			{ language: LANG_JA, name: faker.person.fullName() },
			{ language: LANG_EN, name: faker.person.fullName() },
		],
		profile_image_url: profileImageUrl,
		...override,
	}
}

export const createMockArtists = (count: number, startId = 1): Artist[] => {
	return Array.from({ length: count }, (_, i) => createMockArtist(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	artist_type?: Artist["artist_type"][]
	sort_field?: "created_at" | "handled_at"
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedArtists = (
	params: ExploreParams,
): { items: Artist[]; next_cursor: number | null } => {
	const { limit, cursor, artist_type, sort_field, sort_direction } = params
	const MOCK_TOTAL = 100

	let allArtists = createMockArtists(MOCK_TOTAL, 1)

	if (artist_type && 0 < artist_type.length) {
		allArtists = allArtists.filter((a) => artist_type.includes(a.artist_type))
	}

	if (sort_field) {
		allArtists.sort((a, b) => {
			const aValue = a.id
			const bValue = b.id
			return "desc" === sort_direction ? bValue - aValue : aValue - bValue
		})
	}

	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allArtists.length)
	const items = allArtists.slice(startIdx, endIdx)
	const nextCursor = endIdx < allArtists.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}
