import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApi, adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findSongById(options: Opt<"find_song_by_id">) {
	const res = await FetchClient.GET("/song/{id}", {
		params: { path: options.path },
	})

	return adaptApiResult(res)
}

export async function findSongByKeyword(options: Opt<"find_song_by_keyword">) {
	const res = await FetchClient.GET("/song", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
