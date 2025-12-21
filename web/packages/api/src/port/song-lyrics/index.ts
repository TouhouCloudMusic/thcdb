import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findOneSongLyrics(options: Opt<"find_one_song_lyrics">) {
	const res = await FetchClient.GET("/song-lyrics", {
		params: { query: options.query },
	})

	return adaptApiResultOptional(res)
}

export async function findManySongLyrics(
	options: Opt<"find_many_song_lyrics">,
) {
	const res = await FetchClient.GET("/song-lyrics/many", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
