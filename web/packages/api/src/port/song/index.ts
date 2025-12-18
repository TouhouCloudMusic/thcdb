import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultMessage } from "../../shared"

export async function explore(options?: Opt<"explore_song">) {
	const res = await FetchClient.GET("/song/explore", {
		params: { query: options?.query },
	})

	return adaptApiResult(res)
}

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

export async function create(options: Opt<"create_song">) {
	const res = await FetchClient.POST("/song", {
		body: options.body,
	})

	return adaptApiResultMessage(res)
}

export async function update(options: Opt<"update_song">) {
	const res = await FetchClient.POST("/song/{id}", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResultMessage(res)
}
