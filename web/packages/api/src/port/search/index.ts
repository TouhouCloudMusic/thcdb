import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult } from "../../shared"

type SearchAllQuery = Opt<"search_all">["query"]
type SearchSingleQuery = Opt<"search_artist">["query"]
type UserCollectionSearchQuery = Opt<"search_user_collections">["query"]

export async function searchAll(query: SearchAllQuery) {
	const res = await FetchClient.GET("/search", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchArtist(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/artist", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchRelease(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/release", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchSong(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/song", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchEvent(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/event", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchLabel(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/label", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchTag(query: SearchSingleQuery) {
	const res = await FetchClient.GET("/search/tag", {
		params: { query },
	})

	return adaptApiResult(res)
}

export async function searchUserCollections(query: UserCollectionSearchQuery) {
	const res = await FetchClient.GET("/collections/search", {
		params: { query },
	})

	return adaptApiResult(res)
}
