import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findEventById(options: Opt<"find_event_by_id">) {
	const res = await FetchClient.GET("/event/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function findEventByKeyword(
	options: Opt<"find_event_by_keyword">,
) {
	const res = await FetchClient.GET("/event", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
