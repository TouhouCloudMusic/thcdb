import { SetStoreFunction } from "solid-js/store"
import { createProvider } from "~/util/createProvider"

export interface AltVer {
	title: string
	album: string
	albumArtist: string
	type: ALT_VER_TYPES
}

export enum ALT_VER_TYPES {
	"remixed",
	"remastered",
	"re-recorded",
	"common",
}

export interface SongCredit {
	name: string
	role: string[]
}

export interface SongReview {
	author: string
	date: string
	content: string
	rating: number
}

export interface SongData {
	title: string
	artist: string
	duration: string
	originalSong: string[]
	ratings: {
		value: number
		count: number
	}
	rank: {
		thisYear: number
		overAll: number
	}
	genres: string[]
	descriptors: string[]
	altVers: AltVer[]
	credits: SongCredit[]
	reviews: SongReview[]
}

export type SongController = ReturnType<typeof createSongController>

function createSongController(
	state: SongData,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setState: SetStoreFunction<SongData>
) {
	const songController = {
		title: () => state.title,
		artist: () => state.artist,
		duration: () => state.duration,
		originalSong: () => state.originalSong,
		ratings: {
			value: () => state.ratings.value,
			count: () => state.ratings.count,
		},
		rank: {
			thisYear: () => state.rank.thisYear,
			overAll: () => state.rank.overAll,
		},
		genres: () => state.genres,
		descriptors: () => state.descriptors,
		altVers: () => state.altVers,
		credits: () => state.credits,
		reviews: () => state.reviews,
	}
	return songController
}

export const [SongDataProvider, useSongData] =
	createProvider(createSongController)
