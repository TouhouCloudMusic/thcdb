import createFetchClient from "openapi-fetch"

import type {
	SimpleArtist,
	SimpleEvent,
	SimpleLabel,
	SimpleRelease,
	SongRef,
	TagRef,
} from "../../gen"
import type { ErrResponse, OkResponse } from "../../shared"
import { adaptApiResult } from "../../shared"

type Paginated<T> = {
	items: T[]
	next_cursor: number | null
}

type SearchAllResponse = {
	artists: Paginated<SimpleArtist>
	releases: Paginated<SimpleRelease>
	songs: Paginated<SongRef>
	events: Paginated<SimpleEvent>
	labels: Paginated<SimpleLabel>
	tags: Paginated<TagRef>
}

type SearchAllQuery = {
	search_term: string
	limit?: number
}

type SearchSingleQuery = {
	search_term: string
	limit?: number
	cursor?: number
}

type SearchPaths = {
	"/search": {
		get: {
			parameters: { query: SearchAllQuery }
			responses: {
				200: { content: { "application/json": OkResponse<SearchAllResponse> } }
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/artist": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: {
					content: { "application/json": OkResponse<Paginated<SimpleArtist>> }
				}
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/release": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: {
					content: { "application/json": OkResponse<Paginated<SimpleRelease>> }
				}
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/song": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: { content: { "application/json": OkResponse<Paginated<SongRef>> } }
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/event": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: {
					content: { "application/json": OkResponse<Paginated<SimpleEvent>> }
				}
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/label": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: {
					content: { "application/json": OkResponse<Paginated<SimpleLabel>> }
				}
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
	"/search/tag": {
		get: {
			parameters: { query: SearchSingleQuery }
			responses: {
				200: { content: { "application/json": OkResponse<Paginated<TagRef>> } }
				400: { content: { "application/json": ErrResponse } }
				500: { content: { "application/json": ErrResponse } }
			}
		}
	}
}

const SearchFetchClient = createFetchClient<SearchPaths>({ baseUrl: "/api" })

export async function searchAll(query: SearchAllQuery) {
	const res = await SearchFetchClient.GET("/search", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchArtist(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/artist", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchRelease(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/release", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchSong(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/song", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchEvent(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/event", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchLabel(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/label", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchTag(query: SearchSingleQuery) {
	const res = await SearchFetchClient.GET("/search/tag", {
		params: { query },
	})

	return adaptApiResult(res)
}
