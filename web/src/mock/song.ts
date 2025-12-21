import { faker } from "@faker-js/faker"
import type { Song } from "@thc/api"

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

const LANG_JA = { id: 1, code: "ja", name: "Japanese" } as const
const LANG_EN = { id: 2, code: "en", name: "English" } as const

const createMockArtists = (seed: number) => {
	faker.seed(seed)
	const count = faker.number.int({ min: 1, max: 3 })
	const artists = faker.helpers
		.arrayElements(ARTIST_NAMES, count)
		.map((name) => ({
			id: faker.number.int({ min: 1, max: 1000 }),
			name,
		}))
	return artists
}

export const createMockSong = (id: number, override?: Partial<Song>): Song => {
	faker.seed(id)

	const jaTitle = faker.music.songName()
	const enTitle = faker.music.songName()

	let languages: Song["languages"] = [LANG_JA]
	if (id % 3 === 0) {
		languages = [LANG_JA, LANG_EN]
	} else if (id % 3 === 2) {
		languages = [LANG_EN]
	}

	const localizedTitles = languages?.map((lang) => ({
		language: lang,
		title: lang.code === "ja" ? jaTitle : enTitle,
	}))

	const title = languages?.some((lang) => lang.code === "ja")
		? jaTitle
		: enTitle

	return {
		id,
		title,
		localized_titles: localizedTitles,
		artists: createMockArtists(id),
		releases: [],
		credits: [],
		languages,
		lyrics: [],
		...override,
	}
}

export const createMockSongs = (count: number, startId = 1): Song[] => {
	return Array.from({ length: count }, (_, i) => createMockSong(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	language_id?: number[]
	sort_field?: "created_at" | "handled_at"
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedSongs = (
	params: ExploreParams,
): { items: Song[]; next_cursor: number | null } => {
	const { limit, cursor, language_id, sort_field, sort_direction } = params
	const MOCK_TOTAL = 100

	// Generate all songs first (with consistent seed)
	let allSongs = createMockSongs(MOCK_TOTAL, 1)

	if (language_id && language_id.length > 0) {
		allSongs = allSongs.filter((song) =>
			song.languages?.some((lang) => language_id.includes(lang.id)),
		)
	}

	// Sort if needed
	if (sort_field) {
		allSongs.sort((a, b) => {
			// Use id as proxy for created_at/handled_at since mock data doesn't have dates
			const aValue = a.id
			const bValue = b.id
			return sort_direction === "desc" ? bValue - aValue : aValue - bValue
		})
	}

	// Paginate
	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allSongs.length)
	const items = allSongs.slice(startIdx, endIdx)
	const nextCursor = endIdx < allSongs.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}
